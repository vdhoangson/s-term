<template>
  <div class="sftp-browser d-flex flex-column" style="height: 100%">
    <!-- Toolbar (fixed) -->
    <v-sheet class="pa-2" style="flex-shrink: 0">
      <v-text-field
        v-model="currentPath"
        density="compact"
        variant="outlined"
        hide-details
        prepend-inner-icon="mdi-folder"
        readonly
        class="mb-2"
      >
        <template #append-inner>
          <v-btn
            icon="mdi-refresh"
            variant="text"
            size="small"
            :loading="loading"
            @click="refreshFiles"
          ></v-btn>
        </template>
      </v-text-field>

      <div class="d-flex gap-1">
        <v-btn
          prepend-icon="mdi-arrow-up"
          size="small"
          variant="tonal"
          :disabled="currentPath === '/'"
          @click="goUp"
          >{{ $t('sftp.buttons.up') }}</v-btn
        >
        <v-btn
          prepend-icon="mdi-folder-plus"
          size="small"
          variant="tonal"
          @click="showNewFolderDialog = true"
          >{{ $t('sftp.buttons.newFolder') }}</v-btn
        >
        <v-btn prepend-icon="mdi-upload" size="small" variant="tonal" @click="uploadFile">{{
          $t('sftp.buttons.upload')
        }}</v-btn>
      </div>
    </v-sheet>

    <!-- File List -->
    <v-list density="compact" class="flex-grow-1 overflow-y-auto py-0">
      <v-list-item
        v-for="file in files"
        :key="file.filename"
        class="file-item"
        @dblclick="handleFileClick(file)"
        @contextmenu="showFileContextMenu($event, file)"
      >
        <template #prepend>
          <v-icon :color="getFileColor(file)">{{ getFileIcon(file) }}</v-icon>
        </template>

        <v-list-item-title>{{ file.filename }}</v-list-item-title>
        <v-list-item-subtitle v-if="!file.isDirectory">
          {{ formatFileSize(file.size) }}
        </v-list-item-subtitle>

        <template #append>
          <v-btn
            icon="mdi-dots-vertical"
            variant="text"
            size="x-small"
            @click.stop="showFileContextMenu($event, file)"
          ></v-btn>
        </template>
      </v-list-item>

      <!-- Context Menu -->
      <v-menu
        v-model="showContextMenu"
        :style="{ position: 'fixed', left: contextMenuX + 'px', top: contextMenuY + 'px' }"
      >
        <v-list density="compact">
          <v-list-item
            v-if="selectedFile && !selectedFile.isDirectory"
            @click="downloadFile(selectedFile!)"
          >
            <template #prepend>
              <v-icon icon="mdi-download"></v-icon>
            </template>
            <v-list-item-title>{{ $t('sftp.contextMenu.download') }}</v-list-item-title>
          </v-list-item>
          <v-list-item v-if="selectedFile" @click="renameFile(selectedFile!)">
            <template #prepend>
              <v-icon icon="mdi-rename-box"></v-icon>
            </template>
            <v-list-item-title>{{ $t('sftp.contextMenu.rename') }}</v-list-item-title>
          </v-list-item>
          <v-list-item v-if="selectedFile" @click="deleteFile(selectedFile!)">
            <template #prepend>
              <v-icon icon="mdi-delete" color="error"></v-icon>
            </template>
            <v-list-item-title>{{ $t('sftp.contextMenu.delete') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-list-item v-if="files.length === 0 && !loading">
        <v-list-item-title class="text-grey text-center">
          <div class="py-8">
            <v-icon size="48" color="grey">mdi-folder-open</v-icon>
            <div class="text-body-2 mt-2">{{ $t('sftp.emptyDirectory') }}</div>
          </div>
        </v-list-item-title>
      </v-list-item>

      <!-- Loading -->
      <v-list-item v-if="loading">
        <v-list-item-title class="text-center pa-4">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </v-list-item-title>
      </v-list-item>
    </v-list>

    <!-- New Folder Dialog -->
    <v-dialog v-model="showNewFolderDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $t('sftp.newFolderDialog.title') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newFolderName"
            :label="$t('sftp.newFolderDialog.label')"
            variant="outlined"
            density="compact"
            autofocus
            @keyup.enter="createFolder"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showNewFolderDialog = false">{{
            $t('sftp.newFolderDialog.cancel')
          }}</v-btn>
          <v-btn color="primary" @click="createFolder">{{
            $t('sftp.newFolderDialog.create')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5">{{ $t('sftp.deleteDialog.title') }}</v-card-title>
        <v-card-text>
          {{ $t('sftp.deleteDialog.message', { name: selectedFile?.filename }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" @click="showDeleteDialog = false">{{
            $t('sftp.deleteDialog.cancel')
          }}</v-btn>
          <v-btn color="error" @click="confirmDelete">{{ $t('sftp.deleteDialog.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Rename Dialog -->
    <v-dialog v-model="showRenameDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $t('sftp.renameDialog.title') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newFileName"
            :label="$t('sftp.renameDialog.label')"
            :placeholder="$t('sftp.renameDialog.placeholder')"
            variant="outlined"
            density="compact"
            autofocus
            @keyup.enter="confirmRename"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showRenameDialog = false">{{ $t('sftp.renameDialog.cancel') }}</v-btn>
          <v-btn color="primary" @click="confirmRename">{{ $t('sftp.renameDialog.rename') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t: $t } = useI18n()

const props = defineProps<{
  sessionId: string
}>()

interface FileInfo {
  filename: string
  isDirectory: boolean
  size: number
  modifyTime: number
}

const currentPath = ref('/')
const files = ref<FileInfo[]>([])
const loading = ref(false)
const showNewFolderDialog = ref(false)
const newFolderName = ref('')

// Context Menu state
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const selectedFile = ref<FileInfo | null>(null)

// Delete Dialog state
const showDeleteDialog = ref(false)

// Rename Dialog state
const showRenameDialog = ref(false)
const newFileName = ref('')

onMounted(async () => {
  await loadFiles()
})

async function loadFiles() {
  loading.value = true
  try {
    // TODO: Call IPC to get SFTP file list
    const result = await window.ipcRenderer.invoke('sftp:list', props.sessionId, currentPath.value)
    files.value = result || []
  } catch (error) {
    console.error('Failed to load files:', error)
    files.value = []
  } finally {
    loading.value = false
  }
}

function refreshFiles() {
  loadFiles()
}

function goUp() {
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  currentPath.value = '/' + parts.join('/')
  loadFiles()
}

function handleFileClick(file: FileInfo) {
  if (file.isDirectory) {
    currentPath.value = currentPath.value.endsWith('/')
      ? currentPath.value + file.filename
      : currentPath.value + '/' + file.filename
    loadFiles()
  }
}

function showFileContextMenu(event: MouseEvent, file: FileInfo) {
  event.preventDefault()
  selectedFile.value = file
  showContextMenu.value = false // Close any open menu first
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  showContextMenu.value = true
}

async function downloadFile(file: FileInfo) {
  showContextMenu.value = false
  try {
    const remotePath = `${currentPath.value}/${file.filename}`.replace('//', '/')
    await window.ipcRenderer.invoke('sftp:download', props.sessionId, remotePath)
    // TODO: Show success message
  } catch (error) {
    console.error('Download failed:', error)
  }
}

async function uploadFile() {
  try {
    // TODO: Open file picker and upload
    console.log('Upload to:', currentPath.value)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}

async function createFolder() {
  if (!newFolderName.value) return

  try {
    const newPath = `${currentPath.value}/${newFolderName.value}`.replace('//', '/')
    await window.ipcRenderer.invoke('sftp:mkdir', props.sessionId, newPath)
    showNewFolderDialog.value = false
    newFolderName.value = ''
    await loadFiles()
  } catch (error) {
    console.error('Create folder failed:', error)
  }
}

function deleteFile(file: FileInfo) {
  selectedFile.value = file
  showContextMenu.value = false
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!selectedFile.value) return

  try {
    const remotePath = `${currentPath.value}/${selectedFile.value.filename}`.replace('//', '/')
    await window.ipcRenderer.invoke('sftp:delete', props.sessionId, remotePath)
    showDeleteDialog.value = false
    selectedFile.value = null
    await loadFiles()
  } catch (error) {
    console.error('Delete failed:', error)
  }
}

function renameFile(file: FileInfo) {
  selectedFile.value = file
  showContextMenu.value = false
  newFileName.value = file.filename
  showRenameDialog.value = true
}

async function confirmRename() {
  if (!selectedFile.value || !newFileName.value) return
  if (newFileName.value === selectedFile.value.filename) {
    showRenameDialog.value = false
    return
  }

  try {
    const oldPath = `${currentPath.value}/${selectedFile.value.filename}`.replace('//', '/')
    const newPath = `${currentPath.value}/${newFileName.value}`.replace('//', '/')
    await window.ipcRenderer.invoke('sftp:rename', props.sessionId, oldPath, newPath)
    showRenameDialog.value = false
    selectedFile.value = null
    await loadFiles()
  } catch (error) {
    console.error('Rename failed:', error)
  }
}

function getFileIcon(file: FileInfo) {
  if (file.isDirectory) return 'mdi-folder'
  const ext = file.filename.split('.').pop()?.toLowerCase()

  const iconMap: Record<string, string> = {
    txt: 'mdi-file-document',
    js: 'mdi-language-javascript',
    ts: 'mdi-language-typescript',
    json: 'mdi-code-json',
    md: 'mdi-language-markdown',
    png: 'mdi-file-image',
    jpg: 'mdi-file-image',
    jpeg: 'mdi-file-image',
    pdf: 'mdi-file-pdf-box',
    zip: 'mdi-folder-zip',
    tar: 'mdi-folder-zip',
    gz: 'mdi-folder-zip',
  }

  return iconMap[ext || ''] || 'mdi-file'
}

function getFileColor(file: FileInfo) {
  if (file.isDirectory) return 'amber'
  return 'grey'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
</script>

<style scoped>
.file-item {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.file-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
