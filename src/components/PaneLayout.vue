<template>
  <div
    v-if="node.type === 'leaf'"
    class="st-pane"
    :class="{ 'st-pane--active': tab.root.type === 'split' && isActive }"
    :data-pane-id="node.sessionId"
    @focusin="store.focusPane(node.sessionId)"
  >
    <TerminalView
      :key="node.sessionId"
      :session-id="node.sessionId"
      :is-active="isActive"
      @reconnect="$emit('reconnect', node.sessionId)"
      @close="$emit('close', node.sessionId)"
    />
  </div>

  <Splitpanes v-else class="st-split" :horizontal="node.dir === 'col'" @resized="onResized">
    <Pane v-for="child in node.children" :key="leafIds(child)[0]">
      <PaneLayout
        :node="child"
        :tab="tab"
        @reconnect="$emit('reconnect', $event)"
        @close="$emit('close', $event)"
      />
    </Pane>
  </Splitpanes>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import TerminalView from './TerminalView.vue'
import { leafIds } from '@/stores/layout'
import { useTerminalStore } from '@/stores/terminal'
import type { ITab, LayoutNode } from '@/types/session'

const props = defineProps<{
  node: LayoutNode
  tab: ITab
}>()

defineEmits<{
  reconnect: [sessionId: string]
  close: [sessionId: string]
}>()

const store = useTerminalStore()

// Panes get no :size on purpose: splitpanes 3.2.0 turns sibling sizes into NaN when a sized pane
// is added. It equalizes on add/remove (same as the model) and reports drags through resized.

const onResized = (panes: { size: number }[]) =>
  store.resizePanes(
    props.node,
    panes.map(p => p.size)
  )

const isActive = computed(
  () =>
    props.node.type === 'leaf' &&
    store.activeTabId === props.tab.id &&
    props.tab.activePaneId === props.node.sessionId
)
</script>

<style scoped>
.st-pane {
  height: 100%;
  outline: 1px solid transparent;
  outline-offset: -1px;
}

.st-pane--active {
  outline-color: var(--st-tab-border);
}

.st-split :deep(.splitpanes__pane) {
  transition: none;
}

.st-split > :deep(.splitpanes__splitter) {
  flex: 0 0 auto;
  background: var(--st-border);
  transition: background-color 0.15s;
}

.st-split.splitpanes--vertical > :deep(.splitpanes__splitter) {
  width: 3px;
}

.st-split.splitpanes--horizontal > :deep(.splitpanes__splitter) {
  height: 3px;
}

.st-split > :deep(.splitpanes__splitter:hover),
.st-split.splitpanes--dragging > :deep(.splitpanes__splitter) {
  background: var(--st-gold);
}
</style>
