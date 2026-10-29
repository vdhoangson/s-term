import { reactive } from 'vue'
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import type { SearchAddon } from '@xterm/addon-search'

export interface ITerminalEntry {
  terminal: Terminal
  fitAddon: FitAddon
  searchAddon: SearchAddon
  cleanups: (() => void)[] // IPC unsubscribes
}

// xterm instances outlive TerminalView: reshaping the pane tree remounts the view, not the session
export const terminalCache = new Map<string, ITerminalEntry>()

// Sessions whose backend has exited (survives view remounts)
export const disconnected = reactive(new Set<string>())

export function disposeTerminal(sessionId: string) {
  disconnected.delete(sessionId)
  const entry = terminalCache.get(sessionId)
  if (!entry) return
  entry.cleanups.forEach(fn => fn())
  entry.terminal.dispose()
  terminalCache.delete(sessionId)
}
