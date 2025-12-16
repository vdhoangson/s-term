import { app, dialog, ipcMain, Menu } from 'electron'
import { MonitoringService } from './services/MonitoringService.js'
import { PtyService } from './services/PtyService.js'
import { SftpService } from './services/SftpService.js'
import { StoreService } from './services/StoreService.js'
import { updaterService } from './updater.js'
import { createAppMenu } from './menu.js'
import { Window } from '../lib/window.js'
import '../lib/sentry'

let mainWindow: Window | null = null

// Services will be initialized after app is ready
let sftpService: SftpService
let monitoringService: MonitoringService
let ptyService: PtyService
let storeService: StoreService

function createWindow() {
  mainWindow = new Window()

  mainWindow.window.on('closed', () => {
    mainWindow = null
  })
}

// ------------------------------
// App Events
// ------------------------------
app.whenReady().then(() => {
  // Initialize services after app is ready
  sftpService = new SftpService()
  monitoringService = new MonitoringService()
  ptyService = new PtyService(sftpService, monitoringService)
  storeService = new StoreService()

  createWindow()

  // Create application menu
  if (mainWindow) {
    createAppMenu(mainWindow.window)
  }

  // Initialize updater after window is created
  if (mainWindow) {
    updaterService.setMainWindow(mainWindow.window)
    // Check for updates 3 seconds after app start (in production only)
    if (!process.env.ELECTRON_START_URL) {
      setTimeout(async () => {
        // Check if auto-updates are enabled in settings
        const settings = storeService['getSettings']()
        if (settings?.checkForUpdates !== false) {
          updaterService.checkForUpdates()
        }
      }, 3000)
    }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!mainWindow) createWindow()
})

// ------------------------------
// IPC: Dialog Helpers
// ------------------------------
ipcMain.handle('dialog:openDirectory', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return r.canceled ? null : r.filePaths[0]
})

ipcMain.handle('dialog:openFile', async (_, options) => {
  const res = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
  })

  if (res.canceled || res.filePaths.length === 0) {
    return { canceled: true }
  }

  return {
    canceled: false,
    filePath: res.filePaths[0],
  }
})

// ------------------------------
// IPC: Auto-Update
// ------------------------------
ipcMain.handle('updater:check-for-updates', async () => {
  await updaterService.checkForUpdates()
})

ipcMain.handle('updater:download-update', async () => {
  await updaterService.downloadUpdate()
})

ipcMain.handle('updater:quit-and-install', () => {
  updaterService.quitAndInstall()
})
