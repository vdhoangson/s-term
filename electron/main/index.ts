import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import path from 'path'
import { MonitoringService } from './services/MonitoringService.js'
import { PtyService } from './services/PtyService.js'
import { SftpService } from './services/SftpService.js'
import { StoreService } from './services/StoreService.js'
import { updaterService } from './updater.js'
import { createAppMenu } from './menu.js'

let mainWindow: BrowserWindow | null = null

// Services will be initialized after app is ready
let sftpService: SftpService
let monitoringService: MonitoringService
let ptyService: PtyService
let storeService: StoreService

// Disable GPU acceleration to fix SIGSEGV on Linux
// app.disableHardwareAcceleration()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Wait for ready-to-show
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      require('electron').shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  const port = process.env.VITE_PORT || 5173
  const devUrl = `http://localhost:${port}`
  
  if (process.env.ELECTRON_START_URL) {
    console.info('Loading development URL:', devUrl)
    mainWindow.loadURL(process.env.ELECTRON_START_URL || devUrl)
    mainWindow.webContents.openDevTools();
  } else {
    // Production: use app.getAppPath() to reliably find dist
    const indexPath = path.join(app.getAppPath(), "dist", "index.html");
    console.info('Loading production file:', indexPath)
    
    mainWindow.loadFile(indexPath).then(() => {
      console.info('File loaded successfully')
    }).catch(err => {
      console.error('Failed to load file:', err)
    })
  }

  mainWindow.once('ready-to-show', () => {
    console.info('Window ready to show')
    mainWindow?.show()
  })
  
  mainWindow.on('closed', () => {
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
    createAppMenu(mainWindow)
  }
  
  // Initialize updater after window is created
  if (mainWindow) {
    updaterService.setMainWindow(mainWindow)
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
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (!mainWindow) createWindow();
});

// ------------------------------
// IPC: Dialog Helpers
// ------------------------------
ipcMain.handle("dialog:openDirectory", async () => {
  const r = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle("dialog:openFile", async (_, options) => {
  const res = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: options?.filters || [{ name: "All Files", extensions: ["*"] }],
  });

  if (res.canceled || res.filePaths.length === 0) {
    return { canceled: true };
  }

  return {
    canceled: false,
    filePath: res.filePaths[0],
  };
});

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
