import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<ThemeMode>('system')

  // Load from localStorage
  const stored = localStorage.getItem('theme')
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    currentTheme.value = stored as ThemeMode
  }

  function setTheme(theme: ThemeMode) {
    currentTheme.value = theme
    localStorage.setItem('theme', theme)
  }

  return { currentTheme, setTheme }
})
