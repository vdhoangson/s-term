<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn v-bind="props" icon variant="text" size="small" class="mr-2">
        <v-icon>{{ localeIcon }}</v-icon>
      </v-btn>
    </template>
    <v-list density="compact">
      <v-list-item
        :active="localeStore.currentLocale === 'en'"
        @click="localeStore.setLocale('en')"
      >
        <v-list-item-title>🇬🇧 English</v-list-item-title>
      </v-list-item>
      <v-list-item
        :active="localeStore.currentLocale === 'vi'"
        @click="localeStore.setLocale('vi')"
      >
        <v-list-item-title>🇻🇳 Tiếng Việt</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocaleStore } from '@/stores/locale'

const localeStore = useLocaleStore()

const localeIcon = computed(() => {
  return localeStore.currentLocale === 'vi' ? 'mdi-alpha-v-circle' : 'mdi-alpha-e-circle'
})
</script>
