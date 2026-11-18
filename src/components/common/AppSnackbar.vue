<template>
  <v-snackbar
    v-model="snackbarStore.show"
    :color="snackbarStore.color"
    :timeout="snackbarStore.timeout"
    location="bottom"
  >
    {{ snackbarStore.message }}

    <template #actions>
      <v-btn
        icon="mdi-close"
        size="small"
        :aria-label="$t('common.close')"
        :title="$t('common.close')"
        @click="snackbarStore.show = false"
      ></v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { useSnackbarStore } from '@/stores/snackbar'

const snackbarStore = useSnackbarStore()
</script>
