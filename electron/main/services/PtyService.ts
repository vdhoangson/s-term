import pty from 'node-pty'
import { ipcMain, BrowserWindow } from 'electron'
import os from 'os'
import { EventEmitter } from 'events'
import { Session, SshSession } from './SshSession.js'

class LocalSession extends EventEmitter implements Session {
  public id: string
  private ptyProcess: pty.IPty

  constructor(id: string, options: { cols: number; rows: number; cwd?: string }) {
    super()
    this.id = id
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'

    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: options.cwd || process.env.HOME,
      env: process.env as any,
    })

    this.ptyProcess.onData(data => {
      this.emit('data', data)
    })

    this.ptyProcess.onExit(({ exitCode, signal }) => {
      this.emit('exit', { exitCode, signal })
    })
  }

  write(data: string): void {
    this.ptyProcess.write(data)
  }

  resize(cols: number, rows: number): void {
    this.ptyProcess.resize(cols, rows)
  }

  kill(): void {
    this.ptyProcess.kill()
  }
}

export class PtyService {
  private sessions: Map<string, Session> = new Map()
  private sftpService: any
  private monitoringService: any

  constructor(sftpService?: any, monitoringService?: any) {
    this.sftpService = sftpService
    this.monitoringService = monitoringService
    this.registerListeners()
  }

  private registerListeners() {
    ipcMain.handle('terminal:create', (event, options) => {
      return this.createSession(options)
    })

    ipcMain.on('terminal:write', (event, id, data) => {
      this.write(id, data)
    })

    ipcMain.on('terminal:resize', (event, id, cols, rows) => {
      this.resize(id, cols, rows)
    })

    ipcMain.on('terminal:kill', (event, id) => {
      this.kill(id)
    })
  }

  private createSession(options: any) {
    const id = Math.random().toString(36).substring(7)
    let session: Session

    if (options.type === 'ssh') {
      session = new SshSession(id, options, this.sftpService, this.monitoringService)
    } else {
      session = new LocalSession(id, options)
    }

    session.on('data', data => {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach(win => {
        win.webContents.send(`terminal:data:${id}`, data)
      })
    })

    session.on('exit', ({ exitCode, signal }) => {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach(win => {
        win.webContents.send(`terminal:exit:${id}`, { exitCode, signal })
      })

      // Cleanup services when session exits
      if (options.type === 'ssh') {
        if (this.sftpService) {
          this.sftpService.unregisterSshClient(id)
        }
        if (this.monitoringService) {
          this.monitoringService.unregisterSshClient(id)
        }
      }

      this.sessions.delete(id)
    })

    this.sessions.set(id, session)
    return id
  }

  private write(id: string, data: string) {
    const session = this.sessions.get(id)
    if (session) {
      session.write(data)
    }
  }

  private resize(id: string, cols: number, rows: number) {
    const session = this.sessions.get(id)
    if (session) {
      session.resize(cols, rows)
    }
  }

  private kill(id: string) {
    const session = this.sessions.get(id)
    if (session) {
      session.kill()
    }
  }
}
