import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'

export class SftpService {
  private sftpConnections: Map<string, any> = new Map()
  private sshClients: Map<string, any> = new Map()

  constructor() {
    this.registerListeners()
  }

  // Called by SshSession to register its client
  public registerSshClient(sessionId: string, client: any) {
    this.sshClients.set(sessionId, client)
    console.log('Registered SSH client for SFTP:', sessionId)
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

    ipcMain.handle('sftp:download', async (event, sessionId, remotePath) => {
      return this.downloadFile(sessionId, remotePath)
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
  }

  private async ensureSftpConnected(sessionId: string): Promise<any> {
    if (this.sftpConnections.has(sessionId)) {
      return this.sftpConnections.get(sessionId)
    }

    const client = this.sshClients.get(sessionId)
    if (!client) {
      throw new Error('SSH client not found for session')
    }

    return new Promise((resolve, reject) => {
      client.sftp((err: any, sftp: any) => {
        if (err) {
          console.error('SFTP connection error:', err)
          reject(err)
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
      return []
    }
  }

  private async downloadFile(sessionId: string, remotePath: string): Promise<string> {
    const sftp = await this.ensureSftpConnected(sessionId)

    const result = await dialog.showSaveDialog({
      defaultPath: path.join(os.homedir(), 'Downloads', path.basename(remotePath)),
    })

    if (result.canceled || !result.filePath) {
      throw new Error('Download canceled')
    }

    const localPath = result.filePath

    return new Promise((resolve, reject) => {
      sftp.fastGet(remotePath, localPath, (err: any) => {
        if (err) {
          console.error('Download error:', err)
          reject(err)
          return
        }
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
