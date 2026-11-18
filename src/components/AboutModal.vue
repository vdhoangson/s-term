<template>
  <v-dialog v-model="dialog" max-width="560">
    <v-card class="text-center">
      <v-card-title>S-Term</v-card-title>

      <v-card-text>
        <div class="mb-4">
          <img :src="logoUrl" alt="" width="96" height="96" class="d-block mx-auto" />
          <div class="text-subtitle-1">{{ $t('about.version', { version }) }}</div>
        </div>

        <p class="text-body-1 mb-4">
          {{ $t('about.description') }}
        </p>

        <v-divider class="my-3"></v-divider>

        <div class="st-about__meta">
          <p>{{ $t('about.author') }}: vdhoangson</p>
          <p>
            <a href="#" @click.prevent="openLink('https://github.com/vdhoangson/s-term')">
              {{ $t('about.github') }}
            </a>
          </p>
          <p class="mt-2">{{ $t('about.copyright', { year: new Date().getFullYear() }) }}</p>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="dialog = false">
          {{ $t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { version } from '../../package.json'
import logoUrl from '@/assets/logo.svg'

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

<style scoped>
.st-about__meta {
  color: var(--st-muted);
  font-size: var(--st-fs-sm);
}
</style>
