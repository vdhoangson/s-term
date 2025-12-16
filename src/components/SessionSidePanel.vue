<template>
  <v-navigation-drawer
    :model-value="modelValue"
    permanent
    location="right"
    width="350"
    class="border-s d-flex flex-column"
  >
    <!-- Title Bar (fixed) -->
    <v-sheet class="pa-2 border-b">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon icon="mdi-folder-network" color="amber" class="mr-2"></v-icon>
          <span class="text-body-2 font-weight-bold">{{ $t('sftp.title') }}</span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="x-small"
          @click="$emit('update:modelValue', false)"
        ></v-btn>
      </div>
    </v-sheet>

    <!-- SFTP Browser (scrollable content) -->
    <div class="flex-grow-1 overflow-y-auto">
      <SftpBrowser :id="'sftp-browser-' + sessionId" :session-id="sessionId" />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import SftpBrowser from './sftp-browser/SftpBrowser.vue'

defineProps<{
  sessionId: string
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
