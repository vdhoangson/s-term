<template>
  <!-- Folder -->
  <!-- Folder -->
  <div v-if="item.type === 'folder'">
    <v-list-item
      :title="item.name"
      density="compact"
      class="folder-item"
      @click="folderOpen = !folderOpen"
    >
      <template #prepend>
        <v-icon :icon="folderOpen ? 'mdi-folder-open' : 'mdi-folder'" color="amber" />
      </template>
      <template #append>
        <v-menu @click.stop>
          <template #activator="{ props: menuProps }">
            <v-btn
              icon="mdi-dots-vertical"
              variant="text"
              size="x-small"
              v-bind="menuProps"
              @click.stop
            />
          </template>
          <v-list density="compact">
            <v-list-item
              prepend-icon="mdi-plus"
              title="New Session"
              @click="$emit('create-session', item.id)"
            />
            <v-list-item
              prepend-icon="mdi-folder-plus"
              title="New Folder"
              @click="$emit('create-folder', item.id)"
            />
            <v-list-item prepend-icon="mdi-pencil" title="Rename" @click="$emit('rename', item)" />
            <v-list-item
              prepend-icon="mdi-delete"
              title="Delete"
              @click="$emit('delete-folder', item.id)"
            />
          </v-list>
        </v-menu>
      </template>
    </v-list-item>

    <v-expand-transition>
      <div v-show="folderOpen" class="pl-4">
        <draggable
          v-model="localChildren"
          item-key="id"
          tag="div"
          group="sessions"
          @change="onDragChange"
          @start="$emit('drag-start')"
          @end="$emit('drag-end')"
          :animation="200"
          class="pa-0"
        >
          <template #item="{ element }">
            <div>
              <SessionTreeItem
                :item="element"
                @select="$emit('select', $event)"
                @edit="$emit('edit', $event)"
                @delete="$emit('delete', $event)"
                @create-session="$emit('create-session', $event)"
                @create-folder="$emit('create-folder', $event)"
                @rename="$emit('rename', $event)"
                @move-item="(e, p) => $emit('move-item', e, p)"
                @drag-start="$emit('drag-start')"
                @drag-end="$emit('drag-end')"
              />
            </div>
          </template>
        </draggable>
      </div>
    </v-expand-transition>
  </div>

  <!-- Connection -->
  <v-list-item
    v-else
    :title="item.name"
    :value="item.id"
    density="compact"
    class="connection-item pl-6"
    @dblclick="handleSelect"
  >
    <template #prepend>
      <v-icon
        :icon="isSshConnection(item.data) ? 'mdi-key-variant' : 'mdi-console'"
        :color="isSshConnection(item.data) ? 'amber' : 'grey'"
        size="small"
      ></v-icon>
    </template>

    <template #append>
      <v-menu>
        <template #activator="{ props }">
          <v-btn icon="mdi-dots-vertical" variant="text" size="x-small" v-bind="props"></v-btn>
        </template>
        <v-list density="compact">
          <v-list-item
            prepend-icon="mdi-pencil"
            title="Edit"
            @click.stop="$emit('edit', item)"
          ></v-list-item>
          <v-list-item
            prepend-icon="mdi-delete"
            title="Delete"
            @click.stop="$emit('delete', item.id)"
          ></v-list-item>
        </v-list>
      </v-menu>
    </template>
  </v-list-item>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TreeNode, Connection, Folder } from '../../stores/connections'
import draggable from 'vuedraggable'
import { useConnectionStore } from '../../stores/connections'

const props = defineProps<{
  item: TreeNode
}>()

const emit = defineEmits<{
  (e: 'select', conn: Connection): void
  (e: 'edit', item: TreeNode): void
  (e: 'delete', id: string): void
  (e: 'delete-folder', id: string): void
  (e: 'create-session', parentId: string): void
  (e: 'create-folder', parentId: string): void
  (e: 'rename', item: TreeNode): void
  (e: 'move-item', event: any, parentId: string): void
  (e: 'drag-start'): void
  (e: 'drag-end'): void
}>()

const connectionStore = useConnectionStore()

function isSshConnection(data: Connection | Folder | undefined): boolean {
  return !!data && 'type' in data && data.type === 'ssh'
}

function handleSelect() {
  if (props.item.data && 'type' in props.item.data) {
    emit('select', props.item.data as Connection)
  }
}

const folderOpen = ref(false)
const localChildren = ref<TreeNode[]>(props.item.children || [])

// Watch for external changes to children
watch(
  () => props.item.children,
  newChildren => {
    localChildren.value = newChildren || []
  },
  { deep: true }
)

function onDragChange(event: any) {
  // Update the item's children
  props.item.children = localChildren.value

  if (event.moved || event.added) {
    updateListOrder(localChildren.value, props.item.id)
  }
}

function updateListOrder(nodes: TreeNode[], parentId: string | null) {
  nodes.forEach((node, index) => {
    connectionStore.moveItem(node.id, parentId, index)
  })
}
</script>

<style scoped>
.folder-item :deep(.v-list-item__prepend) .v-icon {
  color: #ffc107;
}

.connection-item {
  min-height: 32px !important;
}
</style>
