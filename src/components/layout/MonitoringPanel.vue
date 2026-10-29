<template>
  <section class="st-block st-monitor" :aria-label="$t('monitoring.title')">
    <div class="st-block-header">
      <v-icon icon="mdi-pulse" size="16" class="st-block-icon" />
      <span class="st-block-title">{{ $t('monitoring.title') }}</span>
      <span class="st-block-sub">{{ sessionName }}</span>
      <span class="st-spacer"></span>
      <button
        class="st-icon-btn"
        :aria-label="$t('common.close')"
        :title="$t('common.close')"
        @click="$emit('close')"
      >
        <v-icon icon="mdi-close" size="16" />
      </button>
    </div>

    <div class="st-monitor__body">
      <div class="st-monitor__cpu">
        <span class="st-monitor__label">{{ $t('monitoring.metrics.cpu') }} · 60s</span>
        <span class="st-monitor__cpu-value">{{ metrics.cpu }}%</span>
      </div>

      <svg
        class="st-spark"
        viewBox="0 0 300 64"
        preserveAspectRatio="none"
        role="img"
        :aria-label="$t('monitoring.metrics.cpu')"
      >
        <line
          v-for="y in [16, 32, 48]"
          :key="y"
          class="st-spark__grid"
          x1="0"
          x2="300"
          :y1="y"
          :y2="y"
        />
        <polygon v-if="sparkline.area" class="st-spark__area" :points="sparkline.area" />
        <polyline v-if="sparkline.line" class="st-spark__line" :points="sparkline.line" />
      </svg>

      <div class="st-monitor__grid">
        <div class="st-monitor__meter">
          <div class="st-monitor__row">
            <span class="st-monitor__muted">{{ $t('monitoring.metrics.ram') }}</span>
            <span>{{ metrics.ramUsed.toFixed(1) }} / {{ metrics.ramTotal.toFixed(1) }} GB</span>
          </div>
          <div
            class="st-meter"
            role="meter"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="ramPercent"
            :aria-label="$t('monitoring.metrics.ram')"
          >
            <i :style="{ width: ramPercent + '%' }"></i>
          </div>
        </div>
        <div class="st-monitor__meter">
          <div class="st-monitor__row">
            <span class="st-monitor__muted">{{ $t('monitoring.metrics.disk') }}</span>
            <span>{{ metrics.diskUsage }}%</span>
          </div>
          <div
            class="st-meter"
            role="meter"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="metrics.diskUsage"
            :aria-label="$t('monitoring.metrics.disk')"
          >
            <i :style="{ width: Math.min(metrics.diskUsage, 100) + '%' }"></i>
          </div>
        </div>

        <div class="st-monitor__stat">
          <span class="st-monitor__muted">{{ $t('monitoring.metrics.network') }} ↓</span>
          <span class="st-monitor__value">{{ metrics.networkDown.toFixed(2) }} Mb/s</span>
        </div>
        <div class="st-monitor__stat">
          <span class="st-monitor__muted">{{ $t('monitoring.metrics.network') }} ↑</span>
          <span class="st-monitor__value">{{ metrics.networkUp.toFixed(2) }} Mb/s</span>
        </div>
        <div class="st-monitor__stat">
          <span class="st-monitor__muted">{{ $t('monitoring.metrics.uptime') }}</span>
          <span class="st-monitor__value">{{ metrics.uptime }}</span>
        </div>
        <div class="st-monitor__stat">
          <span class="st-monitor__muted">{{ $t('monitoring.metrics.username') }}</span>
          <span class="st-monitor__value">{{ metrics.username }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  sessionId: string
  sessionName: string
}>()

defineEmits<{
  close: []
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

const MAX_SAMPLES = 20 // 20 samples x 3s polling = 60s
const cpuHistory = ref<number[]>([])

const ramPercent = computed(() =>
  metrics.value.ramTotal > 0
    ? Math.min(100, Math.round((metrics.value.ramUsed / metrics.value.ramTotal) * 100))
    : 0
)

// Points for the 300x64 sparkline viewBox; newest sample sits at the right edge.
const sparkline = computed(() => {
  const n = cpuHistory.value.length
  if (n < 2) return { line: '', area: '' }
  const step = 300 / (MAX_SAMPLES - 1)
  const points = cpuHistory.value.map((v, i) => [
    300 - (n - 1 - i) * step,
    62 - Math.min(Math.max(v, 0), 100) * 0.6,
  ])
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return { line, area: `${points[0][0].toFixed(1)},64 ${line} 300,64` }
})

let refreshInterval: NodeJS.Timeout | null = null

onMounted(() => {
  startMonitoring()
})

onUnmounted(() => {
  stopMonitoring()
})

// Panel instance is reused when switching between SSH sessions: drop the other session's history.
watch(
  () => props.sessionId,
  () => {
    cpuHistory.value = []
    fetchMetrics()
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
  try {
    const result = await window.electronAPI.monitoring.getMetrics(props.sessionId)
    if (result) {
      metrics.value = result
      cpuHistory.value = [...cpuHistory.value, Number(result.cpu) || 0].slice(-MAX_SAMPLES)
    }
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
  }
}
</script>

<style scoped>
.st-monitor {
  flex: 1 1 0;
}

.st-monitor__body {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 12px 14px;
  overflow-y: auto;
}

.st-monitor__cpu {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.st-monitor__label {
  color: var(--st-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

.st-monitor__cpu-value {
  color: var(--st-gold-text);
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.st-spark {
  display: block;
  flex: 0 0 64px;
  width: 100%;
  height: 64px;
}

.st-spark__grid {
  stroke: var(--st-track);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.st-spark__area {
  fill: var(--st-spark-fill);
}

.st-spark__line {
  fill: none;
  stroke: var(--st-gold);
  stroke-width: 1.6;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.st-monitor__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  font-size: 12px;
}

.st-monitor__meter,
.st-monitor__stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.st-monitor__stat {
  gap: 2px;
}

.st-monitor__row {
  display: flex;
  justify-content: space-between;
  font-variant-numeric: tabular-nums;
}

.st-monitor__muted {
  color: var(--st-muted);
}

.st-monitor__value {
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.st-meter {
  height: 6px;
  border-radius: 3px;
  background: var(--st-track);
}

.st-meter > i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--st-meter);
}
</style>
