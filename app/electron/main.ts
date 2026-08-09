import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { registerIpcHandlers } from './ipc'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'commitiq',
    autoHideMenuBar: true,
    backgroundColor: '#0b0e14',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win.show())

  // Dev: load from the electron-vite dev server (HMR).
  // Prod: load the built renderer bundle.
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devUrl) {
    void win.loadURL(devUrl)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    // macOS: re-create the window when the dock icon is clicked.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // macOS apps stay alive until Cmd+Q; everywhere else quit with the window.
  if (process.platform !== 'darwin') app.quit()
})

// Headless smoke test: `electron . --smoke` boots the app and exits cleanly.
// Used by CI / local validation to prove the shell starts without errors.
if (process.argv.includes('--smoke')) {
  app.whenReady().then(() => {
    console.log('[commitiq-ui] smoke test: app booted successfully')
    setTimeout(() => app.quit(), 250)
  })
}
