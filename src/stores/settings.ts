import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'
import type { AppSettings } from '@/types/electron'

export const useSettingsStore = defineStore('settings', () => {
  // Same defaults as StoreService, used until loadSettings resolves
  const state = reactive<AppSettings>({
    checkForUpdates: true,
    fontFamily: '"JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
    fontSize: 14,
    lineHeight: 1.2,
    cursorStyle: 'block',
    cursorBlink: true,
    scrollback: 5000,
    defaultShell: '',
    ligatures: false,
  })

  async function loadSettings() {
    try {
      const settings = await window.electronAPI?.store?.getSettings()
      if (settings) {
        Object.assign(state, settings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  async function saveSettings() {
    try {
      await window.electronAPI?.store?.setSettings({ ...state })
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  async function update(patch: Partial<AppSettings>) {
    Object.assign(state, patch)
    await saveSettings()
  }

  async function setCheckForUpdates(value: boolean) {
    await update({ checkForUpdates: value })
  }

  return {
    ...toRefs(state),
    loadSettings,
    saveSettings,
    update,
    setCheckForUpdates,
  }
})
