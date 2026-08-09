import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { IpcChannels, type OpenRepoResult, type RepoInfo } from '../shared/ipc'

const execFileAsync = promisify(execFile)

/** Opens the native folder picker and validates the selection is a git work tree. */
async function openRepoDialog(): Promise<OpenRepoResult> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const options: Electron.OpenDialogOptions = {
    title: 'Open a git repository',
    buttonLabel: 'Open repository',
    properties: ['openDirectory']
  }

  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled || result.filePaths.length === 0) {
    return { status: 'cancelled' }
  }

  const dir = result.filePaths[0]

  // Validate that the picked directory lives inside a git work tree.
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
      cwd: dir
    })
    const root = stdout.trim()
    if (!root) {
      return { status: 'invalid', message: `"${dir}" is not a git repository.` }
    }
    const name = root.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? dir
    const repo: RepoInfo = { path: dir, root, name }
    return { status: 'opened', repo }
  } catch {
    return {
      status: 'invalid',
      message: `"${dir}" is not a git repository (git rev-parse failed).`
    }
  }
}

/** Registers all IPC handlers. Called once from main.ts after app is ready. */
export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.AppGetVersion, () => app.getVersion())
  ipcMain.handle(IpcChannels.AppGetPlatform, () => process.platform)
  ipcMain.handle(IpcChannels.RepoOpen, () => openRepoDialog())
}
