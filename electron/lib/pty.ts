import { BrowserWindow, ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { ISession } from './sesstion.js'
import { SshSession } from '../services/SshSession.js'
import { LocalSession } from '../services/LocalSession.js'
import { SftpService } from '../services/SftpService.js'
import { MonitoringService } from '../services/MonitoringService.js'

export class PtyManager {
  private sessions: Map<string, ISession> = new Map()
  private sftpService!: SftpService
  private monitoringService!: MonitoringService

  init(sftpService: SftpService, monitoringService: MonitoringService) {
    this.sftpService = sftpService
    this.monitoringService = monitoringService

    // Create a new session (SSH or Local)
    ipcMain.handle('session:create', async (event, options) => {
      const id = randomUUID()
      let session: ISession

      if (options.type === 'ssh') {
        session = new SshSession(id, options, this.sftpService, this.monitoringService)
      } else {
        session = new LocalSession(id, options)
      }

      session.on('data', (data: string) => {
        const windows = BrowserWindow.getAllWindows()
        windows.forEach(win => {
          win.webContents.send(`session:data:${id}`, data)
        })
      })

      session.on('exit', ({ exitCode, signal }) => {
        const windows = BrowserWindow.getAllWindows()
        windows.forEach(win => {
          win.webContents.send(`session:exit:${id}`, { exitCode, signal })
        })

        // Cleanup services when session exits
        if (options.type === 'ssh') {
          this.sftpService.unregisterSshClient(id)
          this.monitoringService.unregisterSshClient(id)
        }

        this.sessions.delete(id)
      })

      this.sessions.set(id, session)
      return id
    })

    // Write data to a session
    ipcMain.on('session:write', (event, id, data) => {
      const session = this.sessions.get(id)
      if (session) {
        session.write(data)
      }
    })

    // Resize a session
    ipcMain.on('session:resize', (event, id, cols, rows) => {
      const session = this.sessions.get(id)
      if (session) {
        session.resize(cols, rows)
      }
    })

    // Kill a session
    ipcMain.on('session:kill', (event, id) => {
      const session = this.sessions.get(id)
      if (session) {
        session.kill()
      }
    })

    // Acknowledge data received (for flow control in LocalSession)
    ipcMain.on('session:ack-data', (event, id, length) => {
      const session = this.sessions.get(id)
      if (session && session instanceof LocalSession) {
        session.ackData(length)
      }
    })

    // Backward compatibility for terminal:* channels used in some frontend components
    ipcMain.on('terminal:write', (event, id, data) => {
      this.sessions.get(id)?.write(data)
    })

    ipcMain.on('terminal:resize', (event, id, cols, rows) => {
      this.sessions.get(id)?.resize(cols, rows)
    })
  }
}
