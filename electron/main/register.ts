import { dialog, ipcMain } from 'electron'
import { updaterService } from './updater.js'

export class Register {
  static init() {
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
  }
}
