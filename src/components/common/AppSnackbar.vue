<template>
  <v-snackbar
    v-model="snackbarStore.show"
    :color="snackbarStore.color"
    :timeout="snackbarStore.timeout"
    location="bottom"
  >
    {{ snackbarStore.message }}

    <template v-slot:actions>
      <v-btn icon="mdi-close" variant="text" @click="snackbarStore.show = false"></v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { useSnackbarStore } from '@/stores/snackbar'

const snackbarStore = useSnackbarStore()
</script>
