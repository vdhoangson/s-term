<template>
  <div class="pa-2">
    <v-slide-group v-model="selectedIndex" show-arrows center-active class="session-types">
      <v-slide-group-item
        v-for="(type, index) in types"
        :key="type.value"
        v-slot="{ isSelected, toggle }"
        :value="index"
      >
        <v-btn
          class="ma-1"
          :variant="isSelected ? 'flat' : 'text'"
          height="60"
          width="70"
          stacked
          @click="handleSelect(type.value, toggle)"
        >
          <v-icon :icon="type.icon" size="24" :color="type.color" class="mb-1"></v-icon>
          <span class="text-caption" style="font-size: 10px !important">{{ type.title }}</span>

          <!-- Active Indicator Border -->
          <div
            v-if="isSelected"
            class="position-absolute"
            style="bottom: 0; left: 0; right: 0; height: 2px; background-color: #4caf50"
          ></div>
        </v-btn>
      </v-slide-group-item>
    </v-slide-group>
  </div>
</template>

<script setup lang="ts">
import { SessionType } from '@/types/session';
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  types: SessionType[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Find initial selected index
const selectedIndex = ref(props.types.findIndex(t => t.value === props.modelValue))

// Update selectedIndex when modelValue changes externally
watch(
  () => props.modelValue,
  newValue => {
    const index = props.types.findIndex(t => t.value === newValue)
    if (index !== -1) {
      selectedIndex.value = index
    }
  }
)

function handleSelect(value: string, toggle: () => void) {
  toggle()
  emit('update:modelValue', value)
}
</script>

<style scoped>
.session-types {
  min-height: 80px;
}
</style>
