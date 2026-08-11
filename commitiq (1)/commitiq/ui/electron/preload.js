const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getRepoInfo: () => ipcRenderer.invoke('git:get-repo-info'),
  getCommits: (branch) => ipcRenderer.invoke('git:get-commits', branch),
  getCommitDiff: (sha) => ipcRenderer.invoke('git:get-commit-diff', sha),
  selectRepo: () => ipcRenderer.invoke('git:select-repo'),
  openPath: (folderPath) => ipcRenderer.invoke('git:open-path', folderPath),
  initRepo: () => ipcRenderer.invoke('git:init-repo'),
  commitIQ: (message) => ipcRenderer.invoke('git:commitiq-commit', message),
  notesEnable: () => ipcRenderer.invoke('git:notes-enable'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
});
