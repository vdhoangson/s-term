import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('sftp', {
  connect: (config: any) => ipcRenderer.invoke('sftp:connect', config),
  list: (remotePath: string) => ipcRenderer.invoke('sftp:list', remotePath),
  download: (remotePath: string, localPath: string) =>
    ipcRenderer.invoke('sftp:download', remotePath, localPath),
  openDialog: () => ipcRenderer.invoke('dialog:open'),
})

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: (options?: any) => ipcRenderer.invoke('dialog:openFile', options),
  store: {
    getConnections: () => ipcRenderer.invoke('store:get-connections'),
    saveConnection: (connection: any) => ipcRenderer.invoke('store:save-connection', connection),
    deleteConnection: (id: string) => ipcRenderer.invoke('store:delete-connection', id),
    getSettings: () => ipcRenderer.invoke('store:get-settings'),
    setSettings: (settings: any) => ipcRenderer.invoke('store:set-settings', settings),
  },
  terminal: {
    create: (options: any) => ipcRenderer.invoke('terminal:create', options),
    write: (sessionId: string, data: string) => ipcRenderer.send('terminal:write', sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.send('terminal:resize', sessionId, cols, rows),
    kill: (sessionId: string) => ipcRenderer.send('terminal:kill', sessionId),
    onData: (sessionId: string, callback: (data: string) => void) => {
      const channel = `terminal:data:${sessionId}`
      ipcRenderer.on(channel, (_event, data) => callback(data))
      return () => ipcRenderer.removeAllListeners(channel)
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

// For backward compatibility, also expose ipcRenderer directly
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  on: (channel: string, listener: any) => ipcRenderer.on(channel, listener),
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
})
