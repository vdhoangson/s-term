<template>
  <v-dialog :model-value="modelValue" fullscreen persistent>
    <v-card class="d-flex flex-column fill-height" @keydown="onKeydown">
      <v-toolbar density="compact" color="surface">
        <v-toolbar-title class="text-body-2">
          {{ remotePath }}<span v-if="dirty" class="text-warning"> ●</span>
        </v-toolbar-title>
        <v-btn
          prepend-icon="mdi-content-save"
          variant="tonal"
          :disabled="!ready || !dirty"
          :loading="saving"
          @click="save"
          >{{ $t('sftp.editor.save') }}</v-btn
        >
        <v-btn icon="mdi-close" :aria-label="$t('common.close')" @click="requestClose"></v-btn>
      </v-toolbar>

      <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>
      <v-alert v-if="loadError" type="error" variant="tonal" class="ma-4">
        {{ $t('sftp.editor.loadFailed') }}: {{ loadError }}
      </v-alert>

      <div ref="editorEl" class="sftp-editor flex-grow-1"></div>
    </v-card>
  </v-dialog>

  <v-dialog v-model="confirmDiscard" max-width="400">
    <v-card>
      <v-card-title>{{ $t('sftp.editor.unsavedTitle') }}</v-card-title>
      <v-card-text>{{ $t('sftp.editor.unsavedMessage', { name: fileName }) }}</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="confirmDiscard = false">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="error" @click="close">{{ $t('sftp.editor.discard') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'
import { basicSetup, EditorView } from 'codemirror'
import { LanguageDescription } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { useSnackbarStore } from '@/stores/snackbar'

const { t: $t } = useI18n()
const theme = useTheme()
const snackbar = useSnackbarStore()

const props = defineProps<{
  modelValue: boolean
  sessionId: string
  remotePath: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const editorEl = ref<HTMLElement | null>(null)
const loading = ref(false)
const loadError = ref('')
const ready = ref(false)
const dirty = ref(false)
const saving = ref(false)
const confirmDiscard = ref(false)
let view: EditorView | null = null

const fileName = computed(() => props.remotePath.split('/').pop() || props.remotePath)

watch(
  () => props.modelValue,
  open => {
    if (open) load()
    else destroyView()
  },
  { immediate: true }
)

onBeforeUnmount(destroyView)

function destroyView() {
  view?.destroy()
  view = null
  ready.value = false
}

async function load() {
  loading.value = true
  loadError.value = ''
  dirty.value = false
  try {
    const content = await window.electronAPI.sftp.readFile(props.sessionId, props.remotePath)
    // Language packs load lazily, only the one matching this file name
    const desc = LanguageDescription.matchFilename(languages, fileName.value)
    const language = desc ? await desc.load() : []
    await nextTick()
    if (!props.modelValue || !editorEl.value) return

    view = new EditorView({
      doc: content,
      parent: editorEl.value,
      extensions: [
        basicSetup,
        language,
        theme.global.current.value.dark ? oneDark : [],
        EditorView.theme({ '&': { height: '100%' } }),
        EditorView.updateListener.of(update => {
          if (update.docChanged) dirty.value = true
        }),
      ],
    })
    ready.value = true
  } catch (error: any) {
    loadError.value = error?.message || String(error)
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!view || !ready.value || saving.value) return
  const doc = view.state.doc
  saving.value = true
  try {
    await window.electronAPI.sftp.writeFile(props.sessionId, props.remotePath, doc.toString())
    // Edits made while the write was in flight keep the editor dirty
    dirty.value = view?.state.doc !== doc
    snackbar.success($t('sftp.editor.saved', { name: fileName.value }))
    emit('saved')
  } catch (error: any) {
    snackbar.error(`${$t('sftp.editor.saveFailed')}: ${error?.message || String(error)}`, 5000)
  } finally {
    saving.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    save()
  }
}

function requestClose() {
  if (dirty.value) confirmDiscard.value = true
  else close()
}

function close() {
  confirmDiscard.value = false
  emit('update:modelValue', false)
}
</script>

<style scoped>
.sftp-editor {
  min-height: 0;
  overflow: hidden;
}
</style>
