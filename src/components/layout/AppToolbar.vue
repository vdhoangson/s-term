<template>
  <v-app-bar
    density="compact"
    :elevation="2"
    :color="themeStore.currentTheme === 'dark' ? 'black' : 'primary'"
  >
    <!-- Sidebar Toggle -->
    <v-btn
      :icon="sidebarOpen ? 'mdi-menu-open' : 'mdi-menu-close'"
      variant="text"
      size="small"
      class="ml-2"
      @click="$emit('toggle-sidebar')"
    />

    <v-app-bar-title class="text-subtitle-1 font-weight-bold ml-2" style="max-width: fit-content">
      S-Term
    </v-app-bar-title>

    <SessionTabBar
      :sessions="sessions"
      :active-session-id="activeSessionId"
      :sftp-sidebar-open="sftpSidebarOpen"
      class="flex-grow-1"
      @select-session="$emit('select-session', $event)"
      @close-session="$emit('close-session', $event)"
      @toggle-monitoring="$emit('toggle-monitoring')"
      @toggle-sftp="$emit('toggle-sftp')"
    />

    <v-spacer v-if="sessions.length === 0"></v-spacer>

    <!-- Theme Switcher -->
    <ThemeSwitcher />

    <!-- Language Switcher -->
    <LanguageSwitcher />
  </v-app-bar>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme'
import { useLocaleStore } from '@/stores/locale'
import LanguageSwitcher from './LanguageSwitcher.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import SessionTabBar from '../session/SessionTabBar.vue'
import { ISession } from '@/types/session'

const props = defineProps<{
  sidebarOpen: boolean
  sessions: ISession[]
  activeSessionId: string | null
  sftpSidebarOpen: boolean
}>()

defineEmits<{
  'toggle-sidebar': []
  'select-session': [id: string]
  'close-session': [id: string]
  'toggle-monitoring': []
  'toggle-sftp': []
}>()

const { t } = useI18n()
const vuetifyTheme = useTheme()
const themeStore = useThemeStore()
const localeStore = useLocaleStore()

const themeIcon = computed(() => {
  switch (themeStore.currentTheme) {
    case 'light':
      return 'mdi-white-balance-sunny'
    case 'dark':
      return 'mdi-moon-waning-crescent'
    case 'system':
      return 'mdi-cog'
  }
})

const localeIcon = computed(() => {
  return localeStore.currentLocale === 'vi' ? 'mdi-alpha-v-circle' : 'mdi-alpha-e-circle'
})

// Watch theme changes and apply to Vuetify
watch(
  () => themeStore.currentTheme,
  newTheme => {
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      vuetifyTheme.change(prefersDark ? 'dark' : 'light')
    } else {
      vuetifyTheme.change(newTheme)
    }
  },
  { immediate: true }
)

// Listen for system theme changes when in system mode
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
mediaQuery.addEventListener('change', e => {
  if (themeStore.currentTheme === 'system') {
    vuetifyTheme.change(e.matches ? 'dark' : 'light')
  }
})
</script>
