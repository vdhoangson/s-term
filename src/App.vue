<template>
  <v-app>
    <div class="st-shell">
      <AppToolbar
        :sessions="tabSessions"
        :active-session-id="store.activeSessionId"
        @select-session="store.setActiveSession"
        @close-session="closeTab"
      />

      <div class="st-workspace">
        <SessionSidebar v-model="connectionSidebarOpen" />

        <main class="st-blocks">
          <!-- Terminal block: every tab's pane layout stays mounted, only the active tab is shown -->
          <section
            v-if="store.sessions.length > 0"
            class="st-block st-block--focused st-terminal-block"
            :aria-label="activeSession?.title"
          >
            <div class="st-block-header">
              <v-icon icon="mdi-console" size="16" class="st-block-title--gold" />
              <span class="st-block-title st-block-title--gold">{{ activeSession?.title }}</span>
              <span class="st-chip">
                <span v-if="isSsh" class="st-chip__dot"></span>
                {{ isSsh ? `ssh · ${activeSession?.config?.host}` : 'local' }}
              </span>
              <span class="st-spacer"></span>
              <button
                v-if="activeSession"
                class="st-icon-btn"
                :aria-label="$t('common.close')"
                :title="$t('common.close')"
                @click="closeSession(activeSession.id)"
              >
                <v-icon icon="mdi-close" size="16" />
              </button>
            </div>

            <div class="st-terminal-body">
              <PaneLayout
                v-for="tab in store.tabs"
                v-show="store.activeTabId === tab.id"
                :key="tab.id"
                :node="tab.root"
                :tab="tab"
                @reconnect="handleReconnect"
                @close="closeSession"
              />
            </div>
          </section>

          <!-- Empty State -->
          <div v-else class="st-empty">
            <v-icon icon="mdi-console" size="64" class="mb-4" />
            <div class="text-h5">{{ $t('session.noActiveSessions') }}</div>
            <div class="text-body-2 mt-2">{{ $t('session.selectFromSidebar') }}</div>
          </div>

          <!-- Right column: SFTP + monitoring for SSH sessions -->
          <div v-if="showSidePanels" class="st-side-col">
            <SessionSidePanel
              v-if="sftpSidebarOpen"
              v-model="sftpSidebarOpen"
              :session-id="store.activeSessionId!"
            />
            <MonitoringPanel
              v-if="monitoringEnabled"
              :session-id="store.activeSessionId!"
              :session-name="activeSession!.title"
              @close="store.setMonitoringEnabled(store.activeSessionId!, false)"
            />
          </div>
        </main>

        <WidgetBar
          :hosts-open="connectionSidebarOpen"
          :sftp-open="sftpSidebarOpen"
          :monitoring-open="monitoringEnabled"
          :ssh-active="isSsh"
          @toggle-hosts="connectionSidebarOpen = !connectionSidebarOpen"
          @toggle-sftp="sftpSidebarOpen = !sftpSidebarOpen"
          @toggle-monitoring="toggleMonitoring"
          @open-settings="settingsModalOpen = true"
          @open-about="aboutModalOpen = true"
        />
      </div>
    </div>

    <!-- Update Notification -->
    <UpdateNotification />

    <!-- About Modal -->
    <AboutModal v-model="aboutModalOpen" />

    <!-- Settings Modal -->
    <SettingsModal v-model="settingsModalOpen" />

    <!-- Global Snackbar -->
    <AppSnackbar />
  </v-app>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppToolbar from './components/layout/AppToolbar.vue'
import SessionSidebar from './components/layout/SessionSidebar.vue'
import WidgetBar from './components/layout/WidgetBar.vue'
import PaneLayout from './components/PaneLayout.vue'
import SessionSidePanel from './components/session/SessionSidePanel.vue'
import MonitoringPanel from './components/layout/MonitoringPanel.vue'
import UpdateNotification from './components/layout/UpdateNotification.vue'
import { leafIds } from './stores/layout'
import { useTerminalStore } from './stores/terminal'
import AboutModal from './components/AboutModal.vue'
import SettingsModal from './components/session/SettingsModal.vue'
import { onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from './stores/settings'
import AppSnackbar from './components/common/AppSnackbar.vue'

const { t } = useI18n()
const store = useTerminalStore()
const settingsStore = useSettingsStore()

const connectionSidebarOpen = ref(true)
const sftpSidebarOpen = ref(true)

const activeSession = computed(() => {
  return store.sessions.find(s => s.id === store.activeSessionId)
})

// One tab button per tab, titled after its active pane
const tabSessions = computed(() =>
  store.tabs.flatMap(tab => store.sessions.filter(s => s.id === tab.activePaneId))
)

const isSsh = computed(() => activeSession.value?.type === 'ssh')

const monitoringEnabled = computed(() => {
  return activeSession.value?.monitoringEnabled || false
})

const showSidePanels = computed(
  () => isSsh.value && (sftpSidebarOpen.value || monitoringEnabled.value)
)

function toggleMonitoring() {
  if (activeSession.value && store.activeSessionId) {
    const newValue = !monitoringEnabled.value
    store.setMonitoringEnabled(store.activeSessionId, newValue)
  }
}

async function handleReconnect(sessionId: string) {
  const session = store.sessions.find(s => s.id === sessionId)
  if (!session || !session.config) return

  try {
    // Kill old session
    window.electronAPI.session.kill(sessionId)

    // Create new session with same config
    const newId = await window.electronAPI.session.create(session.config)

    // Update in store
    store.updateSessionId(sessionId, newId)
  } catch (error) {
    console.error('Failed to reconnect:', error)
  }
}

function closeSession(id: string) {
  const session = store.sessions.find(s => s.id === id)
  const title = session?.title || 'this session'

  if (confirm(t('session.closeConfirm', { title }))) {
    window.electronAPI.session.kill(id)
    store.removeSession(id)
  }
}

// Closes every pane of the tab that holds this session
function closeTab(id: string) {
  const tab = store.tabs.find(tb => leafIds(tb.root).includes(id))
  if (!tab) return
  const title = store.sessions.find(s => s.id === id)?.title || 'this session'

  if (confirm(t('session.closeConfirm', { title }))) {
    leafIds(tab.root).forEach(sessionId => {
      window.electronAPI.session.kill(sessionId)
      store.removeSession(sessionId)
    })
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

<style scoped>
.st-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: rgb(var(--v-theme-background));
  color: var(--st-text);
  font-size: 13px;
}

.st-workspace {
  display: flex;
  flex: 1 1 0;
  gap: 8px;
  min-height: 0;
  padding: 8px;
}

.st-blocks {
  display: flex;
  flex: 1 1 0;
  gap: 8px;
  min-width: 0;
  min-height: 0;
}

.st-terminal-block {
  flex: 3 1 0;
}

.st-terminal-body {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
}

.st-side-col {
  display: flex;
  flex: 2 1 0;
  flex-direction: column;
  gap: 8px;
  min-width: 320px;
  min-height: 0;
}

.st-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  height: 20px;
  padding: 0 8px;
  border: 1px solid var(--st-chip-border);
  border-radius: 10px;
  background: var(--st-chip-bg);
  color: var(--st-chip-text);
  font-family: var(--st-font-mono);
  font-size: 11px;
  white-space: nowrap;
}

.st-chip__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--st-ok);
}

.st-empty {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  border: 1px dashed var(--st-border);
  border-radius: 10px;
  color: var(--st-muted);
  text-align: center;
}

.st-empty .v-icon {
  color: var(--st-gold);
  opacity: 0.6;
}
</style>
