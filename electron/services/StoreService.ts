import Store from 'electron-store'
import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'

// Define the shape of our stored data
interface StoredData {
  connections: Record<string, any>
  folders: Record<string, any>
  settings: {
    checkForUpdates: boolean
  }
}

export class StoreService {
  private store: any

  constructor() {
    this.store = new Store<StoredData>({
      defaults: {
        connections: {},
        folders: {},
        settings: {
          checkForUpdates: true,
        },
      },
    })

    this.registerListeners()
    this.migrateFolders()
  }

  private registerListeners() {
    ipcMain.handle('store:get-data', () => {
      return this.getData()
    })

    // Keep old handler for backward compatibility if needed, or just remove
    ipcMain.handle('store:get-connections', () => {
      return this.getConnectionsOnly()
    })

    ipcMain.handle('store:save-connection', (event, connection) => {
      return this.saveConnection(connection)
    })

    ipcMain.handle('store:delete-connection', (event, id) => {
      return this.deleteConnection(id)
    })

    ipcMain.handle('store:save-folder', (event, folder) => {
      return this.saveFolder(folder)
    })

    ipcMain.handle('store:delete-folder', (event, id) => {
      return this.deleteFolder(id)
    })

    ipcMain.handle('store:get-settings', () => {
      return this.getSettings()
    })

    ipcMain.handle('store:set-settings', (event, settings) => {
      return this.setSettings(settings)
    })
  }

  private async getData() {
    const connections = await this.getConnectionsOnly()
    const folders = this.store.get('folders') as Record<string, any>
    return { connections, folders }
  }

  private async getConnectionsOnly() {
    const connections = this.store.get('connections') as Record<string, any>

    // Return connections with passwords already stored
    const connectionsWithPasswords = Object.values(connections).map(conn => {
      const connectionWithCreds = { ...conn }

      // Migration: Set default authType for old connections
      if (!connectionWithCreds.authType) {
        connectionWithCreds.authType = connectionWithCreds.privateKeyPath
          ? 'privateKey'
          : 'password'
      }

      return connectionWithCreds
    })

    return connectionsWithPasswords
  }

  private async saveConnection(connection: any) {
    // Save connection with sensitive data in JSON (not secure, but works without keytar)
    const connectionToStore = { ...connection }

    const connections = this.store.get('connections') as Record<string, any>
    connections[connection.id] = connectionToStore
    this.store.set('connections', connections)

    return true
  }

  private async deleteConnection(id: string) {
    // Delete from store
    const connections = this.store.get('connections') as Record<string, any>
    delete connections[id]
    this.store.set('connections', connections)

    return true
  }

  private async saveFolder(folder: any) {
    const folders = this.store.get('folders') as Record<string, any>
    folders[folder.id] = folder
    this.store.set('folders', folders)
    return true
  }

  private async deleteFolder(id: string) {
    const folders = this.store.get('folders') as Record<string, any>
    delete folders[id]
    this.store.set('folders', folders)
    return true
  }

  /**
   * Migrate old folder paths to new Folder objects
   */
  private async migrateFolders() {
    const connections = this.store.get('connections') as Record<string, any>
    const folders = this.store.get('folders') as Record<string, any>
    let migrated = false

    // Helper to find or create folder by name and parent
    const getOrCreateFolder = (name: string, parentId: string | null): string => {
      // Check if folder already exists
      const existing = Object.values(folders).find(
        (f: any) => f.name === name && f.parentId === parentId
      ) as any

      if (existing) return existing.id

      // Create new folder
      const id = randomUUID()
      folders[id] = {
        id,
        name,
        parentId,
        order: 0, // Default order
      }
      migrated = true
      return id
    }

    for (const [id, conn] of Object.entries(connections)) {
      if (conn.folder && typeof conn.folder === 'string') {
        console.log(`Migrating folder path for connection ${id}: ${conn.folder}`)

        const parts = conn.folder.split('/')
        let currentParentId: string | null = null

        for (const part of parts) {
          if (part) {
            currentParentId = getOrCreateFolder(part, currentParentId)
          }
        }

        conn.parentId = currentParentId
        delete conn.folder
        migrated = true
      }
    }

    if (migrated) {
      this.store.set('connections', connections)
      this.store.set('folders', folders)
      console.log('Migration complete: Folder paths converted to Folder objects.')
    }
  }

  private getSettings() {
    return this.store.get('settings')
  }

  private setSettings(settings: any) {
    this.store.set('settings', settings)
    return true
  }
}
