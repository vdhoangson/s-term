<template>
  <nav class="st-tabs" :aria-label="$t('session.tabs')">
    <div
      v-for="session in sessions"
      :key="session.id"
      class="st-tab"
      :class="{ 'st-tab--active': activeSessionId === session.id }"
    >
      <button
        class="st-tab__main"
        :aria-current="activeSessionId === session.id ? 'true' : undefined"
        @click="$emit('select-session', session.id)"
      >
        <v-icon :icon="session.type === 'ssh' ? 'mdi-console-network' : 'mdi-console'" size="14" />
        <span class="st-tab__title">{{ session.title }}</span>
      </button>
      <button
        class="st-tab__close"
        :aria-label="$t('session.closeTab', { title: session.title })"
        @click.stop="$emit('close-session', session.id)"
      >
        <v-icon icon="mdi-close" size="12" />
      </button>
    </div>

    <button
      class="st-tabs__new"
      :aria-label="$t('session.newTerminal')"
      :title="$t('session.newTerminal')"
      @click="terminalStore.createLocalSession('bash')"
    >
      <v-icon icon="mdi-plus" size="16" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import { ISession } from '@/types/session'
import { useTerminalStore } from '@/stores/terminal'

defineProps<{
  sessions: ISession[]
  activeSessionId: string | null
}>()

defineEmits<{
  'select-session': [id: string]
  'close-session': [id: string]
}>()

const terminalStore = useTerminalStore()
</script>

<style scoped>
.st-tabs {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 4px;
  min-width: 0;
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
  height: 30px;
  border: 1px solid transparent;
  border-radius: 7px;
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
  align-items: center;
  gap: 7px;
  max-width: 180px;
  height: 28px;
  padding: 0 6px 0 12px;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.st-tab__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.st-tab__close,
.st-tabs__new {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.st-tab__close {
  width: 22px;
  height: 22px;
  margin-right: 4px;
  border-radius: 4px;
  opacity: 0.75;
}

.st-tab__close:hover {
  background: var(--st-gold-tint);
  opacity: 1;
}

.st-tabs__new {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--st-muted);
}

.st-tabs__new:hover {
  background: var(--st-gold-tint);
  color: var(--st-gold-text);
}

.st-tab__main:focus-visible,
.st-tab__close:focus-visible,
.st-tabs__new:focus-visible {
  outline: 2px solid var(--st-gold);
  outline-offset: -2px;
}
</style>
