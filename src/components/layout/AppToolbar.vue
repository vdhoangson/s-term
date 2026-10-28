<template>
  <header class="st-tabbar">
    <div class="st-tabbar__brand">
      <div class="st-tabbar__logo" aria-hidden="true">S</div>
      <span class="st-tabbar__name">S-Term</span>
    </div>

    <SessionTabBar
      :sessions="sessions"
      :active-session-id="activeSessionId"
      @select-session="$emit('select-session', $event)"
      @close-session="$emit('close-session', $event)"
    />

    <div class="st-tabbar__actions">
      <ThemeSwitcher />
      <LanguageSwitcher />
    </div>
  </header>
</template>

<script setup lang="ts">
import LanguageSwitcher from './LanguageSwitcher.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import SessionTabBar from '../session/SessionTabBar.vue'
import { ISession } from '@/types/session'

defineProps<{
  sessions: ISession[]
  activeSessionId: string | null
}>()

defineEmits<{
  'select-session': [id: string]
  'close-session': [id: string]
}>()
</script>

<style scoped>
.st-tabbar {
  display: flex;
  flex: 0 0 44px;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 12px;
  border-bottom: 1px solid var(--st-border-soft);
}

.st-tabbar__brand {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.st-tabbar__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--st-metal);
  color: #1a1405;
  font-size: 13px;
  font-weight: 700;
}

.st-tabbar__name {
  font-weight: 600;
  letter-spacing: 0.2px;
}

.st-tabbar__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}
</style>
