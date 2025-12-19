import { enable as enableRemote } from '@electron/remote/main'
import { app, BrowserWindow, BrowserWindowConstructorOptions, ipcMain, shell } from 'electron'
import path from 'path'
import { MonitoringService } from '../services/MonitoringService'
import { SftpService } from '../services/SftpService'
import { PtyManager } from './pty'
import { StoreService } from '../services/StoreService'

export class Window {
  ready: Promise<void>
  browserWindow: BrowserWindow

  private ptyManager: PtyManager = new PtyManager()
  private sftpService: SftpService
  private monitoringService: MonitoringService
  private storeService: StoreService = new StoreService()

  constructor() {
    this.sftpService = new SftpService()
    this.monitoringService = new MonitoringService()
    this.ptyManager.init(this.sftpService, this.monitoringService)

    const windowOptions: BrowserWindowConstructorOptions = {
      width: 1200,
      height: 800,
      show: false, // Wait for ready-to-show
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      title: 'S-Term',
      minWidth: 800,
      minHeight: 600,
    }

    this.browserWindow = new BrowserWindow(windowOptions)

    // Open external links in default browser
    this.browserWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:') || url.startsWith('http:')) {
        shell.openExternal(url)
        return { action: 'deny' }
      }
      return { action: 'allow' }
    })

    const port = process.env.VITE_PORT || 5173
    const devUrl = `http://localhost:${port}`

    if (process.env.ELECTRON_START_URL) {
      console.info('Loading development URL:', devUrl)
      this.browserWindow.loadURL(process.env.ELECTRON_START_URL || devUrl)
      this.browserWindow.webContents.openDevTools()
    } else {
      // Production: use app.getAppPath() to reliably find dist
      const indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
      console.info('Loading production file:', indexPath)

      this.browserWindow
        .loadFile(indexPath)
        .then(() => {
          console.info('File loaded successfully')
        })
        .catch(err => {
          console.error('Failed to load file:', err)
        })
    }

    this.browserWindow.once('ready-to-show', () => {
      this.browserWindow.show()
      this.focus()
    })

    enableRemote(this.browserWindow.webContents)

    this.ready = new Promise(resolve => {
      const listener = (event: any) => {
        if (event.sender === this.webContents) {
          ipcMain.removeListener('app:ready', listener as any)
          resolve()
        }
      }
      ipcMain.on('app:ready', listener)
    })
  }

  public get webContents() {
    return this.browserWindow.webContents
  }

  public focus(): void {
    this.browserWindow.focus()
  }
}
