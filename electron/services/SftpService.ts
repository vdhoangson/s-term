import { ipcMain, dialog, WebContents } from 'electron'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import os from 'os'

const MAX_EDIT_SIZE = 5 * 1024 * 1024

export class SftpService {
  private sftpConnections: Map<string, any> = new Map()
  private sshClients: Map<string, any> = new Map()

  constructor() {
    this.registerListeners()
  }

  // Called by SshSession to register its client
  public registerSshClient(sessionId: string, client: any) {
    this.sshClients.set(sessionId, client)
  }

  // Called when SSH session closes
  public unregisterSshClient(sessionId: string) {
    this.closeSftp(sessionId)
    this.sshClients.delete(sessionId)
  }

  private registerListeners() {
    ipcMain.handle('sftp:list', async (event, sessionId, remotePath) => {
      return this.listFiles(sessionId, remotePath)
    })

    ipcMain.handle('sftp:readFile', async (event, sessionId, remotePath) => {
      return this.readFile(sessionId, remotePath)
    })

    ipcMain.handle('sftp:writeFile', async (event, sessionId, remotePath, content) => {
      return this.writeFile(sessionId, remotePath, content)
    })

    ipcMain.handle('sftp:download', async (event, sessionId, remotePath) => {
      return this.downloadFile(event.sender, sessionId, remotePath)
    })

    ipcMain.handle('sftp:mkdir', async (event, sessionId, remotePath) => {
      return this.createDirectory(sessionId, remotePath)
    })

    ipcMain.handle('sftp:delete', async (event, sessionId, remotePath) => {
      return this.deleteFile(sessionId, remotePath)
    })

    ipcMain.handle('sftp:rename', async (event, sessionId, oldPath, newPath) => {
      return this.renameFile(sessionId, oldPath, newPath)
    })

    ipcMain.handle('sftp:upload', async (event, sessionId, localPath, remotePath) => {
      return this.uploadFile(event.sender, sessionId, localPath, remotePath)
    })
  }

