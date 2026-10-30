<template>
  <div class="terminal-search" @keydown.stop>
    <input
      ref="input"
      v-model="term"
      class="terminal-search__input"
      :placeholder="$t('terminal.find')"
      :aria-label="$t('terminal.find')"
      @keydown.enter.exact.prevent="find(true)"
      @keydown.shift.enter.prevent="find(false)"
      @keydown.esc.prevent="close"
    />
    <button
      class="st-icon-btn"
      :aria-label="$t('terminal.findPrevious')"
      :title="$t('terminal.findPrevious')"
      @click="find(false)"
    >
      <v-icon icon="mdi-chevron-up" size="16" />
    </button>
    <button
      class="st-icon-btn"
      :aria-label="$t('terminal.findNext')"
      :title="$t('terminal.findNext')"
      @click="find(true)"
    >
      <v-icon icon="mdi-chevron-down" size="16" />
    </button>
    <button
      class="st-icon-btn"
      :aria-label="$t('common.close')"
      :title="$t('common.close')"
      @click="close"
    >
      <v-icon icon="mdi-close" size="16" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useTheme } from 'vuetify'
import type { SearchAddon } from '@xterm/addon-search'

const props = defineProps<{
  addon: SearchAddon
}>()

const emit = defineEmits<{
  close: []
}>()

const vuetifyTheme = useTheme()
const input = ref<HTMLInputElement | null>(null)
const term = ref('')

// Match colors must be #RRGGBB and keep the theme's foreground readable
const decorations = () =>
  vuetifyTheme.global.name.value === 'light'
    ? {
        matchBackground: '#F2E3A8',
        matchOverviewRuler: '#B8901F',
        activeMatchBackground: '#E0B93E',
        activeMatchColorOverviewRuler: '#8A6510',
      }
    : {
        matchBackground: '#4A3D12',
        matchOverviewRuler: '#B8901F',
        activeMatchBackground: '#7A6218',
        activeMatchColorOverviewRuler: '#F2D27A',
      }

function find(next: boolean, incremental = false) {
  if (!term.value) return props.addon.clearDecorations()
  const options = { decorations: decorations() }
  if (next) props.addon.findNext(term.value, { ...options, incremental })
  else props.addon.findPrevious(term.value, options)
}

watch(term, () => find(true, true))

function close() {
  props.addon.clearDecorations()
  emit('close')
}

function focus() {
  input.value?.focus()
  input.value?.select()
}

onMounted(focus)
defineExpose({ focus })
</script>

<style scoped>
.terminal-search {
  position: absolute;
  top: 8px;
  right: 16px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--st-border);
  border-radius: 8px;
  background: var(--st-panel);
  box-shadow: var(--st-shadow);
}

.terminal-search__input {
  width: 180px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--st-border);
  border-radius: 5px;
  outline: 0;
  background: var(--st-input-bg);
  color: var(--st-text);
  font: inherit;
  font-size: 12px;
}

.terminal-search__input:focus {
  border-color: var(--st-gold);
}
</style>
