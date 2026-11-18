<template>
  <v-card-actions>
    <v-spacer></v-spacer>
    <v-btn :disabled="loading" @click="$emit('cancel')">
      {{ $t('common.cancel') }}
    </v-btn>
    <v-btn
      v-if="!editMode"
      color="primary"
      variant="flat"
      :disabled="!valid || loading"
      :loading="loading"
      @click="$emit('connect')"
    >
      {{ $t('common.connect') }}
    </v-btn>
    <v-btn
      v-else
      color="primary"
      variant="flat"
      :disabled="!valid || loading"
      :loading="loading"
      @click="$emit('save')"
    >
      {{ $t('common.save') }}
    </v-btn>
  </v-card-actions>
</template>

<script setup lang="ts">
defineProps<{
  editMode: boolean
  valid: boolean
  loading: boolean
}>()

defineEmits<{
  cancel: []
  save: []
  connect: []
}>()
</script>
