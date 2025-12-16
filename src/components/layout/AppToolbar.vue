<template>
  <v-app-bar density="compact" color="primary" dark>
    <!-- Sidebar Toggle -->
    <v-btn
      :icon="sidebarOpen ? 'mdi-menu-open' : 'mdi-menu-close'"
      variant="text"
      size="small"
      class="ml-2"
      @click="$emit('toggle-sidebar')"
    />

    <v-app-bar-title class="text-subtitle-1 font-weight-bold ml-2">S-Term</v-app-bar-title>

    <v-spacer></v-spacer>

    <!-- Theme Switcher -->
    <ThemeSwitcher />

    <!-- Language Switcher -->
    <LanguageSwitcher />
  </v-app-bar>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useThemeStore } from '@/stores/theme'
import { useLocaleStore } from '@/stores/locale'
import LanguageSwitcher from './LanguageSwitcher.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'

defineProps<{
  sidebarOpen: boolean
}>()

defineEmits<{
  'toggle-sidebar': []
}>()

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
