<template>
  <nav class="st-tabs" :aria-label="$t('session.tabs')">
    <div
      v-for="session in sessions"
      :key="session.id"
      class="st-tab"
      :class="{ 'st-tab--active': activeSessionId === session.id }"
    >
      <button
        class="st-tab__main st-focusable"
        :aria-current="activeSessionId === session.id ? 'true' : undefined"
        @click="$emit('select-session', session.id)"
      >
        <v-icon :icon="session.type === 'ssh' ? 'mdi-console-network' : 'mdi-console'" size="14" />
        <span class="st-tab__title">{{ session.title }}</span>
      </button>
      <button
        class="st-icon-btn st-icon-btn--sm st-tab__close"
        :aria-label="$t('session.closeTab', { title: session.title })"
        :title="$t('session.closeTab', { title: session.title })"
        @click.stop="$emit('close-session', session.id)"
      >
        <v-icon icon="mdi-close" size="14" />
      </button>
    </div>

    <button
      class="st-icon-btn"
      :aria-label="$t('session.newTerminal')"
      :title="$t('session.newTerminal')"
      @click="terminalStore.createLocalSession(settingsStore.defaultShell || undefined)"
    >
      <v-icon icon="mdi-plus" size="16" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import { ISession } from '@/types/session'
import { useTerminalStore } from '@/stores/terminal'
import { useSettingsStore } from '@/stores/settings'

defineProps<{
  sessions: ISession[]
  activeSessionId: string | null
}>()

defineEmits<{
  'select-session': [id: string]
  'close-session': [id: string]
}>()

const terminalStore = useTerminalStore()
const settingsStore = useSettingsStore()
</script>

<style scoped>
/* Padding keeps the focus rings of the tabs and the new-tab button inside the scroll container. */
.st-tabs {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.st-tabs::-webkit-scrollbar {
  display: none;
}

.st-tab {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  height: var(--st-ctl-md);
  border: 1px solid transparent;
  border-radius: var(--st-r-md);
  color: var(--st-muted);
}

.st-tab:not(.st-tab--active):hover {
  background: var(--st-gold-tint);
}

.st-tab--active {
  border-color: var(--st-tab-border);
  background: var(--st-tab-bg);
  box-shadow: inset 0 -2px 0 var(--st-gold);
  color: var(--st-gold-text);
}

.st-tab__main {
  display: flex;
  align-self: stretch;
  align-items: center;
  gap: 8px;
  max-width: 180px;
  padding: 0 4px 0 12px;
  border: 0;
  border-radius: var(--st-r-sm);
  background: transparent;
  color: inherit;
  font-size: var(--st-fs-sm);
  font-weight: 500;
  cursor: pointer;
}

.st-tab__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.st-tab__close {
  margin-right: 4px;
}
</style>
