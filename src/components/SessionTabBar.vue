<template>
  <v-toolbar
    v-if="sessions.length > 0"
    color="grey-darken-4"
    class="d-flex align-center px-2"
    height="40"
  >
    <!-- Session Tabs -->
    <v-btn
      v-for="session in sessions"
      :key="session.id"
      :variant="activeSessionId === session.id ? 'tonal' : 'text'"
      :color="activeSessionId === session.id ? 'primary' : 'grey'"
      size="small"
      class="text-none mx-1"
      @click="$emit('select-session', session.id)"
    >
      {{ session.title }}
      <v-icon
        end
        icon="mdi-close"
        size="x-small"
        @click.stop="$emit('close-session', session.id)"
      />
    </v-btn>

    <v-spacer />

    <!-- Monitoring Toggle -->
    <v-tooltip
      v-if="activeSession?.type === 'ssh'"
      :text="$t('monitoring.toggle')"
      location="bottom"
    >
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-bind="tooltipProps"
          :icon="monitoringEnabled ? 'mdi-monitor' : 'mdi-monitor-off'"
          :color="monitoringEnabled ? 'primary' : 'grey'"
          variant="text"
          size="small"
          @click="$emit('toggle-monitoring')"
        />
      </template>
    </v-tooltip>

    <!-- SFTP Sidebar Toggle -->
    <v-tooltip v-if="activeSession?.type === 'ssh'" :text="$t('sftp.title')" location="bottom">
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-bind="tooltipProps"
          :icon="sftpSidebarOpen ? 'mdi-folder-network' : 'mdi-folder-network-outline'"
          :color="sftpSidebarOpen ? 'amber' : 'grey'"
          variant="text"
          size="small"
          @click="$emit('toggle-sftp')"
        />
      </template>
    </v-tooltip>
  </v-toolbar>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Session {
  id: string
  title: string
  type: 'local' | 'ssh'
  connectionId?: string
  monitoringEnabled?: boolean
}

const props = defineProps<{
  sessions: Session[]
  activeSessionId: string | null
  sftpSidebarOpen: boolean
}>()

defineEmits<{
  'select-session': [id: string]
  'close-session': [id: string]
  'toggle-monitoring': []
  'toggle-sftp': []
}>()

const activeSession = computed(() => {
  return props.sessions.find(s => s.id === props.activeSessionId)
})

const monitoringEnabled = computed(() => {
  return activeSession.value?.monitoringEnabled || false
})
</script>
