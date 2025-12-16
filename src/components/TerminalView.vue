<template>
  <div ref="terminalContainer" class="terminal-container fill-height"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const props = defineProps<{
  sessionId: string
}>()

const terminalContainer = ref<HTMLElement | null>(null)
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
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

    const { cols, rows } = terminal
    window.ipcRenderer.send('terminal:resize', props.sessionId, cols, rows)
  })

  resizeObserver.observe(terminalContainer.value)

  // Initial fit
  fitAddon.fit()

  // Data from terminal (user input) -> backend
  terminal.onData(data => {
    window.ipcRenderer.send('terminal:write', props.sessionId, data)
  })

  terminal.onResize(({ cols, rows }) => {
    window.ipcRenderer.send('terminal:resize', props.sessionId, cols, rows)
  })

  // Data from backend -> terminal
  window.ipcRenderer.on(`terminal:data:${props.sessionId}`, (_event, data) => {
    terminal?.write(data)
  })
})

onBeforeUnmount(() => {
  terminal?.dispose()
  window.ipcRenderer.removeAllListeners(`terminal:data:${props.sessionId}`)
})
</script>
