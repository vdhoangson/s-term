<template>
  <v-app>
    <AppToolbar
      :sidebar-open="connectionSidebarOpen"
      @toggle-sidebar="connectionSidebarOpen = !connectionSidebarOpen"
    />

    <SessionSidebar v-model="connectionSidebarOpen" />

    <v-main class="d-flex flex-column" style="overflow: hidden">
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

      <!-- Main Content Area - Scrollable -->
      <!-- Terminal Views -->
      <template v-for="session in store.sessions" :key="session.id">
        <div v-show="store.activeSessionId === session.id" class="fill-height">
          <TerminalView :session-id="session.id" />
        </div>
      </template>

      <!-- Empty State -->
      <v-container
        v-if="store.sessions.length === 0"
        class="fill-height d-flex align-center justify-center"
      >
        <div class="text-center text-grey">
          <v-icon icon="mdi-console" size="64" class="mb-4" />
          <div class="text-h5">{{ $t('session.noActiveSessions') }}</div>
          <div class="text-body-2 mt-2">{{ $t('session.selectFromSidebar') }}</div>
        </div>
      </v-container>

      <!-- Monitoring Panel (Footer) - Fixed at bottom -->
      <MonitoringPanel
        v-if="activeSession?.type === 'ssh'"
        :session-id="store.activeSessionId!"
        :session-name="activeSession.title"
        :enabled="monitoringEnabled"
      />
    </v-main>

    <!-- Right SFTP Sidebar -->
    <SessionSidePanel
      v-if="store.activeSessionId && activeSession?.type === 'ssh'"
      v-model="sftpSidebarOpen"
      :session-id="store.activeSessionId"
    />

    <!-- Update Notification -->
    <UpdateNotification />
  </v-app>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppToolbar from './components/layout/AppToolbar.vue'
import SessionSidebar from './components/SessionSidebar.vue'
import SessionTabBar from './components/SessionTabBar.vue'
import TerminalView from './components/TerminalView.vue'
import SessionSidePanel from './components/SessionSidePanel.vue'
import MonitoringPanel from './components/layout/MonitoringPanel.vue'
import UpdateNotification from './components/UpdateNotification.vue'
import { useTerminalStore } from './stores/terminal'

const { t } = useI18n()
const store = useTerminalStore()

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
</script>
