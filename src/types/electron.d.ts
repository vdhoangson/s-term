export interface IElectronAPI {
  selectFile: (options?: any) => Promise<{ canceled: boolean; filePath?: string }>
  store: {
    getConnections: () => Promise<any[]>
    saveConnection: (connection: any) => Promise<void>
    deleteConnection: (id: string) => Promise<void>
    getSettings: () => Promise<{ checkForUpdates: boolean }>
    setSettings: (settings: { checkForUpdates: boolean }) => Promise<void>
  }
  session: {
    create: (options: any) => Promise<string>
    write: (sessionId: string, data: string) => void
    resize: (sessionId: string, cols: number, rows: number) => void
    kill: (sessionId: string) => void
    onData: (sessionId: string, callback: (data: string) => void) => () => void
  }
  updater: {
    checkForUpdates: () => Promise<void>
    downloadUpdate: () => Promise<void>
    quitAndInstall: () => void
    onUpdateChecking: (callback: () => void) => () => void
    onUpdateAvailable: (callback: (info: any) => void) => () => void
    onUpdateNotAvailable: (callback: (info: any) => void) => () => void
    onUpdateDownloadProgress: (callback: (progress: any) => void) => () => void
    onUpdateDownloaded: (callback: (info: any) => void) => () => void
    onUpdateError: (callback: (error: string) => void) => () => void
  }
  onOpenAbout: (callback: () => void) => () => void
  onOpenSettings: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
    ipcRenderer: import('electron').IpcRenderer
  }
}
