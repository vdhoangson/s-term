import { ITerminalSession } from '@/types/session'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTerminalStore = defineStore('terminal', () => {
  const sessions = ref<ITerminalSession[]>([])
  const activeSessionId = ref<string | null>(null)

  function addSession(session: ITerminalSession) {
    sessions.value.push(session)
    activeSessionId.value = session.id
  }

  function removeSession(id: string) {
    const index = sessions.value.findIndex(s => s.id === id)
    if (index !== -1) {
      sessions.value.splice(index, 1)
      if (activeSessionId.value === id) {
        activeSessionId.value =
          sessions.value.length > 0 ? sessions.value[sessions.value.length - 1].id : null
      }
    }
  }

  function setActiveSession(id: string) {
    activeSessionId.value = id
  }

  function setMonitoringEnabled(id: string, enabled: boolean) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.monitoringEnabled = enabled
    }
  }

  function updateSessionId(oldId: string, newId: string) {
    const index = sessions.value.findIndex(s => s.id === oldId)
    if (index !== -1) {
      sessions.value[index].id = newId
      if (activeSessionId.value === oldId) {
        activeSessionId.value = newId
      }
    }
  }

  return {
    sessions,
    activeSessionId,
    addSession,
    removeSession,
    setActiveSession,
    setMonitoringEnabled,
    updateSessionId,
  }
})
