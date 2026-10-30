<template>
  <v-dialog v-model="dialog" max-width="600px">
    <v-card>
      <v-card-title class="text-h5">
        {{ $t('settings.title') }}
      </v-card-title>

      <v-card-text class="pa-4">
        <v-list>
          <v-list-subheader>{{ $t('settings.general') }}</v-list-subheader>

          <v-list-item>
            <v-list-item-title>{{ $t('settings.checkForUpdates') }}</v-list-item-title>
            <v-list-item-subtitle>{{
              $t('settings.checkForUpdatesDescription')
            }}</v-list-item-subtitle>
            <template #append>
              <v-switch
                v-model="settingsStore.checkForUpdates"
                color="primary"
                hide-details
                @update:model-value="settingsStore.setCheckForUpdates"
              ></v-switch>
            </template>
          </v-list-item>

          <v-list-subheader>{{ $t('settings.terminal') }}</v-list-subheader>

          <div class="px-4">
            <v-text-field
              :model-value="settingsStore.fontFamily"
              :label="$t('settings.fontFamily')"
              variant="outlined"
              density="compact"
              hide-details
              class="mb-3"
              @update:model-value="settingsStore.update({ fontFamily: $event })"
            ></v-text-field>

            <v-row dense class="mb-1">
              <v-col cols="4">
                <v-text-field
                  :model-value="settingsStore.fontSize"
                  :label="$t('settings.fontSize')"
                  type="number"
                  min="8"
                  max="32"
                  step="1"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @update:model-value="setNumber('fontSize', $event, 8, 32)"
                ></v-text-field>
              </v-col>
              <v-col cols="4">
                <v-text-field
                  :model-value="settingsStore.lineHeight"
                  :label="$t('settings.lineHeight')"
                  type="number"
                  min="1"
                  max="2"
                  step="0.1"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @update:model-value="setNumber('lineHeight', $event, 1, 2)"
                ></v-text-field>
              </v-col>
              <v-col cols="4">
                <v-text-field
                  :model-value="settingsStore.scrollback"
                  :label="$t('settings.scrollback')"
                  type="number"
                  min="100"
                  max="100000"
                  step="100"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @update:model-value="setNumber('scrollback', $event, 100, 100000)"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-select
              :model-value="settingsStore.cursorStyle"
              :items="cursorStyles"
              :label="$t('settings.cursorStyle')"
              variant="outlined"
              density="compact"
              hide-details
              class="mb-3"
              @update:model-value="settingsStore.update({ cursorStyle: $event })"
            ></v-select>

            <v-text-field
              :model-value="settingsStore.defaultShell"
              :label="$t('settings.defaultShell')"
              :hint="$t('settings.defaultShellHint')"
              persistent-hint
              variant="outlined"
              density="compact"
              @update:model-value="settingsStore.update({ defaultShell: $event })"
            ></v-text-field>
          </div>

          <v-list-item>
            <v-list-item-title>{{ $t('settings.cursorBlink') }}</v-list-item-title>
            <template #append>
              <v-switch
                :model-value="settingsStore.cursorBlink"
                color="primary"
                hide-details
                @update:model-value="settingsStore.update({ cursorBlink: !!$event })"
              ></v-switch>
            </template>
          </v-list-item>

          <v-list-item>
            <v-list-item-title>{{ $t('settings.ligatures') }}</v-list-item-title>
            <v-list-item-subtitle>{{ $t('settings.ligaturesDescription') }}</v-list-item-subtitle>
            <template #append>
              <v-switch
                :model-value="settingsStore.ligatures"
                color="primary"
                hide-details
                @update:model-value="settingsStore.update({ ligatures: !!$event })"
              ></v-switch>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" @click="dialog = false">
          {{ $t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settings'

const settingsStore = useSettingsStore()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const dialog = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const cursorStyles = ['block', 'bar', 'underline']

// Out-of-range or partial input (while typing) is ignored instead of saved
function setNumber(
  key: 'fontSize' | 'lineHeight' | 'scrollback',
  value: string | number,
  min: number,
  max: number
) {
  const n = Number(value)
  if (value !== '' && n >= min && n <= max) settingsStore.update({ [key]: n })
}
</script>
