import Store from 'electron-store'
import { ipcMain, safeStorage } from 'electron'
import { randomUUID } from 'crypto'

const ENC_PREFIX = 'enc:'

// Secret field -> flag the renderer gets instead of the value
const SECRET_FLAGS = {
  password: 'hasPassword',
  passphrase: 'hasPassphrase',
  privateKeyContent: 'hasKeyContent',
} as const

export interface ConnectionSecrets {
  password?: string
  passphrase?: string
  privateKeyContent?: string
}

interface AppSettings {
  checkForUpdates: boolean
  fontFamily: string
  fontSize: number
  lineHeight: number
  cursorStyle: 'block' | 'bar' | 'underline'
  cursorBlink: boolean
  scrollback: number
  defaultShell: string // empty = system default
  ligatures: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  checkForUpdates: true,
  fontFamily: '"JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
  fontSize: 14,
  lineHeight: 1.2,
  cursorStyle: 'block',
  cursorBlink: true,
  scrollback: 5000,
  defaultShell: '',
  ligatures: false,
}

// Define the shape of our stored data
interface StoredData {
  connections: Record<string, any>
  folders: Record<string, any>
  settings: AppSettings
}

export class StoreService {
  private store: any
  private secretsMigrated = false
  private warnedPlaintext = false

  constructor() {
    this.store = new Store<StoredData>({
      defaults: {
        connections: {},
        folders: {},
        settings: DEFAULT_SETTINGS,
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

  private encryptSecret(value: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      if (!this.warnedPlaintext) {
        console.warn('safeStorage unavailable (no OS keyring), storing credentials in plaintext')
        this.warnedPlaintext = true
      }
      // shortcut: plaintext when no OS keyring, upgrade if users report it
      return value
    }
    return ENC_PREFIX + safeStorage.encryptString(value).toString('base64')
  }

  private decryptSecret(value: string): string | undefined {
    if (!value.startsWith(ENC_PREFIX)) return value
    try {
      return safeStorage.decryptString(Buffer.from(value.slice(ENC_PREFIX.length), 'base64'))
    } catch (err) {
      console.error('Failed to decrypt stored credential:', err)
      return undefined
    }
  }

  // Lazy (safeStorage needs app ready): encrypts legacy plaintext secrets on first read
  private getRawConnections(): Record<string, any> {
    const connections = this.store.get('connections') as Record<string, any>
    if (!this.secretsMigrated && safeStorage.isEncryptionAvailable()) {
      this.secretsMigrated = true
      let changed = false
      for (const conn of Object.values(connections)) {
        for (const field of Object.keys(SECRET_FLAGS)) {
          if (conn[field] && !conn[field].startsWith(ENC_PREFIX)) {
            conn[field] = this.encryptSecret(conn[field])
            changed = true
          }
        }
      }
      if (changed) this.store.set('connections', connections)
    }
    return connections
  }

  // Main-only: decrypted secrets for a saved connection
  public getSecrets(connectionId: string): ConnectionSecrets {
    const conn = this.getRawConnections()[connectionId]
    const secrets: Record<string, string | undefined> = {}
    for (const field of Object.keys(SECRET_FLAGS)) {
      if (conn?.[field]) secrets[field] = this.decryptSecret(conn[field])
    }
    return secrets
  }

  private async getConnectionsOnly() {
    const connections = this.getRawConnections()

    // Strip secrets, the renderer only learns whether they exist
    const safeConnections = Object.values(connections).map(conn => {
      const safeConn = { ...conn }
      for (const [field, flag] of Object.entries(SECRET_FLAGS)) {
        safeConn[flag] = !!conn[field]
        delete safeConn[field]
      }

      // Migration: Set default authType for old connections
      if (!safeConn.authType) {
        safeConn.authType = safeConn.privateKeyPath ? 'privateKey' : 'password'
      }

      return safeConn
    })

    return safeConnections
  }

  private async saveConnection(connection: any) {
    const connections = this.getRawConnections()
    const existing = connections[connection.id] || {}
    const connectionToStore = { ...connection }

    for (const [field, flag] of Object.entries(SECRET_FLAGS)) {
      delete connectionToStore[flag]
      // Empty or missing secret keeps the previously stored value
      connectionToStore[field] = connection[field]
        ? this.encryptSecret(connection[field])
        : existing[field]
    }

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

  private getSettings(): AppSettings {
    return { ...DEFAULT_SETTINGS, ...this.store.get('settings') }
  }

  private setSettings(patch: Partial<AppSettings>) {
    this.store.set('settings', { ...this.getSettings(), ...patch })
    return true
  }
}
