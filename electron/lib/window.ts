import { app, BrowserWindow, BrowserWindowConstructorOptions, shell } from 'electron'
import path from 'path'
import { enable as enableRemote } from '@electron/remote/main'

export class Window {
  public window: BrowserWindow

  constructor() {
    const windowOptions: BrowserWindowConstructorOptions = {
      width: 1200,
      height: 800,
      show: false, // Wait for ready-to-show
      webPreferences: {
        preload: path.join(__dirname, '../preload/sentry.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      title: 'S-Term',
      minWidth: 800,
      minHeight: 600,
    }

    this.window = new BrowserWindow(windowOptions)

    // Open external links in default browser
    this.window.webContents.setWindowOpenHandler(({ url }) => {
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
      this.window.loadURL(process.env.ELECTRON_START_URL || devUrl)
      this.window.webContents.openDevTools()
    } else {
      // Production: use app.getAppPath() to reliably find dist
      const indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
      console.info('Loading production file:', indexPath)

      this.window
        .loadFile(indexPath)
        .then(() => {
          console.info('File loaded successfully')
        })
        .catch(err => {
          console.error('Failed to load file:', err)
        })
    }

    this.window.once('ready-to-show', () => {
      console.info('Window ready to show')
      this.window.show()
    })

    enableRemote(this.window.webContents)
  }

  public get webContents() {
    return this.window.webContents
  }

  public focus(): void {
    this.window.focus()
  }
}
