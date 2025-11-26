export interface IElectronAPI {
  store: {
    getConnections: () => Promise<any[]>
    saveConnection: (connection: any) => Promise<void>
    deleteConnection: (id: string) => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
    ipcRenderer: import('electron').IpcRenderer
  }
}
