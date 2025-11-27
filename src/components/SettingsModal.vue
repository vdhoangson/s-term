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
import { useSettingsStore } from '../stores/settings'

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
</script>
