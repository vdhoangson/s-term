import { Connection, Folder, TreeNode } from '@/types/session'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useConnectionStore = defineStore('connections', () => {
  const connections = ref<Connection[]>([])
  const folders = ref<Record<string, Folder>>({})

  const connectionTree = computed(() => {
    const nodes: TreeNode[] = []
    
    // Convert folders to nodes
    Object.values(folders.value).forEach(folder => {
      nodes.push({
        id: folder.id,
        name: folder.name,
        type: 'folder',
        children: [],
        data: folder,
        parentId: folder.parentId || null,
        order: folder.order || 0
      })
    })

    // Convert connections to nodes
    connections.value.forEach(conn => {
      nodes.push({
        id: conn.id,
        name: conn.name,
        type: 'connection',
        data: conn,
        parentId: conn.parentId || null,
        order: conn.order || 0
      })
    })

    // Build tree
    const root: TreeNode[] = []
    const nodeMap = new Map<string, TreeNode>()

    // Index all nodes
    nodes.forEach(node => nodeMap.set(node.id, node))

    // Assign to parents
    nodes.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId)!
        parent.children = parent.children || []
        parent.children.push(node)
      } else {
        root.push(node)
      }
    })

    // Sort nodes by order
    const sortNodes = (n: TreeNode[]) => {
      n.sort((a, b) => (a.order || 0) - (b.order || 0))
      n.forEach(child => {
        if (child.children) sortNodes(child.children)
      })
    }

    sortNodes(root)
    return root
  })

  async function loadConnections() {
    const data = await window.ipcRenderer.invoke('store:get-data')
    connections.value = data.connections || []
    folders.value = data.folders || {}
  }

  async function saveConnection(connection: Connection) {
    await window.ipcRenderer.invoke('store:save-connection', connection)
    await loadConnections()
  }

  async function deleteConnection(id: string) {
    await window.ipcRenderer.invoke('store:delete-connection', id)
    await loadConnections()
  }

  async function saveFolder(folder: Folder) {
    await window.ipcRenderer.invoke('store:save-folder', folder)
    await loadConnections()
  }

  async function deleteFolder(id: string) {
    await window.ipcRenderer.invoke('store:delete-folder', id)
    await loadConnections()
  }

  async function moveItem(itemId: string, newParentId: string | null, newOrder: number) {
    // Check if it's a connection or folder
    const conn = connections.value.find(c => c.id === itemId)
    if (conn) {
      // Create a plain object copy to avoid cloning reactive proxies
      const plainConn: Connection = {
        id: conn.id,
        name: conn.name,
        type: conn.type,
        host: conn.host,
        port: conn.port,
        username: conn.username,
        authType: conn.authType,
        password: conn.password,
        passphrase: conn.passphrase,
        privateKeyPath: conn.privateKeyPath,
        privateKeyContent: conn.privateKeyContent,
        parentId: newParentId,
        order: newOrder,
        x11Forwarding: conn.x11Forwarding,
        x11Display: conn.x11Display,
        shell: conn.shell,
      }
      await saveConnection(plainConn)
      return
    }

    const folder = folders.value[itemId]
    if (folder) {
      // Create a plain object copy
      const plainFolder: Folder = {
        id: folder.id,
        name: folder.name,
        parentId: newParentId,
        order: newOrder,
      }
      await saveFolder(plainFolder)
    }
  }

  return {
    connections,
    folders,
    connectionTree,
    loadConnections,
    saveConnection,
    deleteConnection,
    saveFolder,
    deleteFolder,
    moveItem
  }
})
