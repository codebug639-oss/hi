const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { exec, execSync } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let currentRepoPath = process.cwd();

// Parse command line arguments for --repo=<path> or positional repo path
function parseArgs() {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith('--repo=')) {
      currentRepoPath = arg.substring(7);
    } else if (!arg.startsWith('-') && fs.existsSync(arg) && fs.statSync(arg).isDirectory()) {
      currentRepoPath = arg;
    }
  }

  // Ensure currentRepoPath is inside a git worktree if possible
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd: currentRepoPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (gitRoot) {
      currentRepoPath = gitRoot;
    }
  } catch (e) {
    // Keep currentRepoPath as is
  }
}

function createWindow() {
  parseArgs();

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 850,
    minHeight: 550,
    title: 'CommitIQ — Connected Commit Note Graph',
    backgroundColor: '#0a0d14',
    frame: false,
    titleBarStyle: 'hidden',
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;

  if (isDev || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Helper for executing shell commands safely inside target repo
function runGitCmd(command, cwd = currentRepoPath) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, stdout, stderr, error: error.message });
      } else {
        resolve({ success: true, stdout, stderr });
      }
    });
  });
}

// IPC Handlers
ipcMain.handle('git:get-repo-info', async () => {
  const isGit = await runGitCmd('git rev-parse --is-inside-work-tree');
  if (!isGit.success || isGit.stdout.trim() !== 'true') {
    return { isGitRepo: false, path: currentRepoPath };
  }

  const rootRes = await runGitCmd('git rev-parse --show-toplevel');
  const repoRoot = rootRes.success ? rootRes.stdout.trim() : currentRepoPath;
  const repoName = path.basename(repoRoot);

  const branchRes = await runGitCmd('git rev-parse --abbrev-ref HEAD');
  const currentBranch = branchRes.success ? branchRes.stdout.trim() : 'HEAD';

  const branchesRes = await runGitCmd('git branch --format="%(refname:short)"');
  const branches = branchesRes.success
    ? branchesRes.stdout.split('\n').map(b => b.trim()).filter(Boolean)
    : [];

  const notesRes = await runGitCmd('git notes list');
  const notesCount = notesRes.success ? notesRes.stdout.split('\n').filter(Boolean).length : 0;

  const countRes = await runGitCmd('git rev-list --count HEAD');
  const totalCommits = countRes.success ? parseInt(countRes.stdout.trim(), 10) || 0 : 0;

  return {
    isGitRepo: true,
    path: repoRoot,
    name: repoName,
    currentBranch,
    branches,
    notesCount,
    totalCommits,
  };
});

ipcMain.handle('git:get-commits', async (event, branchFilter) => {
  // We fetch git log formatted with delimiters:
  // %H|%h|%P|%an|%ae|%ad|%ar|%s|%d
  const delimiter = '||COMMITIQ_FIELD||';
  const recordDelimiter = '||COMMITIQ_RECORD||';
  const formatStr = `%H${delimiter}%h${delimiter}%P${delimiter}%an${delimiter}%ae${delimiter}%ad${delimiter}%ar${delimiter}%s${delimiter}%d${recordDelimiter}`;

  const branchArg = branchFilter && branchFilter !== 'ALL' ? `"${branchFilter}"` : '--all';
  const cmd = `git log ${branchArg} --date=iso-strict --format="${formatStr}" -n 200`;

  const logRes = await runGitCmd(cmd);
  if (!logRes.success) {
    return [];
  }

  const rawRecords = logRes.stdout.split(recordDelimiter).filter(r => r.trim().length > 0);
  const commits = [];

  for (const rec of rawRecords) {
    const fields = rec.trim().split(delimiter);
    if (fields.length < 8) continue;

    const [sha, shortSha, parentsRaw, authorName, authorEmail, date, relDate, subject, refsRaw] = fields;
    const parents = parentsRaw ? parentsRaw.split(' ').filter(Boolean) : [];

    // Parse git notes for this commit
    let noteData = null;
    const noteRes = await runGitCmd(`git notes show "${sha}"`);
    if (noteRes.success && noteRes.stdout.trim()) {
      const rawNote = noteRes.stdout.trim();
      try {
        noteData = JSON.parse(rawNote);
      } catch (e) {
        noteData = { rawText: rawNote, isPlaceholder: true };
      }
    }

    commits.push({
      sha,
      shortSha,
      parents,
      authorName,
      authorEmail,
      date,
      relDate,
      subject,
      refs: refsRaw ? refsRaw.trim() : '',
      note: noteData,
    });
  }

  return commits;
});

ipcMain.handle('git:get-commit-diff', async (event, sha) => {
  if (!sha) return '';
  const diffRes = await runGitCmd(`git show --patch --stat "${sha}"`);
  return diffRes.success ? diffRes.stdout : 'Failed to fetch diff';
});

ipcMain.handle('git:open-path', async (event, folderPath) => {
  if (!fs.existsSync(folderPath)) return { success: false, error: 'Path does not exist' };
  const stat = fs.statSync(folderPath);
  const targetDir = stat.isDirectory() ? folderPath : path.dirname(folderPath);

  const isGit = await runGitCmd('git rev-parse --is-inside-work-tree', targetDir);
  if (isGit.success && isGit.stdout.trim() === 'true') {
    const rootRes = await runGitCmd('git rev-parse --show-toplevel', targetDir);
    currentRepoPath = rootRes.success ? rootRes.stdout.trim() : targetDir;
    return { success: true, path: currentRepoPath, isGit: true };
  } else {
    currentRepoPath = targetDir;
    return { success: true, path: currentRepoPath, isGit: false };
  }
});

ipcMain.handle('git:init-repo', async () => {
  const initRes = await runGitCmd('git init');
  if (!initRes.success) return initRes;
  const enableRes = await runGitCmd('git commitiq notes-enable');
  return { success: true, stdout: `${initRes.stdout}\n${enableRes.stdout}` };
});

ipcMain.handle('git:select-repo', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Folder or Git Repository',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    const isGit = await runGitCmd('git rev-parse --is-inside-work-tree', selectedPath);
    if (isGit.success && isGit.stdout.trim() === 'true') {
      const rootRes = await runGitCmd('git rev-parse --show-toplevel', selectedPath);
      currentRepoPath = rootRes.success ? rootRes.stdout.trim() : selectedPath;
      return { success: true, path: currentRepoPath, isGit: true };
    } else {
      currentRepoPath = selectedPath;
      return { success: true, path: currentRepoPath, isGit: false };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle('git:commitiq-commit', async (event, message) => {
  if (!message) return { success: false, error: 'Commit message is required' };
  
  // Find local git-commitiq binary if present, or fallback to git commitiq
  let commitiqCmd = 'git commitiq';
  const res = await runGitCmd(`${commitiqCmd} commit -m "${message.replace(/"/g, '\\"')}"`);
  return res;
});

ipcMain.handle('git:notes-enable', async () => {
  const res = await runGitCmd('git commitiq notes-enable');
  return res;
});

ipcMain.handle('app:open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});
