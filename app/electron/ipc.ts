import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { IpcChannels, type OpenRepoResult, type RepoInfo } from '../shared/ipc'
import { loadGraph, type LoadGraphOptions } from './git/graph'
import { getNote, listNotes } from './git/notes'
import { validateGitDir } from './git/repo'

/** Session-scoped note cache: repoRoot → (commitSha → content). */
const noteCache = new Map<string, Map<string, string>>()

/** Guards IPC arguments: reject anything that is not a non-empty string. */
function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid IPC argument: ${name} must be a non-empty string`)
  }
  return value
}

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
  const validation = await validateGitDir(dir)
  if (!validation) {
    return { status: 'invalid', message: `"${dir}" is not a git repository.` }
  }

  const repo: RepoInfo = { path: dir, root: validation.root, name: validation.name }
  // A fresh repo → drop any cached notes from a previous session.
  noteCache.clear()
  return { status: 'opened', repo }
}

/** Loads the commit graph for a repo root, surfacing git errors as readable messages. */
async function loadGraphFor(root: string, options: LoadGraphOptions): Promise<ReturnType<typeof loadGraph>> {
  try {
    return await loadGraph(root, options)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to load commit graph: ${message}`)
  }
}

/** Reads a note for a commit, caching per repo so scrolling the graph stays cheap. */
async function noteFor(root: string, commitSha: string): Promise<string | null> {
  let repoCache = noteCache.get(root)
  if (!repoCache) {
    repoCache = new Map()
    noteCache.set(root, repoCache)
  }
  if (repoCache.has(commitSha)) return repoCache.get(commitSha) ?? null

  const content = await getNote(root, commitSha)
  repoCache.set(commitSha, content ?? '')
  return content
}

/** Registers all IPC handlers. Called once from main.ts after app is ready. */
export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.AppGetVersion, () => app.getVersion())
  ipcMain.handle(IpcChannels.AppGetPlatform, () => process.platform)
  ipcMain.handle(IpcChannels.RepoOpen, () => openRepoDialog())
  ipcMain.handle(IpcChannels.GraphLoad, (_event, root: unknown, options?: LoadGraphOptions) =>
    loadGraphFor(requireString(root, 'root'), options ?? {})
  )
  ipcMain.handle(IpcChannels.NotesList, (_event, root: unknown) =>
    listNotes(requireString(root, 'root'))
  )
  ipcMain.handle(IpcChannels.NotesGet, (_event, root: unknown, commitSha: unknown) =>
    noteFor(requireString(root, 'root'), requireString(commitSha, 'commitSha'))
  )
}
