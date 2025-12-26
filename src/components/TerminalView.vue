<template>
  <div class="position-relative fill-height">
    <div ref="terminalContainer" class="terminal-container fill-height"></div>

    <v-overlay
      v-model="showOverlay"
      contained
      class="align-center justify-center"
      persistent
      scrim="#000000"
      opacity="0.5"
    >
      <div class="text-center">
        <v-icon icon="mdi-lan-disconnect" color="error" size="64" class="mb-4" />
        <div class="text-h5 text-white mb-2 font-weight-bold">Connection Lost</div>
        <div class="text-body-1 text-medium-emphasis">
          Press <kbd class="px-2 py-1 rounded bg-grey-darken-3">R</kbd> to reconnect<br />
          <div class="mt-2">
            Press <kbd class="px-2 py-1 rounded bg-grey-darken-3">Esc</kbd> to exit
          </div>
        </div>
      </div>
    </v-overlay>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useSnackbarStore } from '@/stores/snackbar'

const props = defineProps<{
  sessionId: string
  isActive?: boolean
}>()

const emit = defineEmits<{
  reconnect: []
  close: []
}>()

const terminalContainer = ref<HTMLElement | null>(null)
const isConnected = ref(true)
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null

const showOverlay = computed(() => !isConnected.value)
const snackbar = useSnackbarStore()

const handleKeydown = (e: KeyboardEvent) => {
  if (isConnected.value || !props.isActive) return

  if (e.key.toLowerCase() === 'r') {
    emit('reconnect')
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)

  if (!terminalContainer.value) return

  terminal = new Terminal({
    cols: 80,
    rows: 24,
    convertEol: true,
    cursorBlink: true,
    scrollback: 5000,
    disableStdin: false,
    fontSize: 14,
    lineHeight: 1.2,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: '#1e1e1e',
    },
    rightClickSelectsWord: true,
    allowProposedApi: true,
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)

  terminal.open(terminalContainer.value)

  resizeObserver = new ResizeObserver(() => {
    if (!fitAddon || !terminal) return
    fitAddon.fit()
  })

  resizeObserver.observe(terminalContainer.value)

  // Initial fit
  setTimeout(() => {
    fitAddon?.fit()
  }, 250)

  // Copy on selection
  terminal.onSelectionChange(() => {
    const selection = terminal?.getSelection()
    if (selection) {
      navigator.clipboard.writeText(selection)
      snackbar.success('Copied to clipboard')
    }
  })

  // Data from terminal (user input) -> backend
  terminal.onData(data => {
    if (!isConnected.value) return
    window.electronAPI.session.write(props.sessionId, data)
  })

  terminal.onResize(({ cols, rows }) => {
    window.electronAPI.session.resize(props.sessionId, cols, rows)
  })

  // Data from backend -> terminal
  const cleanupData = window.electronAPI.session.onData(props.sessionId, data => {
    terminal?.write(data)
    // Send ack for flow control if it's a local session (optional but good)
    window.ipcRenderer.send('session:ack-data', props.sessionId, data.length)
  })

  // Listen for session exit
  let cleanupExit: (() => void) | undefined
  if (window.electronAPI.session.onExit) {
    cleanupExit = window.electronAPI.session.onExit(props.sessionId, () => {
      isConnected.value = false
    })
  }

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown)
    cleanupData()
    if (cleanupExit) cleanupExit()
    terminal?.dispose()
  })
})
</script>
