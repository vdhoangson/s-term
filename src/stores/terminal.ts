import { ITab, ITerminalSession, LayoutNode, SplitDir } from '@/types/session'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { leafIds, removeLeaf, replaceLeaf, splitLeaf } from './layout'
import { disposeTerminal } from './terminalCache'

export const useTerminalStore = defineStore('terminal', () => {
  // Flat list of live sessions; tabs arrange them into pane trees
  const sessions = ref<ITerminalSession[]>([])
  const tabs = ref<ITab[]>([])
  const activeTabId = ref<string | null>(null)

  const tabOf = (sessionId: string) => tabs.value.find(t => leafIds(t.root).includes(sessionId))

  // The focused pane of the active tab
  const activeSessionId = computed(
    () => tabs.value.find(t => t.id === activeTabId.value)?.activePaneId ?? null
  )

  function addSession(session: ITerminalSession) {
    sessions.value.push(session)
    const tab: ITab = {
      id: crypto.randomUUID(),
      root: { type: 'leaf', sessionId: session.id },
      activePaneId: session.id,
    }
    tabs.value.push(tab)
    activeTabId.value = tab.id
  }

  function removeSession(id: string) {
    const index = sessions.value.findIndex(s => s.id === id)
    if (index === -1) return
    sessions.value.splice(index, 1)
    disposeTerminal(id)

    const tab = tabOf(id)
    if (!tab) return
    const before = leafIds(tab.root)
    const root = removeLeaf(tab.root, id)
    if (root) {
      tab.root = root
      if (tab.activePaneId === id) {
        const rest = leafIds(root)
        tab.activePaneId = rest[Math.max(before.indexOf(id) - 1, 0)]
      }
    } else {
      tabs.value.splice(tabs.value.indexOf(tab), 1)
      if (activeTabId.value === tab.id) {
        activeTabId.value = tabs.value.length > 0 ? tabs.value[tabs.value.length - 1].id : null
      }
    }
  }

  // Focus a pane (and its tab)
  function setActiveSession(id: string) {
    const tab = tabOf(id)
    if (!tab) return
    tab.activePaneId = id
    activeTabId.value = tab.id
  }

  function setMonitoringEnabled(id: string, enabled: boolean) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.monitoringEnabled = enabled
    }
  }

  async function createLocalSession(shell?: string) {
    const config = { cols: 80, rows: 24, shell }
    const id = await window.electronAPI.session.create(config)
    addSession({ id, title: 'Terminal', type: 'local', config })
  }

  // Clone a session next to itself: local reuses its shell, SSH its config (main merges secrets)
  async function splitPane(sessionId: string, dir: SplitDir) {
    const source = sessions.value.find(s => s.id === sessionId)
    if (!source) return

    try {
      const id = await window.electronAPI.session.create(source.config)
      const tab = tabOf(sessionId)
      if (!tab) {
        // Source was closed while the new session was starting
        window.electronAPI.session.kill(id)
        return
      }
      sessions.value.push({
        id,
        title: source.title,
        type: source.type,
        connectionId: source.connectionId,
        config: source.config,
      })
      tab.root = splitLeaf(tab.root, sessionId, id, dir)
      setActiveSession(id)
    } catch (error) {
      console.error('Failed to split pane:', error)
    }
  }

  function resizePanes(node: LayoutNode, sizes: number[]) {
    if (node.type === 'split' && node.children.length === sizes.length) node.sizes = sizes
  }

  function updateSessionId(oldId: string, newId: string) {
    const session = sessions.value.find(s => s.id === oldId)
    if (!session) return
    disposeTerminal(oldId)
    session.id = newId
    const tab = tabOf(oldId)
    if (tab) {
      tab.root = replaceLeaf(tab.root, oldId, newId)
      if (tab.activePaneId === oldId) tab.activePaneId = newId
    }
  }

  return {
    sessions,
    tabs,
    activeTabId,
    activeSessionId,
    addSession,
    removeSession,
    setActiveSession,
    focusPane: setActiveSession,
    setMonitoringEnabled,
    createLocalSession,
    splitPane,
    resizePanes,
    updateSessionId,
  }
})
