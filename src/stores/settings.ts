import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const checkForUpdates = ref(true)

  async function loadSettings() {
    try {
      const settings = await window.electronAPI?.store?.getSettings()
      if (settings) {
        checkForUpdates.value = settings.checkForUpdates
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  async function saveSettings() {
    try {
      await window.electronAPI?.store?.setSettings({
        checkForUpdates: checkForUpdates.value,
      })
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  async function setCheckForUpdates(value: boolean) {
    checkForUpdates.value = value
    await saveSettings()
  }

  return {
    checkForUpdates,
    loadSettings,
    saveSettings,
    setCheckForUpdates,
  }
})
