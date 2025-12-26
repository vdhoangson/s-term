<template>
  <div
    v-if="sessions.length > 0"
    class="d-flex align-center flex-grow-1 mx-4"
    style="overflow: hidden"
  >
    <!-- Session Tabs -->
    <v-tabs
      :model-value="activeSessionId"
      density="compact"
      show-arrows
      variant="flat"
      class="flex-grow-1"
      @update:model-value="$emit('select-session', $event as string)"
    >
      <v-tab
        v-for="session in sessions"
        :key="session.id"
        :value="session.id"
        :color="activeSessionId === session.id ? 'white' : ''"
        :class="{ 'opacity-70': activeSessionId !== session.id }"
      >
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
          :color="monitoringEnabled ? 'white' : 'white'"
          :variant="monitoringEnabled ? 'flat' : 'text'"
          size="small"
          class="mr-1"
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
          :color="sftpSidebarOpen ? 'amber' : 'white'"
          :variant="sftpSidebarOpen ? 'flat' : 'text'"
          size="small"
          class="mr-2"
          @click="$emit('toggle-sftp')"
        />
      </template>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ISession } from '@/types/session'
import { computed } from 'vue'

const props = defineProps<{
  sessions: ISession[]
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
