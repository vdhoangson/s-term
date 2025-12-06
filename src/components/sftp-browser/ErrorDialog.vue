<template>
  <v-dialog v-model="show" max-width="500" persistent>
    <v-card>
      <v-card-title class="d-flex align-center bg-error">
        <v-icon class="mr-2" color="white">mdi-alert-circle</v-icon>
        <span class="text-white">{{ title }}</span>
      </v-card-title>

      <v-card-text class="pt-4">
        <div class="text-body-1">{{ message }}</div>
        <div v-if="details" class="mt-2 pa-2 bg-grey-darken-3 rounded text-caption">
          {{ details }}
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="elevated" @click="close">
          {{ $t('common.ok') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t: $t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  title?: string
  message: string
  details?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const show = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

function close() {
  show.value = false
}
</script>
