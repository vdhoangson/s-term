import Store from 'electron-store'
import { ipcMain } from 'electron'
import keytar from 'keytar'
import { randomUUID } from 'crypto'

// Define the shape of our stored data
interface StoredData {
  connections: Record<string, any>
  folders: Record<string, any>
}

const SERVICE_NAME = 's-term'

export class StoreService {
  private store: any

  constructor() {
    this.store = new Store<StoredData>({
      defaults: {
        connections: {},
        folders: {},
      },
    })

    this.registerListeners()
    this.migrateOldEncryptedPasswords()
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
  }

  private async getData() {
    const connections = await this.getConnectionsOnly()
    const folders = this.store.get('folders') as Record<string, any>
    return { connections, folders }
  }

  private async getConnectionsOnly() {
    const connections = this.store.get('connections') as Record<string, any>

    // Load passwords from keytar for each connection
    const connectionsWithPasswords = await Promise.all(
      Object.values(connections).map(async conn => {
        const connectionWithCreds = { ...conn }

        // Retrieve password from keytar if it was stored
        if (conn.authType === 'password' || (!conn.authType && !conn.privateKeyPath)) {
          try {
            const password = await keytar.getPassword(SERVICE_NAME, `${conn.id}-password`)
            if (password) {
              connectionWithCreds.password = password
            }
          } catch (e) {
            console.error('Failed to retrieve password from keytar:', e)
          }
        }

        // Retrieve passphrase from keytar if it was stored
        if (conn.authType === 'privateKey' || conn.privateKeyPath) {
          try {
            const passphrase = await keytar.getPassword(SERVICE_NAME, `${conn.id}-passphrase`)
            if (passphrase) {
              connectionWithCreds.passphrase = passphrase
            }
          } catch (e) {
            console.error('Failed to retrieve passphrase from keytar:', e)
          }
        }

        // Migration: Set default authType for old connections
        if (!connectionWithCreds.authType) {
          connectionWithCreds.authType = connectionWithCreds.privateKeyPath
            ? 'privateKey'
            : 'password'
        }

        return connectionWithCreds
      })
    )

    return connectionsWithPasswords
  }

  private async saveConnection(connection: any) {
    // Store password in keytar
    if (connection.password) {
      try {
        await keytar.setPassword(SERVICE_NAME, `${connection.id}-password`, connection.password)
      } catch (e) {
        console.error('Failed to save password to keytar:', e)
        throw new Error('Failed to securely store password')
      }
    }

    // Store passphrase in keytar
    if (connection.passphrase) {
      try {
        await keytar.setPassword(SERVICE_NAME, `${connection.id}-passphrase`, connection.passphrase)
      } catch (e) {
        console.error('Failed to save passphrase to keytar:', e)
        throw new Error('Failed to securely store passphrase')
      }
    }

    // Save connection without sensitive data in JSON
    const connectionToStore = { ...connection }
    delete connectionToStore.password
    delete connectionToStore.passphrase

    const connections = this.store.get('connections') as Record<string, any>
    connections[connection.id] = connectionToStore
    this.store.set('connections', connections)

    return true
  }

  private async deleteConnection(id: string) {
    // Delete from keytar
    try {
      await keytar.deletePassword(SERVICE_NAME, `${id}-password`)
      await keytar.deletePassword(SERVICE_NAME, `${id}-passphrase`)
    } catch (e) {
      console.error('Failed to delete credentials from keytar:', e)
    }

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
   * Migrate old encrypted passwords to keytar
   * This runs once on first load after the update
   */
  private async migrateOldEncryptedPasswords() {
    const connections = this.store.get('connections') as Record<string, any>
    let migrated = false

    for (const [id, conn] of Object.entries(connections)) {
      // Check if connection has encrypted password (old format)
      // Encrypted passwords will be in format "hex:hex" or base64
      if (conn.password && typeof conn.password === 'string') {
        // Check if it looks like encrypted data (contains ':' or is long base64)
        if (conn.password.includes(':') || conn.password.length > 50) {
          console.log(`Migrating password for connection ${id} to keytar`)

          // We can't decrypt old passwords without the old encryption key
          // So we'll just remove the encrypted password and let user re-enter it
          // Alternatively, keep the old decrypt logic temporarily for migration
          delete conn.password
          migrated = true
        }
      }

      if (conn.passphrase && typeof conn.passphrase === 'string') {
        if (conn.passphrase.includes(':') || conn.passphrase.length > 50) {
          console.log(`Migrating passphrase for connection ${id} to keytar`)
          delete conn.passphrase
          migrated = true
        }
      }
    }

    if (migrated) {
      this.store.set('connections', connections)
      console.log(
        'Migration complete: Old encrypted passwords removed. Users will need to re-enter passwords.'
      )
    }
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
        order: 0 // Default order
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
}
