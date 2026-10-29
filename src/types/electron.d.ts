export interface AppSettings {
  checkForUpdates: boolean
  fontFamily: string
  fontSize: number
  lineHeight: number
  cursorStyle: 'block' | 'bar' | 'underline'
  cursorBlink: boolean
  scrollback: number
  defaultShell: string
  ligatures: boolean
}

export interface IElectronAPI {
  selectFile: (options?: any) => Promise<{ canceled: boolean; filePath?: string }>
  store: {
    getData: () => Promise<{ connections: any[]; folders: Record<string, any> }>
    getConnections: () => Promise<any[]>
    saveConnection: (connection: any) => Promise<void>
    deleteConnection: (id: string) => Promise<void>
    saveFolder: (folder: any) => Promise<void>
    deleteFolder: (id: string) => Promise<void>
    getSettings: () => Promise<AppSettings>
    setSettings: (settings: Partial<AppSettings>) => Promise<void>
  }
  session: {
    create: (options: any) => Promise<string>
    write: (sessionId: string, data: string) => void
    resize: (sessionId: string, cols: number, rows: number) => void
    kill: (sessionId: string) => void
    ack: (sessionId: string, bytes: number) => void
    onData: (sessionId: string, callback: (data: string) => void) => () => void
    onExit: (
      sessionId: string,
      callback: (data: { exitCode: number; signal: string }) => void
    ) => () => void
  }
  monitoring: {
    getMetrics: (sessionId: string) => Promise<any>
  }
  sftp: {
    list: (sessionId: string, remotePath: string) => Promise<any[]>
    download: (sessionId: string, remotePath: string) => Promise<string>
    upload: (sessionId: string, localPath: string, remotePath: string) => Promise<void>
    mkdir: (sessionId: string, remotePath: string) => Promise<void>
    delete: (sessionId: string, remotePath: string) => Promise<void>
    rename: (sessionId: string, oldPath: string, newPath: string) => Promise<void>
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
  }
}
