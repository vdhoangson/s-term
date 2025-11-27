<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card class="text-center pa-4">
      <v-card-title class="text-h5 font-weight-bold"> S-Term </v-card-title>

      <v-card-text>
        <div class="mb-4">
          <v-img src="/build/icons/png/128x128.png" max-width="128" class="mx-auto"></v-img>
          <div class="text-subtitle-1">Version {{ version }}</div>
        </div>

        <p class="text-body-1 mb-4">
          {{ $t('about.description') }}
        </p>

        <v-divider class="my-3"></v-divider>

        <div class="text-caption text-grey">
          <p>{{ $t('about.author') }}: vdhoangson</p>
          <p>
            <a href="#" @click.prevent="openLink('https://github.com/vdhoangson/s-term')">
              GitHub Repository
            </a>
          </p>
          <p class="mt-2">Copyright © 2025</p>
        </div>
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
import { version } from '../../package.json'

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

function openLink(url: string) {
  window.open(url, '_blank')
}
</script>
