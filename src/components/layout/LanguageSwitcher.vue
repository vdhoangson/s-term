<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn v-bind="props" icon variant="text" size="small" class="mr-2">
        {{ localeStore.currentLocale === 'en' ? '🇬🇧' : '🇻🇳' }}
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
import { useLocaleStore } from '@/stores/locale'

const localeStore = useLocaleStore()
</script>
