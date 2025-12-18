<template>
  <!-- Main Sidebar Content -->
  <v-navigation-drawer v-model="isOpen" width="300">
    <div class="d-flex flex-column h-100">
      <!-- Quick Connect -->
      <v-sheet class="pa-2 border-b">
        <v-text-field
          v-model="search"
          :placeholder="t('sidebar.searchPlaceholder')"
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          class="search-input"
        ></v-text-field>
      </v-sheet>

      <v-sheet class="d-flex align-center px-2 py-1">
        <v-icon icon="mdi-account" size="small" class="mr-2"></v-icon>
        <span class="text-caption font-weight-bold">{{ t('sidebar.savedConnections') }}</span>
        <v-spacer></v-spacer>

        <v-tooltip location="top" text="New Folder">
          <template #activator="{ props }">
            <v-btn
              icon="mdi-folder-plus"
              variant="text"
              size="x-small"
              v-bind="props"
              class="mr-1"
              @click="openNewFolderDialog"
            ></v-btn>
          </template>
        </v-tooltip>

        <v-tooltip location="top" text="New Session">
          <template #activator="{ props }">
            <v-btn
              icon="mdi-plus"
              variant="text"
              size="x-small"
              v-bind="props"
              @click="showNewSessionModal = true"
            ></v-btn>
          </template>
        </v-tooltip>
      </v-sheet>

      <!-- Sessions Tree -->
      <v-list density="compact" nav class="flex-grow-1 overflow-y-auto py-0">
        <draggable
          v-model="treeData"
          item-key="id"
          tag="div"
          group="sessions"
          @change="onDragChange"
          @start="onDragStart"
          @end="onDragEnd"
          :animation="200"
        >
          <template #item="{ element }">
            <div>
              <SessionTreeItem
                :item="element"
                @select="openSavedConnection"
                @edit="handleEditConnection"
                @delete="deleteConnection"
                @delete-folder="deleteFolder"
                @create-session="handleCreateSessionInFolder"
                @create-folder="handleCreateFolderInFolder"
                @rename="handleRename"
                @move-item="handleMoveItem"
                @drag-start="onDragStart"
                @drag-end="onDragEnd"
              />
            </div>
          </template>
        </draggable>
      </v-list>
    </div>
  </v-navigation-drawer>

  <NewSessionModal
    v-model="showNewSessionModal"
    :edit-connection="
      editingConnection?.data &&
      'type' in editingConnection.data &&
      (editingConnection.data.type === 'ssh' || editingConnection.data.type === 'local')
        ? editingConnection.data
        : undefined
    "
    :initial-folder-id="targetFolderId"
    @create="handleCreateConnection"
  />

  <!-- New/Rename Folder Dialog -->
  <v-dialog v-model="showFolderDialog" max-width="400">
    <v-card>
      <v-card-title>{{ editingFolder ? 'Rename Folder' : 'New Folder' }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="folderName"
          label="Folder Name"
          autofocus
          @keyup.enter="saveFolder"
        ></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="showFolderDialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="saveFolder">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTerminalStore } from '../../stores/terminal'
import { useConnectionStore } from '../../stores/connections'
import type { Connection, TreeNode, Folder } from '@/types/session'
import NewSessionModal from './NewSessionModal.vue'
import SessionTreeItem from './SessionTreeItem.vue'
import draggable from 'vuedraggable'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const { t } = useI18n()
const terminalStore = useTerminalStore()
const connectionStore = useConnectionStore()
const showNewSessionModal = ref(false)
const editingConnection = ref<TreeNode | null>(null)
const search = ref('')

// Folder Dialog State
const showFolderDialog = ref(false)
const folderName = ref('')
const editingFolder = ref<TreeNode | null>(null)
const targetFolderId = ref<string | null>(null) // For creating session/folder inside a folder

// Tree Data for Draggable
const treeData = ref<TreeNode[]>([])
const isDragging = ref(false)

// Sync treeData with store
watch(
  () => connectionStore.connectionTree,
  newTree => {
    if (!isDragging.value) {
      treeData.value = JSON.parse(JSON.stringify(newTree))
    }
  },
  { immediate: true, deep: true }
)

onMounted(() => {
  connectionStore.loadConnections()
})

// Drag and Drop Handler
function onDragChange(event: any) {
  if (event.moved) {
    // Update order of all items in this list
    updateListOrder(treeData.value, null)
  }
  if (event.added) {
    // Item moved to root
    updateListOrder(treeData.value, null)
  }
}

function onDragStart() {
  isDragging.value = true
}

function onDragEnd() {
  isDragging.value = false
}

// Helper to update order and parent for a list of nodes
function updateListOrder(nodes: TreeNode[], parentId: string | null) {
  nodes.forEach((node, index) => {
    connectionStore.moveItem(node.id, parentId, index)
  })
}

// Passed down to children to handle their DnD changes
function handleMoveItem(event: any, parentId: string) {
  // This is called by children when their list changes
}

async function createLocalSession(shell?: string) {
  const id = await window.electronAPI.session.create({
    cols: 80,
    rows: 24,
    shell,
  })

  terminalStore.addSession({
    id,
    title: 'Local Terminal',
    type: 'local',
  })
}

async function openSavedConnection(conn: Connection) {
  const existingSession = terminalStore.sessions.find(s => s.connectionId === conn.id)

  if (existingSession) {
    terminalStore.setActiveSession(existingSession.id)
    return
  }

  if (conn.type === 'local') {
    createLocalSession(conn.shell)
  } else {
    const id = await window.electronAPI.session.create({
      cols: 80,
      rows: 24,
      ...conn,
    })

    terminalStore.addSession({
      id,
      title: conn.name,
      type: 'ssh',
      connectionId: conn.id, // Track which connection created this session
    })
  }
}

async function handleCreateConnection(data: any) {
  const newConnection: Connection = {
    id: data.id || crypto.randomUUID(),
    name: data.name || (data.type === 'ssh' ? `${data.username}@${data.host}` : 'Local Terminal'),
    type: data.type || 'ssh',
    host: data.host,
    port: data.port ? parseInt(data.port) : undefined,
    username: data.username,
    authType: data.authType || 'password',
    password: data.password,
    privateKeyPath: data.privateKeyPath,
    passphrase: data.passphrase,
    parentId: targetFolderId.value || data.parentId, // Use target folder if set
    order: 9999, // Put at end
    // Local specific
    shell: data.shell,
    // SSH specific
    x11Forwarding: data.x11Forwarding,
  }

  await connectionStore.saveConnection(newConnection)
  editingConnection.value = null
  targetFolderId.value = null
  showNewSessionModal.value = false
}

function handleEditConnection(item: TreeNode) {
  editingConnection.value = item
  showNewSessionModal.value = true
}

async function deleteConnection(id: string) {
  if (confirm('Are you sure you want to delete this connection?')) {
    await connectionStore.deleteConnection(id)
  }
}

async function deleteFolder(id: string) {
  if (
    confirm('Are you sure you want to delete this folder? All contents will be deleted/orphaned.')
  ) {
    await connectionStore.deleteFolder(id)
  }
}

// Folder Operations
function openNewFolderDialog() {
  editingFolder.value = null
  folderName.value = ''
  targetFolderId.value = null
  showFolderDialog.value = true
}

function handleCreateFolderInFolder(parentId: string) {
  editingFolder.value = null
  folderName.value = ''
  targetFolderId.value = parentId
  showFolderDialog.value = true
}

function handleCreateSessionInFolder(parentId: string) {
  targetFolderId.value = parentId
  editingConnection.value = null
  showNewSessionModal.value = true
}

function handleRename(item: TreeNode) {
  if (item.type === 'folder') {
    editingFolder.value = item
    folderName.value = item.name
    showFolderDialog.value = true
  } else {
    // For connection rename, we usually use edit modal, but could allow quick rename here
    // For now, just use edit modal
    handleEditConnection(item)
  }
}

async function saveFolder() {
  if (!folderName.value) return

  if (editingFolder.value) {
    // Rename
    const folder = connectionStore.folders[editingFolder.value.id]
    if (folder) {
      folder.name = folderName.value
      await connectionStore.saveFolder(folder)
    }
  } else {
    // Create
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name: folderName.value,
      parentId: targetFolderId.value,
      order: 9999,
    }
    await connectionStore.saveFolder(newFolder)
  }

  showFolderDialog.value = false
}
</script>

<style scoped>
.search-input :deep(.v-field__outline__start),
.search-input :deep(.v-field__outline__end) {
  border-color: #444;
}
</style>
