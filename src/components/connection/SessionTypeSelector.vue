<template>
  <div class="pa-2">
    <v-slide-group
      v-model="selectedIndex"
      mandatory
      show-arrows
      center-active
      class="session-types"
    >
      <v-slide-group-item
        v-for="(type, index) in types"
        :key="type.value"
        v-slot="{ isSelected, toggle }"
        :value="index"
      >
        <v-btn
          class="session-type ma-1"
          :class="{ 'st-active': isSelected }"
          :aria-pressed="isSelected"
          stacked
          @click="handleSelect(type.value, toggle)"
        >
          <v-icon :icon="type.icon" size="24" class="mb-1"></v-icon>
          <span class="session-type__label">{{ type.title }}</span>
        </v-btn>
      </v-slide-group-item>
    </v-slide-group>
  </div>
</template>

<script setup lang="ts">
import { ISessionType } from '@/types/session'
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  types: ISessionType[]
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

.session-type.v-btn {
  height: 64px;
  border-radius: var(--st-r-md);
}

.session-type__label {
  font-size: var(--st-fs-xs);
}

.session-type.st-active {
  box-shadow: inset 0 0 0 1px var(--st-gold);
}
</style>
