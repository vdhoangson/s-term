<template>
  <div class="position-relative fill-height">
    <div ref="terminalContainer" class="terminal-container fill-height"></div>

    <TerminalSearch
      v-if="searchOpen && searchAddon"
      ref="searchRef"
      :addon="searchAddon"
      @close="closeSearch"
    />

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
import { onBeforeUnmount, onMounted, ref, computed, watch, nextTick } from 'vue'
import { useTheme } from 'vuetify'
import { Terminal, type ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { ImageAddon } from '@xterm/addon-image'
import { LigaturesAddon } from '@xterm/addon-ligatures'
import { SearchAddon } from '@xterm/addon-search'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import TerminalSearch from './TerminalSearch.vue'
import { useSettingsStore } from '@/stores/settings'
import { useSnackbarStore } from '@/stores/snackbar'

const encoder = new TextEncoder()

const props = defineProps<{
  sessionId: string
  isActive?: boolean
}>()

const emit = defineEmits<{
  reconnect: []
  close: []
}>()

const terminalThemes: Record<'dark' | 'light', ITheme> = {
  dark: {
    background: '#0D0D0E',
    foreground: '#D9D6CF',
    cursor: '#F2D27A',
    selectionBackground: 'rgba(212,175,55,0.3)',
  },
  light: {
    background: '#FDFCF8',
    foreground: '#2A2722',
    cursor: '#B8901F',
    selectionBackground: 'rgba(184,144,31,0.25)',
    // Default ANSI white/yellow are unreadable on a light background
    black: '#2A2722',
    red: '#B3261E',
    green: '#3D7A1E',
    yellow: '#8A6510',
    blue: '#2F5E8C',
    magenta: '#8E3B8E',
    cyan: '#1D7A82',
    white: '#6B665B',
    brightBlack: '#6B665B',
    brightRed: '#D32F2F',
    brightGreen: '#4E9A3A',
    brightYellow: '#B8901F',
    brightBlue: '#3F78B3',
    brightMagenta: '#A64CA6',
    brightCyan: '#2A9AA3',
    brightWhite: '#2A2722',
  },
}

const vuetifyTheme = useTheme()
const currentTerminalTheme = () =>
  terminalThemes[vuetifyTheme.global.name.value === 'light' ? 'light' : 'dark']

const terminalContainer = ref<HTMLElement | null>(null)
const isConnected = ref(true)
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let searchAddon: SearchAddon | null = null
let resizeObserver: ResizeObserver | null = null
let fitFrame = 0

const showOverlay = computed(() => !isConnected.value)
const snackbar = useSnackbarStore()
const settings = useSettingsStore()
const searchOpen = ref(false)
const searchRef = ref<InstanceType<typeof TerminalSearch> | null>(null)

const terminalSettings = () => ({
  fontFamily: settings.fontFamily,
  fontSize: settings.fontSize,
  lineHeight: settings.lineHeight,
  cursorStyle: settings.cursorStyle,
  cursorBlink: settings.cursorBlink,
  scrollback: settings.scrollback,
})

watch(terminalSettings, options => {
  if (!terminal) return
  Object.assign(terminal.options, options)
  fitAddon?.fit()
})

function openSearch() {
  searchOpen.value = true
  nextTick(() => searchRef.value?.focus())
}

function closeSearch() {
  searchOpen.value = false
  terminal?.focus()
}

watch(
  () => vuetifyTheme.global.name.value,
  () => {
    if (terminal) terminal.options.theme = currentTerminalTheme()
  }
)

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
    disableStdin: false,
    ...terminalSettings(),
    theme: currentTerminalTheme(),
    rightClickSelectsWord: true,
    allowProposedApi: true,
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new Unicode11Addon())
  terminal.unicode.activeVersion = '11'
  terminal.loadAddon(new ImageAddon())
  searchAddon = new SearchAddon()
  terminal.loadAddon(searchAddon)

  terminal.attachCustomKeyEventHandler(e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
      if (e.type === 'keydown') openSearch()
      return false
    }
    return true
  })

  terminal.open(terminalContainer.value)

  // Ligatures first: webgl must be loaded after it to pick up the font features
  if (settings.ligatures) {
    try {
      terminal.loadAddon(new LigaturesAddon())
    } catch (error) {
      console.warn('Ligatures addon unavailable:', error)
    }
  }

  try {
    const webgl = new WebglAddon()
    // On context loss xterm falls back to the DOM renderer
    webgl.onContextLoss(() => webgl.dispose())
    terminal.loadAddon(webgl)
  } catch (error) {
    console.warn('WebGL renderer unavailable, using DOM renderer:', error)
  }

  resizeObserver = new ResizeObserver(() => {
    if (fitFrame) return
    fitFrame = requestAnimationFrame(() => {
      fitFrame = 0
      fitAddon?.fit()
    })
  })

  resizeObserver.observe(terminalContainer.value)

  // Initial fit
  setTimeout(() => {
    fitAddon?.fit()
  }, 250)

  // Copy on selection
  terminal.onSelectionChange(() => {
    // Search selects each match, don't copy those
    if (searchOpen.value) return
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
    window.electronAPI.session.ack(props.sessionId, encoder.encode(data).length)
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
    resizeObserver?.disconnect()
    cancelAnimationFrame(fitFrame)
    terminal?.dispose()
    terminal = null
    fitAddon = null
    searchAddon = null
  })
})
</script>
