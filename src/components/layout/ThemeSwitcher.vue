<template>
  <v-menu>
    <template #activator="{ props }">
      <button
        v-bind="props"
        class="st-icon-btn"
        :aria-label="$t('toolbar.themeLabel')"
        :title="$t('toolbar.themeLabel')"
      >
        <v-icon :icon="themeIcon" size="18" />
      </button>
    </template>
    <v-list density="compact">
      <v-list-item
        :active="themeStore.currentTheme === 'light'"
        @click="themeStore.setTheme('light')"
      >
        <template #prepend>
          <v-icon>mdi-white-balance-sunny</v-icon>
        </template>
        <v-list-item-title>{{ $t('toolbar.theme.light') }}</v-list-item-title>
      </v-list-item>
      <v-list-item
        :active="themeStore.currentTheme === 'dark'"
        @click="themeStore.setTheme('dark')"
      >
        <template #prepend>
          <v-icon>mdi-moon-waning-crescent</v-icon>
        </template>
        <v-list-item-title>{{ $t('toolbar.theme.dark') }}</v-list-item-title>
      </v-list-item>
      <v-list-item
        :active="themeStore.currentTheme === 'system'"
        @click="themeStore.setTheme('system')"
      >
        <template #prepend>
          <v-icon>mdi-theme-light-dark</v-icon>
        </template>
        <v-list-item-title>{{ $t('toolbar.theme.system') }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useThemeStore } from '../../stores/theme'

const vuetifyTheme = useTheme()
const themeStore = useThemeStore()

const themeIcon = computed(() => {
  switch (themeStore.currentTheme) {
    case 'light':
      return 'mdi-white-balance-sunny'
    case 'dark':
      return 'mdi-moon-waning-crescent'
    default:
      return 'mdi-theme-light-dark'
  }
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
