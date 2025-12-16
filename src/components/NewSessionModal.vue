<template>
  <v-dialog v-model="dialog" max-width="700px" persistent>
    <v-card>
      <v-card-title>
        {{ editConnection ? $t('modal.title.edit') : $t('modal.title.new') }}
      </v-card-title>

      <!-- Session Type Selector -->
      <SessionTypeSelector v-model="selectedType" :types="sessionTypes" />

      <v-divider color="grey-darken-2"></v-divider>

      <v-card-text class="pa-3">
        <!-- SSH Content -->
        <div v-if="selectedType === 'ssh'">
          <v-sheet class="pa-3 bg-transparent rounded" style="border-color: #555 !important">
            <div class="d-flex align-center mb-3">
              <v-icon icon="mdi-key-variant" color="amber" size="small" class="mr-2"></v-icon>
              <span class="text-body-2 font-weight-bold">{{ $t('modal.tabs.connection') }}</span>
            </div>

            <v-row dense>
              <!-- Connection Name -->
              <v-col cols="12">
                <v-text-field
                  v-model="connection.name"
                  :label="$t('modal.fields.name')"
                  :placeholder="$t('modal.fields.namePlaceholder')"
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-label"
                ></v-text-field>
              </v-col>

              <!-- Host -->
              <v-col cols="8">
                <v-text-field
                  v-model="connection.host"
                  :label="$t('modal.fields.host')"
                  :placeholder="$t('modal.fields.hostPlaceholder')"
                  variant="outlined"
                  density="compact"
                  hide-details
                  required
                ></v-text-field>
              </v-col>

              <!-- Port -->
              <v-col cols="4">
                <v-text-field
                  v-model.number="connection.port"
                  :label="$t('modal.fields.port')"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                ></v-text-field>
              </v-col>

              <!-- Username -->
              <v-col cols="12">
                <v-text-field
                  v-model="connection.username"
                  :label="$t('modal.fields.username')"
                  :placeholder="$t('modal.fields.usernamePlaceholder')"
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-account"
                ></v-text-field>
              </v-col>

              <!-- Authentication Type -->
              <v-col cols="12">
                <v-radio-group v-model="connection.authType" inline hide-details class="mt-2">
                  <template #label>
                    <span class="text-caption">{{ $t('modal.fields.authType') }}</span>
                  </template>
                  <v-radio :label="$t('modal.authTypes.password')" value="password"></v-radio>
                  <v-radio :label="$t('modal.authTypes.privateKey')" value="privateKey"></v-radio>
                </v-radio-group>
              </v-col>

              <!-- Password Field -->
              <v-col v-if="connection.authType === 'password'" cols="12">
                <v-text-field
                  v-model="connection.password"
                  :label="$t('modal.fields.password')"
                  :placeholder="$t('modal.fields.passwordPlaceholder')"
                  type="password"
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-lock"
                ></v-text-field>
              </v-col>

              <!-- Private Key Field -->
              <v-col v-if="connection.authType === 'privateKey'" cols="12">
                <v-text-field
                  v-model="connection.privateKeyPath"
                  :label="$t('modal.fields.privateKey')"
                  variant="outlined"
                  density="compact"
                  hide-details
                  readonly
                >
                  <template #append-inner>
                    <v-btn
                      icon="mdi-folder-open"
                      variant="text"
                      size="small"
                      color="amber"
                      @click="selectKeyFile"
                    ></v-btn>
                  </template>
                </v-text-field>
              </v-col>

              <!-- Passphrase (if private key) -->
              <v-col v-if="connection.authType === 'privateKey'" cols="12">
                <v-text-field
                  v-model="connection.passphrase"
                  :label="$t('modal.fields.passphrase')"
                  :placeholder="$t('modal.fields.passphrasePlaceholder')"
                  type="password"
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-key"
                ></v-text-field>
              </v-col>

              <!-- X11 Forwarding -->
              <v-col cols="12" class="mt-2">
                <v-switch
                  v-model="connection.x11Forwarding"
                  :label="$t('modal.fields.x11Forwarding')"
                  color="primary"
                  density="compact"
                  hide-details
                >
                  <template #prepend>
                    <v-icon icon="mdi-window-restore" size="small" color="blue"></v-icon>
                  </template>
                </v-switch>
              </v-col>
            </v-row>
          </v-sheet>
        </div>

        <!-- Other Session Types -->
        <div v-else class="d-flex align-center justify-center" style="height: 200px">
          <div class="text-center">
            <v-icon :icon="currentTypeIcon" size="64" color="grey"></v-icon>
            <div class="mt-4 text-h6 text-grey">{{ currentTypeTitle }} not implemented yet</div>
          </div>
        </div>
      </v-card-text>

      <v-divider color="grey-darken-2"></v-divider>

      <!-- Action Buttons -->
      <ModalActions
        :edit-mode="!!editConnection"
        :valid="isValid"
        :loading="false"
        @cancel="handleCancel"
        @save="handleSave"
        @connect="handleConnect"
      />
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Connection, SessionType } from '@/types/session'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalActions from './connection/ModalActions.vue'
import SessionTypeSelector from './connection/SessionTypeSelector.vue'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  editConnection?: Connection | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  create: [connection: Connection]
}>()

const dialog = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const selectedType = ref('ssh')
const connection = ref<Partial<Connection>>({
  name: '',
  type: 'ssh',
  host: '',
  port: 22,
  username: '',
  password: '',
  authType: 'password',
  privateKeyPath: '',
  passphrase: '',
  x11Forwarding: false,
})

const sessionTypes: SessionType[] = [
  { title: 'SSH', value: 'ssh', icon: 'mdi-key-variant', color: 'amber' },
]

const currentTypeIcon = computed(() => sessionTypes.find(t => t.value === selectedType.value)?.icon)
const currentTypeTitle = computed(
  () => sessionTypes.find(t => t.value === selectedType.value)?.title
)

const isValid = computed(() => {
  if (selectedType.value === 'ssh') {
    return !!connection.value.host
  }
  return false
})

// Load edit data
watch(
  () => props.editConnection,
  editConn => {
    if (editConn) {
      connection.value = {
        ...editConn,
        passphrase: '', // Don't load passphrase for security
      }
      selectedType.value = editConn.type || 'ssh'
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

function resetForm() {
  connection.value = {
    name: '',
    type: 'ssh',
    host: '',
    port: 22,
    username: '',
    password: '',
    authType: 'password',
    privateKeyPath: '',
    passphrase: '',
    x11Forwarding: false,
  }
  selectedType.value = 'ssh'
}

async function selectKeyFile() {
  try {
    const result = await (window as any).electronAPI?.selectFile({
      filters: [
        { name: 'Private Keys', extensions: ['pem', 'key', 'ppk', ''] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (result && !result.canceled) {
      const filePath = result.filePath

      // Warn if user selected a public key
      if (filePath.endsWith('.pub')) {
        alert(t('modal.warnings.publicKeySelected'))
        return
      }

      connection.value.privateKeyPath = filePath
    }
  } catch (error) {
    console.error('Error selecting file:', error)
  }
}

function handleCancel() {
  dialog.value = false
  resetForm()
}

function handleSave() {
  if (!isValid.value) return

  const finalConnection = {
    ...connection.value,
    id: props.editConnection?.id,
    type: selectedType.value,
    name:
      connection.value.name ||
      (connection.value.username
        ? `${connection.value.username}@${connection.value.host}`
        : connection.value.host),
  } as Connection

  emit('create', finalConnection)
  dialog.value = false
  resetForm()
}

function handleConnect() {
  handleSave()
}
</script>
