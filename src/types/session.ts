export interface ISession {
  id: string
  title: string
  type: 'local' | 'ssh'
  connectionId?: string
  monitoringEnabled?: boolean
}
export interface ISessionType {
  title: string
  value: string
  icon: string
  color: string
}

export interface Connection {
  id: string
  name: string
  type: 'ssh' | 'local'
  host?: string
  port?: number
  username?: string
  authType?: 'password' | 'privateKey'
  password?: string
  passphrase?: string
  privateKeyPath?: string
  privateKeyContent?: string
  parentId?: string | null
  order?: number
  x11Forwarding?: boolean
  x11Display?: string
  shell?: string // For local terminals
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  order: number
}

export interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'connection'
  children?: TreeNode[]
  data?: Connection | Folder
  parentId?: string | null
  order?: number
}

export interface ITerminalSession {
  id: string
  title: string
  type: 'local' | 'ssh'
  connectionId?: string // ID of the connection that created this session
  monitoringEnabled?: boolean // Monitoring state
  config?: any // Configuration used to create the session
}
