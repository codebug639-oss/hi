import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels, type Api } from '../shared/ipc'

// Minimal, typed bridge. The renderer never touches Node or Electron
// directly — it only sees this surface (contextIsolation is on).
const api: Api = {
  getAppVersion: () => ipcRenderer.invoke(IpcChannels.AppGetVersion),
  getPlatform: () => ipcRenderer.invoke(IpcChannels.AppGetPlatform),
  openRepo: () => ipcRenderer.invoke(IpcChannels.RepoOpen)
}

contextBridge.exposeInMainWorld('api', api)
