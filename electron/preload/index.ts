import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: (options?: any) => ipcRenderer.invoke('dialog:openFile', options),
  store: {
    getData: () => ipcRenderer.invoke('store:get-data'),
    getConnections: () => ipcRenderer.invoke('store:get-connections'),
    saveConnection: (connection: any) => ipcRenderer.invoke('store:save-connection', connection),
    deleteConnection: (id: string) => ipcRenderer.invoke('store:delete-connection', id),
    saveFolder: (folder: any) => ipcRenderer.invoke('store:save-folder', folder),
    deleteFolder: (id: string) => ipcRenderer.invoke('store:delete-folder', id),
    importSshConfig: () => ipcRenderer.invoke('store:import-ssh-config'),
    getSettings: () => ipcRenderer.invoke('store:get-settings'),
    setSettings: (settings: any) => ipcRenderer.invoke('store:set-settings', settings),
  },
  session: {
    create: (options: any) => ipcRenderer.invoke('session:create', options),
    write: (sessionId: string, data: string) => ipcRenderer.send('session:write', sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.send('session:resize', sessionId, cols, rows),
    kill: (sessionId: string) => ipcRenderer.send('session:kill', sessionId),
    ack: (sessionId: string, bytes: number) =>
      ipcRenderer.send('session:ack-data', sessionId, bytes),
    onData: (sessionId: string, callback: (data: string) => void) => {
      const channel = `session:data:${sessionId}`
      ipcRenderer.on(channel, (_event, data) => callback(data))
      return () => ipcRenderer.removeAllListeners(channel)
    },
    onExit: (sessionId: string, callback: (data: { exitCode: number; signal: string }) => void) => {
      const channel = `session:exit:${sessionId}`
      ipcRenderer.on(channel, (_event, data) => callback(data))
      return () => ipcRenderer.removeAllListeners(channel)
    },
  },
  monitoring: {
    getMetrics: (sessionId: string) => ipcRenderer.invoke('monitoring:getMetrics', sessionId),
  },
  sftp: {
    list: (sessionId: string, remotePath: string) =>
      ipcRenderer.invoke('sftp:list', sessionId, remotePath),
    download: (sessionId: string, remotePath: string) =>
      ipcRenderer.invoke('sftp:download', sessionId, remotePath),
    upload: (sessionId: string, localPath: string, remotePath: string) =>
      ipcRenderer.invoke('sftp:upload', sessionId, localPath, remotePath),
    mkdir: (sessionId: string, remotePath: string) =>
      ipcRenderer.invoke('sftp:mkdir', sessionId, remotePath),
    delete: (sessionId: string, remotePath: string) =>
      ipcRenderer.invoke('sftp:delete', sessionId, remotePath),
    rename: (sessionId: string, oldPath: string, newPath: string) =>
      ipcRenderer.invoke('sftp:rename', sessionId, oldPath, newPath),
    readFile: (sessionId: string, remotePath: string) =>
      ipcRenderer.invoke('sftp:readFile', sessionId, remotePath),
    writeFile: (sessionId: string, remotePath: string, content: string) =>
      ipcRenderer.invoke('sftp:writeFile', sessionId, remotePath, content),
    onProgress: (callback: (data: any) => void) => {
      // Remove only this listener: several SFTP browsers can be mounted at once
      const listener = (_event: any, data: any) => callback(data)
      ipcRenderer.on('sftp:progress', listener)
      return () => ipcRenderer.removeListener('sftp:progress', listener)
    },
  },
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
    onUpdateChecking: (callback: () => void) => {
      ipcRenderer.on('update-checking', callback)
      return () => ipcRenderer.removeAllListeners('update-checking')
    },
    onUpdateAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update-available', (_event, info) => callback(info))
      return () => ipcRenderer.removeAllListeners('update-available')
    },
    onUpdateNotAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update-not-available', (_event, info) => callback(info))
      return () => ipcRenderer.removeAllListeners('update-not-available')
    },
    onUpdateDownloadProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress))
      return () => ipcRenderer.removeAllListeners('update-download-progress')
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      ipcRenderer.on('update-downloaded', (_event, info) => callback(info))
      return () => ipcRenderer.removeAllListeners('update-downloaded')
    },
    onUpdateError: (callback: (error: string) => void) => {
      ipcRenderer.on('update-error', (_event, error) => callback(error))
      return () => ipcRenderer.removeAllListeners('update-error')
    },
  },
  onOpenAbout: (callback: () => void) => {
    ipcRenderer.on('menu:open-about', callback)
    return () => ipcRenderer.removeAllListeners('menu:open-about')
  },
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('menu:open-settings', callback)
    return () => ipcRenderer.removeAllListeners('menu:open-settings')
  },
})
