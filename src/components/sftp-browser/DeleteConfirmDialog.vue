<template>
  <v-dialog v-model="isOpen" max-width="400">
    <v-card>
      <v-card-title class="text-h5">{{ $t('sftp.deleteDialog.title') }}</v-card-title>
      <v-card-text>
        {{ $t('sftp.deleteDialog.message', { name: fileName }) }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="grey" @click="handleCancel">{{ $t('sftp.deleteDialog.cancel') }}</v-btn>
        <v-btn color="error" @click="handleDelete">{{ $t('sftp.deleteDialog.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t: $t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  fileName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const isOpen = ref(props.modelValue)

watch(
  () => props.modelValue,
  newValue => {
    isOpen.value = newValue
  }
)

watch(isOpen, newValue => {
  emit('update:modelValue', newValue)
})

function handleDelete() {
  emit('confirm')
  isOpen.value = false
}

function handleCancel() {
  isOpen.value = false
}
</script>
