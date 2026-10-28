<template>
  <v-menu>
    <template #activator="{ props }">
      <button
        v-bind="props"
        class="st-lang-btn"
        :aria-label="$t('toolbar.languageLabel')"
        :title="$t('toolbar.languageLabel')"
      >
        {{ localeStore.currentLocale.toUpperCase() }}
      </button>
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

<style scoped>
.st-lang-btn {
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--st-border);
  border-radius: 6px;
  background: transparent;
  color: var(--st-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.st-lang-btn:hover {
  border-color: var(--st-gold);
  color: var(--st-gold-text);
}

.st-lang-btn:focus-visible {
  outline: 2px solid var(--st-gold);
  outline-offset: 1px;
}
</style>
