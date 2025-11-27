<template>
  <v-dialog v-model="isOpen" max-width="400">
    <v-card>
      <v-card-title>{{ $t('sftp.newFolderDialog.title') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="folderName"
          :label="$t('sftp.newFolderDialog.label')"
          variant="outlined"
          density="compact"
          autofocus
          @keyup.enter="handleCreate"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="handleCancel">{{ $t('sftp.newFolderDialog.cancel') }}</v-btn>
        <v-btn color="primary" @click="handleCreate">{{ $t('sftp.newFolderDialog.create') }}</v-btn>
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
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  create: [folderName: string]
}>()

const isOpen = ref(props.modelValue)
const folderName = ref('')

watch(
  () => props.modelValue,
  newValue => {
    isOpen.value = newValue
    if (newValue) {
      folderName.value = '' // Reset when opening
    }
  }
)

watch(isOpen, newValue => {
  emit('update:modelValue', newValue)
})

function handleCreate() {
  if (folderName.value.trim()) {
    emit('create', folderName.value)
    isOpen.value = false
  }
}

function handleCancel() {
  isOpen.value = false
}
</script>