  private async ensureSftpConnected(sessionId: string, retries = 5): Promise<any> {
    if (this.sftpConnections.has(sessionId)) {
      return this.sftpConnections.get(sessionId)
    }

    // Retry logic for SSH client availability
    let client = this.sshClients.get(sessionId)
    let attempt = 0

    while (!client && attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, 200)) // Wait 200ms
      client = this.sshClients.get(sessionId)
      attempt++
    }

    if (!client) {
      throw new Error('SSH connection not ready. Please wait for the connection to establish.')
    }

    return new Promise((resolve, reject) => {
      client.sftp((err: any, sftp: any) => {
        if (err) {
          console.error('SFTP connection error:', err)
          reject(new Error(`Failed to establish SFTP connection: ${err.message}`))
          return
        }

        this.sftpConnections.set(sessionId, sftp)
        console.log('SFTP connected for session:', sessionId)
        resolve(sftp)
      })
    })
  }

  private async listFiles(sessionId: string, remotePath: string): Promise<any[]> {
    try {
      const sftp = await this.ensureSftpConnected(sessionId)

      return new Promise((resolve, reject) => {
        sftp.readdir(remotePath, (err: any, list: any[]) => {
          if (err) {
            console.error('List files error:', err)
            reject(err)
            return
          }

          const files = list
            .filter(item => item.filename !== '.' && item.filename !== '..')
            .map(item => ({
              filename: item.filename,
              isDirectory: item.longname?.startsWith('d') || false,
              size: item.attrs?.size || 0,
              modifyTime: item.attrs?.mtime || 0,
            }))
            .sort((a, b) => {
              if (a.isDirectory && !b.isDirectory) return -1
              if (!a.isDirectory && b.isDirectory) return 1
              return a.filename.localeCompare(b.filename)
            })

          resolve(files)
        })
      })
    } catch (error) {
      console.error('SFTP list error:', error)
      throw error
    }
  }

  // Throttled `step` callback for fastGet/fastPut, plus a final 100% message via `done`
  private progressReporter(sender: WebContents, sessionId: string, name: string) {
    const transferId = randomUUID()
    let last = 0
    let total = 0
    const send = (transferred: number) => {
      if (!sender.isDestroyed()) {
        sender.send('sftp:progress', { transferId, sessionId, name, transferred, total })
      }
    }
    return {
      step: (transferred: number, _chunk: number, fileSize: number) => {
        total = fileSize
        const now = Date.now()
        if (now - last >= 100) {
          last = now
          send(transferred)
        }
      },
      done: () => send(total),
    }
  }

  private async readFile(sessionId: string, remotePath: string): Promise<string> {
    const sftp = await this.ensureSftpConnected(sessionId)

    const stats: any = await new Promise((resolve, reject) => {
      sftp.stat(remotePath, (err: any, s: any) => (err ? reject(err) : resolve(s)))
    })
    if (stats.size > MAX_EDIT_SIZE) {
      throw new Error('File is larger than 5 MB, open it with a download instead')
    }

    const buffer: Buffer = await new Promise((resolve, reject) => {
      sftp.readFile(remotePath, (err: any, data: Buffer) => (err ? reject(err) : resolve(data)))
    })
    if (buffer.includes(0)) {
      throw new Error('Binary file, cannot be edited as text')
    }
    return buffer.toString('utf8')
  }

  // Writes next to the target then renames over it, so a failed write never truncates the original
  private async writeFile(sessionId: string, remotePath: string, content: string): Promise<void> {
    const sftp = await this.ensureSftpConnected(sessionId)
    const tmpPath = remotePath + '.s-term.tmp'
    const call = (fn: (cb: (err?: any) => void) => void) =>
      new Promise<void>((resolve, reject) => fn(err => (err ? reject(err) : resolve())))

    const stats: any = await new Promise((resolve, reject) => {
      sftp.stat(remotePath, (err: any, s: any) => (err ? reject(err) : resolve(s)))
    })

    let originalRemoved = false
    try {
      await call(cb => sftp.writeFile(tmpPath, content, cb))
      const mode = stats.mode & 0o7777
      if (mode) await call(cb => sftp.chmod(tmpPath, mode, cb))

      // ext_openssh_rename throws synchronously when the server lacks posix-rename
      let atomic = true
      await new Promise<void>((resolve, reject) => {
        try {
          sftp.ext_openssh_rename(tmpPath, remotePath, (err: any) =>
            err ? reject(err) : resolve()
          )
        } catch {
          atomic = false
          resolve()
        }
      })
      if (!atomic) {
        await call(cb => sftp.unlink(remotePath, cb))
        originalRemoved = true
        await call(cb => sftp.rename(tmpPath, remotePath, cb))
      }
    } catch (error) {
      console.error('Write file error:', error)
      // Once the original is gone the tmp file is the only copy, keep it
      if (!originalRemoved) sftp.unlink(tmpPath, () => {})
      throw error
    }
  }

  private async downloadFile(
    sender: WebContents,
    sessionId: string,
    remotePath: string
  ): Promise<string> {
    const sftp = await this.ensureSftpConnected(sessionId)

    const result = await dialog.showSaveDialog({
      defaultPath: path.join(os.homedir(), 'Downloads', path.basename(remotePath)),
    })

    if (result.canceled || !result.filePath) {
      throw new Error('Download canceled')
    }

    const localPath = result.filePath
    const progress = this.progressReporter(sender, sessionId, path.basename(remotePath))

    return new Promise((resolve, reject) => {
      sftp.fastGet(remotePath, localPath, { step: progress.step }, (err: any) => {
        if (err) {
          console.error('Download error:', err)
          reject(err)
          return
        }
        progress.done()
        console.log('Downloaded:', remotePath, 'to', localPath)
        resolve(localPath)
      })
    })
  }

  private async deleteFile(sessionId: string, remotePath: string): Promise<void> {
    const sftp = await this.ensureSftpConnected(sessionId)

    return new Promise((resolve, reject) => {
      sftp.stat(remotePath, (statErr: any, stats: any) => {
        if (statErr) {
          reject(statErr)
          return
        }

        if (stats.isDirectory()) {
          sftp.rmdir(remotePath, (err: any) => {
            if (err) reject(err)
            else resolve()
          })
        } else {
          sftp.unlink(remotePath, (err: any) => {
            if (err) reject(err)
            else resolve()
          })
        }
      })
    })
  }

  private async createDirectory(sessionId: string, remotePath: string): Promise<void> {
    const sftp = await this.ensureSftpConnected(sessionId)

    return new Promise((resolve, reject) => {
      sftp.mkdir(remotePath, (err: any) => {
        if (err) {
          console.error('Create directory error:', err)
          reject(err)
          return
        }
        console.log('Created directory:', remotePath)
        resolve()
      })
    })
  }

  private async renameFile(sessionId: string, oldPath: string, newPath: string): Promise<void> {
    const sftp = await this.ensureSftpConnected(sessionId)

    return new Promise((resolve, reject) => {
      sftp.rename(oldPath, newPath, (err: any) => {
        if (err) {
          console.error('Rename error:', err)
          reject(err)
          return
        }
        console.log('Renamed:', oldPath, 'to', newPath)
        resolve()
      })
    })
  }

  private async uploadFile(
    sender: WebContents,
    sessionId: string,
    localPath: string,
    remotePath: string
  ): Promise<void> {
    const sftp = await this.ensureSftpConnected(sessionId)

    const fileName = path.basename(localPath)
    const fullRemotePath = path.posix.join(remotePath, fileName)
    const progress = this.progressReporter(sender, sessionId, fileName)

    return new Promise((resolve, reject) => {
      sftp.fastPut(localPath, fullRemotePath, { step: progress.step }, (err: any) => {
        if (err) {
          console.error('Upload error:', err)
          reject(err)
          return
        }
        progress.done()
        console.log('Uploaded:', localPath, 'to', fullRemotePath)
        resolve()
      })
    })
  }

  private closeSftp(sessionId: string) {
    const sftp = this.sftpConnections.get(sessionId)
    if (sftp) {
      try {
        sftp.end()
      } catch (error) {
        console.error('Error closing SFTP:', error)
      }
      this.sftpConnections.delete(sessionId)
      console.log('SFTP disconnected for session:', sessionId)
    }
  }
}
