<template>
  <v-bottom-navigation v-if="enabled" grow>
    <!-- Session Name -->
    <v-btn prepend-icon="mdi-server"> {{ sessionName }} </v-btn>

    <!-- CPU -->
    <v-btn prepend-icon="mdi-cpu-64-bit"> {{ metrics.cpu }}% </v-btn>

    <!-- RAM -->
    <v-btn prepend-icon="mdi-memory">
      {{ metrics.ramUsed.toFixed(2) }} / {{ metrics.ramTotal.toFixed(2) }} GB
    </v-btn>

    <!-- Network Upload -->
    <v-btn prepend-icon="mdi-upload"> {{ metrics.networkUp.toFixed(2) }} Mb/s </v-btn>

    <!-- Network Download -->
    <v-btn prepend-icon="mdi-download"> {{ metrics.networkDown.toFixed(2) }} Mb/s </v-btn>

    <!-- Uptime -->
    <v-btn prepend-icon="mdi-calendar-clock">
      {{ metrics.uptime }}
    </v-btn>

    <!-- Username -->
    <v-btn prepend-icon="mdi-account">
      {{ metrics.username }}
    </v-btn>

    <!-- Disk -->
    <v-btn prepend-icon="mdi-harddisk"> {{ metrics.diskUsage }}% </v-btn>
  </v-bottom-navigation>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  sessionId: string
  sessionName: string
  enabled: boolean
}>()

interface Metrics {
  cpu: number
  ramUsed: number
  ramTotal: number
  networkUp: number
  networkDown: number
  uptime: string
  diskUsage: number
  username: string
}

const metrics = ref<Metrics>({
  cpu: 0,
  ramUsed: 0,
  ramTotal: 0,
  networkUp: 0,
  networkDown: 0,
  uptime: 'N/A',
  diskUsage: 0,
  username: 'unknown',
})

const loading = ref(false)
let refreshInterval: NodeJS.Timeout | null = null

onMounted(() => {
  if (props.enabled) {
    startMonitoring()
  }
})

onUnmounted(() => {
  stopMonitoring()
})

watch(
  () => props.enabled,
  newValue => {
    if (newValue) {
      startMonitoring()
    } else {
      stopMonitoring()
    }
  }
)

function startMonitoring() {
  fetchMetrics()
  refreshInterval = setInterval(() => {
    fetchMetrics()
  }, 3000) // Refresh every 3 seconds
}

function stopMonitoring() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

async function fetchMetrics() {
  loading.value = true
  try {
    const result = await window.ipcRenderer.invoke('monitoring:getMetrics', props.sessionId)
    if (result) {
      metrics.value = result
    }
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
  } finally {
    loading.value = false
  }
}

function getUsageClass(usage: number): string {
  if (usage > 80) return 'usage-high'
  if (usage > 60) return 'usage-medium'
  return 'usage-normal'
}
</script>
