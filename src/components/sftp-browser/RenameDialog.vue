<template>
  <v-dialog v-model="isOpen" max-width="400">
    <v-card>
      <v-card-title>{{ $t('sftp.renameDialog.title') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="newName"
          :label="$t('sftp.renameDialog.label')"
          :placeholder="$t('sftp.renameDialog.placeholder')"
          variant="outlined"
          density="compact"
          autofocus
          @keyup.enter="handleRename"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="handleCancel">{{ $t('sftp.renameDialog.cancel') }}</v-btn>
        <v-btn color="primary" @click="handleRename">{{ $t('sftp.renameDialog.rename') }}</v-btn>
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
  currentName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  rename: [newName: string]
}>()

const isOpen = ref(props.modelValue)
const newName = ref(props.currentName)

watch(
  () => props.modelValue,
  newValue => {
    isOpen.value = newValue
    if (newValue) {
      newName.value = props.currentName // Reset to current name when opening
    }
  }
)

watch(
  () => props.currentName,
  newValue => {
    newName.value = newValue
  }
)

watch(isOpen, newValue => {
  emit('update:modelValue', newValue)
})

function handleRename() {
  if (newName.value.trim() && newName.value !== props.currentName) {
    emit('rename', newName.value)
    isOpen.value = false
  } else if (newName.value === props.currentName) {
    isOpen.value = false
  }
}

function handleCancel() {
  isOpen.value = false
}
</script>
