<template>
  <v-app-bar
    v-if="sessions.length > 0"
    :elevation="8"
    color="grey-darken-4"
    class="align-center"
    height="40"
  >
    <!-- Session Tabs -->
    <v-tabs
      :model-value="activeSessionId"
      density="compact"
      color="primary"
      class="flex-grow-1"
      @update:model-value="$emit('select-session', $event)"
    >
      <v-tab v-for="session in sessions" :key="session.id" :value="session.id" class="text-none">
        {{ session.title }}
        <v-icon
          end
          icon="mdi-close"
          size="x-small"
          class="ml-2"
          @click.stop="$emit('close-session', session.id)"
        />
      </v-tab>
    </v-tabs>

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
  </v-app-bar>
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
