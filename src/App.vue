<template>
  <v-app>
    <AppToolbar
      :sidebar-open="connectionSidebarOpen"
      @toggle-sidebar="connectionSidebarOpen = !connectionSidebarOpen"
    />

    <SessionSidebar v-model="connectionSidebarOpen" />
    <!-- Main Content Area - Scrollable -->
    <v-main>
      <!-- Right SFTP Sidebar -->
      <SessionSidePanel
        v-if="store.activeSessionId && activeSession?.type === 'ssh'"
        v-model="sftpSidebarOpen"
        :session-id="store.activeSessionId"
      />
      <!-- Terminal Views -->
      <template
        v-if="store.sessions.length > 0"
        v-for="session in store.sessions"
        :key="session.id"
      >
        <div v-show="store.activeSessionId === session.id" class="fill-height">
          <TerminalView :session-id="session.id" />
        </div>
      </template>
      <!-- Empty State -->
      <v-container v-else class="d-flex align-center justify-center fill-height">
        <div class="text-center text-grey">
          <v-icon icon="mdi-console" size="64" class="mb-4" />
          <div class="text-h5">{{ $t('session.noActiveSessions') }}</div>
          <div class="text-body-2 mt-2">{{ $t('session.selectFromSidebar') }}</div>
        </div>
      </v-container>
    </v-main>

    <!-- Tab Bar - Fixed at top -->
    <SessionTabBar
      :sessions="store.sessions"
      :active-session-id="store.activeSessionId"
      :sftp-sidebar-open="sftpSidebarOpen"
      @select-session="store.setActiveSession"
      @close-session="closeSession"
      @toggle-monitoring="toggleMonitoring"
      @toggle-sftp="sftpSidebarOpen = !sftpSidebarOpen"
    />

    <!-- Monitoring Panel (Footer) - Fixed at bottom -->
    <MonitoringPanel
      v-if="activeSession?.type === 'ssh'"
      :session-id="store.activeSessionId!"
      :session-name="activeSession.title"
      :enabled="monitoringEnabled"
    />

    <!-- Update Notification -->
    <UpdateNotification />

    <!-- About Modal -->
    <AboutModal v-model="aboutModalOpen" />

    <!-- Settings Modal -->
    <SettingsModal v-model="settingsModalOpen" />
  </v-app>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppToolbar from './components/layout/AppToolbar.vue'
import SessionSidebar from './components/layout/SessionSidebar.vue'
import SessionTabBar from './components/session/SessionTabBar.vue'
import TerminalView from './components/TerminalView.vue'
import SessionSidePanel from './components/session/SessionSidePanel.vue'
import MonitoringPanel from './components/layout/MonitoringPanel.vue'
import UpdateNotification from './components/layout/UpdateNotification.vue'
import { useTerminalStore } from './stores/terminal'
import AboutModal from './components/AboutModal.vue'
import SettingsModal from './components/session/SettingsModal.vue'
import { onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from './stores/settings'

const { t } = useI18n()
const store = useTerminalStore()
const settingsStore = useSettingsStore()

const connectionSidebarOpen = ref(true)
const sftpSidebarOpen = ref(true)

const activeSession = computed(() => {
  return store.sessions.find(s => s.id === store.activeSessionId)
})

const monitoringEnabled = computed(() => {
  return activeSession.value?.monitoringEnabled || false
})

function toggleMonitoring() {
  if (activeSession.value && store.activeSessionId) {
    const newValue = !monitoringEnabled.value
    store.setMonitoringEnabled(store.activeSessionId, newValue)
  }
}

function closeSession(id: string) {
  const session = store.sessions.find(s => s.id === id)
  const title = session?.title || 'this session'

  if (confirm(t('session.closeConfirm', { title }))) {
    window.ipcRenderer.send('terminal:kill', id)
    store.removeSession(id)
  }
}

const aboutModalOpen = ref(false)
const settingsModalOpen = ref(false)

onMounted(() => {
  // Load settings on startup
  settingsStore.loadSettings()

  // About modal listener
  if (window.electronAPI?.onOpenAbout) {
    const cleanup = window.electronAPI.onOpenAbout(() => {
      aboutModalOpen.value = true
    })
    onUnmounted(cleanup)
  }

  // Settings modal listener
  if (window.electronAPI?.onOpenSettings) {
    const cleanupSettings = window.electronAPI.onOpenSettings(() => {
      settingsModalOpen.value = true
    })
    onUnmounted(cleanupSettings)
  }
})
</script>
