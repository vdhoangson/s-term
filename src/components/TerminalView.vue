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
import { Terminal, type IDisposable, type ITheme } from '@xterm/xterm'
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
import { useTerminalStore } from '@/stores/terminal'
import { disconnected, terminalCache, type ITerminalEntry } from '@/stores/terminalCache'

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
const isConnected = computed(() => !disconnected.has(props.sessionId))
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let searchAddon: SearchAddon | null = null
let resizeObserver: ResizeObserver | null = null
let selectionListener: IDisposable | null = null
let fitFrame = 0

const showOverlay = computed(() => !isConnected.value)
const snackbar = useSnackbarStore()
const terminalStore = useTerminalStore()
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

// Created once per session; the terminal is re-parented (not recreated) when the pane tree reshapes
function createEntry(container: HTMLElement): ITerminalEntry {
  const sessionId = props.sessionId
  const term = new Terminal({
    cols: 80,
    rows: 24,
    disableStdin: false,
    ...terminalSettings(),
    theme: currentTerminalTheme(),
    rightClickSelectsWord: true,
    allowProposedApi: true,
  })

  const fit = new FitAddon()
  term.loadAddon(fit)
  term.loadAddon(new Unicode11Addon())
  term.unicode.activeVersion = '11'
  term.loadAddon(new ImageAddon())
  const search = new SearchAddon()
  term.loadAddon(search)

  term.open(container)

  // Ligatures first: webgl must be loaded after it to pick up the font features
  if (settings.ligatures) {
    try {
      term.loadAddon(new LigaturesAddon())
    } catch (error) {
      console.warn('Ligatures addon unavailable:', error)
    }
  }

  try {
    const webgl = new WebglAddon()
    // On context loss xterm falls back to the DOM renderer
    webgl.onContextLoss(() => webgl.dispose())
    term.loadAddon(webgl)
  } catch (error) {
    console.warn('WebGL renderer unavailable, using DOM renderer:', error)
  }

  // Data from terminal (user input) -> backend
  term.onData(data => {
    if (disconnected.has(sessionId)) return
    window.electronAPI.session.write(sessionId, data)
  })

  term.onResize(({ cols, rows }) => {
    window.electronAPI.session.resize(sessionId, cols, rows)
  })

  // Data from backend -> terminal (stays subscribed while the view is detached)
  const cleanups = [
    window.electronAPI.session.onData(sessionId, data => {
      term.write(data)
      // Send ack for flow control if it's a local session (optional but good)
      window.electronAPI.session.ack(sessionId, encoder.encode(data).length)
    }),
  ]

  // Listen for session exit
  if (window.electronAPI.session.onExit) {
    cleanups.push(window.electronAPI.session.onExit(sessionId, () => disconnected.add(sessionId)))
  }

  const entry = { terminal: term, fitAddon: fit, searchAddon: search, cleanups }
  terminalCache.set(sessionId, entry)
  return entry
}

// Closest pane in the arrow direction, by comparing pane rects
function neighbourPaneId(arrow: string) {
  const from = terminalContainer.value?.closest('[data-pane-id]')?.getBoundingClientRect()
  if (!from) return undefined
  const horizontal = arrow === 'ArrowLeft' || arrow === 'ArrowRight'
  let best: { id: string; gap: number } | undefined
  for (const el of document.querySelectorAll<HTMLElement>('[data-pane-id]')) {
    const id = el.dataset.paneId
    const r = el.getBoundingClientRect()
    // Panes of hidden tabs have no size
    if (!id || id === props.sessionId || !r.width) continue
    const overlaps = horizontal
      ? r.top < from.bottom && r.bottom > from.top
      : r.left < from.right && r.right > from.left
    const gaps = {
      ArrowLeft: from.left - r.right,
      ArrowRight: r.left - from.right,
      ArrowUp: from.top - r.bottom,
      ArrowDown: r.top - from.bottom,
    }
    const gap = gaps[arrow as keyof typeof gaps]
    // Splitters leave a few px between panes
    if (overlaps && gap >= -1 && (!best || gap < best.gap)) best = { id, gap }
  }
  return best?.id
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)

  const container = terminalContainer.value
  if (!container) return

  let entry = terminalCache.get(props.sessionId)
  if (entry?.terminal.element) {
    container.appendChild(entry.terminal.element)
  } else {
    entry = createEntry(container)
  }
  terminal = entry.terminal
  fitAddon = entry.fitAddon
  searchAddon = entry.searchAddon

  terminal.attachCustomKeyEventHandler(e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
      if (e.type === 'keydown') openSearch()
      return false
    }
    // Ctrl+Shift+D split right, E split down, W close pane
    const key = e.key.toLowerCase()
    if (e.ctrlKey && e.shiftKey && (key === 'd' || key === 'e' || key === 'w')) {
      if (e.type === 'keydown') {
        if (key === 'w') emit('close')
        else terminalStore.splitPane(props.sessionId, key === 'd' ? 'row' : 'col')
      }
      return false
    }
    // Alt+Arrow moves focus; with no neighbour the key still reaches the shell
    if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && e.key.startsWith('Arrow')) {
      const id = neighbourPaneId(e.key)
      if (id) {
        if (e.type === 'keydown') terminalStore.focusPane(id)
        return false
      }
    }
    return true
  })

  resizeObserver = new ResizeObserver(() => {
    if (fitFrame) return
    fitFrame = requestAnimationFrame(() => {
      fitFrame = 0
      fitAddon?.fit()
    })
  })

  resizeObserver.observe(container)

  // Initial fit
  setTimeout(() => {
    fitAddon?.fit()
  }, 250)

  // Copy on selection
  selectionListener = terminal.onSelectionChange(() => {
    // Search selects each match, don't copy those
    if (searchOpen.value) return
    const selection = terminal?.getSelection()
    if (selection) {
      navigator.clipboard.writeText(selection)
      snackbar.success('Copied to clipboard')
    }
  })

  if (props.isActive) terminal.focus()
})

// Post flush: a pane of a just-shown tab is only focusable after v-show applied
watch(
  () => props.isActive,
  active => {
    if (active) terminal?.focus()
  },
  { flush: 'post' }
)

// Only detach: the terminal and its IPC listeners live on in terminalCache until disposeTerminal
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  selectionListener?.dispose()
  resizeObserver?.disconnect()
  cancelAnimationFrame(fitFrame)
  terminal = null
  fitAddon = null
  searchAddon = null
})
</script>
