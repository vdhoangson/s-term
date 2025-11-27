export interface IElectronAPI {
  store: {
    getConnections: () => Promise<any[]>
    saveConnection: (connection: any) => Promise<void>
    deleteConnection: (id: string) => Promise<void>
    getSettings: () => Promise<{ checkForUpdates: boolean }>
    setSettings: (settings: { checkForUpdates: boolean }) => Promise<void>
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
