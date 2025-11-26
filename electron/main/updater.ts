import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import { BrowserWindow } from 'electron'

// Configure logger
log.transports.file.level = 'info'
autoUpdater.logger = log

class UpdaterService {
  private mainWindow: BrowserWindow | null = null

  constructor() {
    // Configure auto-updater
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    this.setupEventListeners()
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private setupEventListeners() {
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for update...')
      this.sendToRenderer('update-checking')
    })

    autoUpdater.on('update-available', info => {
      log.info('Update available:', info)
      this.sendToRenderer('update-available', info)
    })

    autoUpdater.on('update-not-available', info => {
      log.info('Update not available:', info)
      this.sendToRenderer('update-not-available', info)
    })

    autoUpdater.on('error', err => {
      log.error('Error in auto-updater:', err)
      this.sendToRenderer('update-error', err.message)
    })

    autoUpdater.on('download-progress', progressObj => {
      log.info('Download progress:', progressObj)
      this.sendToRenderer('update-download-progress', progressObj)
    })

    autoUpdater.on('update-downloaded', info => {
      log.info('Update downloaded:', info)
      this.sendToRenderer('update-downloaded', info)
    })
  }

  private sendToRenderer(channel: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  async checkForUpdates() {
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      log.error('Failed to check for updates:', error)
    }
  }

  async downloadUpdate() {
    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      log.error('Failed to download update:', error)
    }
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall(false, true)
  }
}

export const updaterService = new UpdaterService()
