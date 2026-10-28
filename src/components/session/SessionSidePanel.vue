<template>
  <section class="st-block st-sftp" :aria-label="$t('sftp.title')">
    <div class="st-block-header">
      <v-icon icon="mdi-folder-network" size="16" class="st-block-icon" />
      <span class="st-block-title">{{ $t('sftp.title') }}</span>
      <span class="st-spacer"></span>
      <button
        class="st-icon-btn"
        :aria-label="$t('common.close')"
        :title="$t('common.close')"
        @click="$emit('update:modelValue', false)"
      >
        <v-icon icon="mdi-close" size="16" />
      </button>
    </div>

    <!-- SFTP Browser (scrollable content) -->
    <div class="st-sftp__body">
      <SftpBrowser :id="'sftp-browser-' + sessionId" :session-id="sessionId" />
    </div>
  </section>
</template>

<script setup lang="ts">
import SftpBrowser from '../sftp-browser/SftpBrowser.vue'

defineProps<{
  sessionId: string
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.st-sftp {
  flex: 1 1 0;
}

.st-sftp__body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
}
</style>
