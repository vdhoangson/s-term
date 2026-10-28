<template>
  <nav class="st-widgets" :aria-label="$t('widgets.label')">
    <button
      v-for="item in topItems"
      :key="item.key"
      class="st-widget"
      :class="{ 'st-widget--active': item.active }"
      :disabled="item.disabled"
      :aria-label="$t(`widgets.${item.key}`)"
      :aria-pressed="item.active"
      :title="$t(`widgets.${item.key}`)"
      @click="item.onClick"
    >
      <v-icon :icon="item.icon" size="18" />
      <span>{{ $t(`widgets.${item.key}`) }}</span>
    </button>

    <span class="st-spacer"></span>

    <button
      v-for="item in bottomItems"
      :key="item.key"
      class="st-widget"
      :aria-label="$t(`widgets.${item.key}`)"
      :title="$t(`widgets.${item.key}`)"
      @click="item.onClick"
    >
      <v-icon :icon="item.icon" size="18" />
      <span>{{ $t(`widgets.${item.key}`) }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  hostsOpen: boolean
  sftpOpen: boolean
  monitoringOpen: boolean
  sshActive: boolean
}>()

const emit = defineEmits<{
  'toggle-hosts': []
  'toggle-sftp': []
  'toggle-monitoring': []
  'open-settings': []
  'open-about': []
}>()

const topItems = computed(() => [
  {
    key: 'hosts',
    icon: 'mdi-server',
    active: props.hostsOpen,
    disabled: false,
    onClick: () => emit('toggle-hosts'),
  },
  {
    key: 'sftp',
    icon: 'mdi-folder-outline',
    active: props.sshActive && props.sftpOpen,
    disabled: !props.sshActive,
    onClick: () => emit('toggle-sftp'),
  },
  {
    key: 'sysinfo',
    icon: 'mdi-pulse',
    active: props.sshActive && props.monitoringOpen,
    disabled: !props.sshActive,
    onClick: () => emit('toggle-monitoring'),
  },
])

const bottomItems = [
  { key: 'settings', icon: 'mdi-tune', onClick: () => emit('open-settings') },
  { key: 'about', icon: 'mdi-information-outline', onClick: () => emit('open-about') },
]
</script>

<style scoped>
.st-widgets {
  display: flex;
  flex: 0 0 56px;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 0;
}

.st-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--st-muted);
  font-size: 10px;
  text-transform: lowercase;
  cursor: pointer;
}

.st-widget:hover:not(:disabled) {
  background: var(--st-gold-tint);
  color: var(--st-gold-text);
}

.st-widget--active {
  background: var(--st-gold-tint);
  color: var(--st-gold-text);
}

.st-widget:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.st-widget:focus-visible {
  outline: 2px solid var(--st-gold);
  outline-offset: -2px;
}
</style>
