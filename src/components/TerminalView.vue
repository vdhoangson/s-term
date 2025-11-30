<template>
  <div ref="terminalContainer" class="terminal-container"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

const props = defineProps<{
  sessionId: string
}>()

const terminalContainer = ref<HTMLElement | null>(null)
let terminal: Terminal | null = null

onMounted(() => {
  if (!terminalContainer.value) return

  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: '#1e1e1e',
    },
    rightClickSelectsWord: true,
    allowProposedApi: true,
  })

  // fitAddon = new FitAddon()
  // terminal.loadAddon(fitAddon)
  // terminal.open(terminalContainer.value)
  // fitAddon.fit()

  // Handle resizing
  window.addEventListener('resize', handleResize)

  // Initial resize to send dimensions to backend
  handleResize()

  // Data from terminal (user input) -> backend
  terminal.onData(data => {
    window.ipcRenderer.send('terminal:write', props.sessionId, data)
  })

  // Data from backend -> terminal
  window.ipcRenderer.on(`terminal:data:${props.sessionId}`, (_event, data) => {
    terminal?.write(data)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  terminal?.dispose()
  window.ipcRenderer.removeAllListeners(`terminal:data:${props.sessionId}`)
})

function handleResize() {
  if (!terminal) return
  // fitAddon.fit()
  const { cols, rows } = terminal
  window.ipcRenderer.send('terminal:resize', props.sessionId, cols, rows)
}
</script>
