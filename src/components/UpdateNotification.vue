<template>
  <v-snackbar v-model="show" :timeout="-1" location="top" color="primary">
    <div class="d-flex align-center">
      <v-icon class="mr-3">mdi-download</v-icon>
      <div class="flex-grow-1">
        <div class="text-subtitle-2 font-weight-bold">{{ title }}</div>
        <div class="text-caption">{{ message }}</div>
        <v-progress-linear
          v-if="showProgress"
          :model-value="progress"
          class="mt-2"
          color="white"
          height="4"
        ></v-progress-linear>
      </div>
    </div>

    <template #actions>
      <v-btn v-if="showDownloadButton" variant="text" @click="downloadUpdate"> Download </v-btn>
      <v-btn v-if="showInstallButton" variant="text" color="white" @click="installUpdate">
        Install & Restart
      </v-btn>
      <v-btn variant="text" @click="close"> Later </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const show = ref(false)
const title = ref('')
const message = ref('')
const progress = ref(0)
const showProgress = ref(false)
const showDownloadButton = ref(false)
const showInstallButton = ref(false)

let updateInfo: any = null
const cleanupFunctions: Array<() => void> = []

onMounted(() => {
  // Listen for update events
  const onUpdateChecking = window.electronAPI?.updater?.onUpdateChecking(() => {
    title.value = 'Checking for updates...'
    message.value = 'Please wait'
    show.value = true
    showDownloadButton.value = false
    showInstallButton.value = false
    showProgress.value = false
  })

  const onUpdateAvailable = window.electronAPI?.updater?.onUpdateAvailable((info: any) => {
    updateInfo = info
    title.value = 'Update Available!'
    message.value = `Version ${info.version} is available. Would you like to download it?`
    show.value = true
    showDownloadButton.value = true
    showInstallButton.value = false
    showProgress.value = false
  })

  const onUpdateNotAvailable = window.electronAPI?.updater?.onUpdateNotAvailable(() => {
    // Don't show notification for "no update available"
    show.value = false
  })

  const onUpdateDownloadProgress = window.electronAPI?.updater?.onUpdateDownloadProgress(
    (progressObj: any) => {
      title.value = 'Downloading Update...'
      message.value = `${Math.round(progressObj.percent)}% - ${(progressObj.transferred / 1024 / 1024).toFixed(2)} MB / ${(progressObj.total / 1024 / 1024).toFixed(2)} MB`
      progress.value = progressObj.percent
      show.value = true
      showDownloadButton.value = false
      showInstallButton.value = false
      showProgress.value = true
    }
  )

  const onUpdateDownloaded = window.electronAPI?.updater?.onUpdateDownloaded((info: any) => {
    updateInfo = info
    title.value = 'Update Ready!'
    message.value = `Version ${info.version} has been downloaded. Restart to install.`
    show.value = true
    showDownloadButton.value = false
    showInstallButton.value = true
    showProgress.value = false
  })

  const onUpdateError = window.electronAPI?.updater?.onUpdateError((error: string) => {
    title.value = 'Update Error'
    message.value = error
    show.value = true
    showDownloadButton.value = false
    showInstallButton.value = false
    showProgress.value = false
  })

  // Store cleanup functions
  if (onUpdateChecking) cleanupFunctions.push(onUpdateChecking)
  if (onUpdateAvailable) cleanupFunctions.push(onUpdateAvailable)
  if (onUpdateNotAvailable) cleanupFunctions.push(onUpdateNotAvailable)
  if (onUpdateDownloadProgress) cleanupFunctions.push(onUpdateDownloadProgress)
  if (onUpdateDownloaded) cleanupFunctions.push(onUpdateDownloaded)
  if (onUpdateError) cleanupFunctions.push(onUpdateError)
})

onBeforeUnmount(() => {
  // Cleanup all listeners
  cleanupFunctions.forEach(cleanup => cleanup())
})

function downloadUpdate() {
  window.electronAPI?.updater?.downloadUpdate()
  showDownloadButton.value = false
}

function installUpdate() {
  window.electronAPI?.updater?.quitAndInstall()
}

function close() {
  show.value = false
}
</script>
