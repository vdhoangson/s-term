<template>
  <div ref="rootEl" class="position-relative fill-height">
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
      scrim="background"
      opacity="0.85"
    >
      <div class="terminal-overlay" role="alert">
        <v-icon icon="mdi-lan-disconnect" color="error" size="64" class="mb-4" />
        <div class="terminal-overlay__title">{{ $t('terminal.connectionLost') }}</div>
        <i18n-t
          keypath="terminal.reconnectHint"
          scope="global"
          tag="div"
          class="terminal-overlay__hint"
        >
          <template #key><kbd>R</kbd></template>
        </i18n-t>
        <i18n-t keypath="terminal.exitHint" scope="global" tag="div" class="terminal-overlay__hint">
          <template #key><kbd>Esc</kbd></template>
        </i18n-t>
      </div>
    </v-overlay>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
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

// xterm needs literal colors, so this is the only place hex lives. foreground/black mirror --st-text and
// brightBlack mirrors --st-muted; the rest are warm ANSI hues, all >= 4.5:1 on the background except black.
const terminalThemes: Record<'dark' | 'light', ITheme> = {
  dark: {
    background: '#0D0D0E',
    foreground: '#ECE9E2',
    cursor: '#F2D27A',
    selectionBackground: 'rgba(212,175,55,0.3)',
    black: '#2B2A27',
    red: '#E8695D',
    green: '#8DC274',
    yellow: '#DDB04A',
    blue: '#6B9FD8',
    magenta: '#C48BCB',
    cyan: '#5FBEBB',
    white: '#C9C5BA',
    brightBlack: '#9A968C',
    brightRed: '#FF8F82',
    brightGreen: '#AEDD94',
    brightYellow: '#F2D27A',
    brightBlue: '#97BEEB',
    brightMagenta: '#DDAAE3',
    brightCyan: '#8CDAD6',
    brightWhite: '#F7F5EF',
  },
  light: {
    background: '#FDFCF8',
    foreground: '#1D1B16',
    cursor: '#AA8419',
    selectionBackground: 'rgba(170,132,25,0.25)',
    // Every color except black/brightWhite stays >= 4.5:1 on the background; bright = a lighter/brighter hue
    black: '#1D1B16',
    red: '#B3261E',
    green: '#3D7A1E',
    yellow: '#8A6510',
    blue: '#2F5E8C',
    magenta: '#8E3B8E',
    cyan: '#1D7A82',
    white: '#6B665B',
    brightBlack: '#6B665B',
    brightRed: '#D32F2F',
    brightGreen: '#37832B',
    brightYellow: '#946D00',
    brightBlue: '#3A72AC',
    brightMagenta: '#A64CA6',
    brightCyan: '#0F8088',
    brightWhite: '#1D1B16',
  },
}

const { t } = useI18n()
const vuetifyTheme = useTheme()
const currentTerminalTheme = () =>
  terminalThemes[vuetifyTheme.global.name.value === 'light' ? 'light' : 'dark']

const rootEl = ref<HTMLElement | null>(null)
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
  if (isConnected.value || !props.isActive || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
  // Only keys aimed at this pane (its terminal, overlay, or nothing focused): typing in the search box,
  // sidebar, SFTP rename or a dialog must not reconnect/close the session
  const target = e.target as HTMLElement
  const inPane = target === document.body || rootEl.value?.contains(target)
  if (
    !inPane ||
    target.closest('input, select, [contenteditable], textarea:not(.xterm-helper-textarea)')
  )
    return

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

  // Main holds back output until now so nothing sent before the subscriptions is lost
  window.electronAPI.session.ready(sessionId)

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
  // Capture phase: xterm stops propagation of plain keys (r, Esc) on its textarea
  window.addEventListener('keydown', handleKeydown, true)

  const container = terminalContainer.value
  if (!container) return

  let entry = terminalCache.get(props.sessionId)
  if (entry?.terminal.element) {
    container.appendChild(entry.terminal.element)
  } else {
    entry = createEntry(container)
  }
  terminal = entry.terminal
  // A cached terminal missed any theme switch made while it was detached
  terminal.options.theme = currentTerminalTheme()
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
      snackbar.success(t('terminal.copied'))
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
  window.removeEventListener('keydown', handleKeydown, true)
  selectionListener?.dispose()
  resizeObserver?.disconnect()
  cancelAnimationFrame(fitFrame)
  terminal = null
  fitAddon = null
  searchAddon = null
})
</script>

<style scoped>
.terminal-overlay {
  color: var(--st-text);
  text-align: center;
}

.terminal-overlay__title {
  font-size: var(--st-fs-2xl);
  font-weight: 600;
}

.terminal-overlay__hint {
  margin-top: 8px;
  color: var(--st-muted);
  font-size: var(--st-fs-lg);
}

.terminal-overlay kbd {
  display: inline-block;
  padding: 0 8px;
  border: 1px solid var(--st-border);
  border-radius: var(--st-r-xs);
  background: var(--st-panel-header);
  color: var(--st-text);
  font-family: var(--st-font-mono);
  font-size: var(--st-fs-sm);
  line-height: 20px;
}
</style>
