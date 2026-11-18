<template>
  <!-- Folder -->
  <div v-if="item.type === 'folder'">
    <v-list-item
      class="tree-row st-focusable st-focusable--inset"
      @click="folderOpen = !folderOpen"
    >
      <template #prepend>
        <v-icon :icon="folderOpen ? 'mdi-folder-open' : 'mdi-folder'" class="st-block-icon" />
      </template>
      <template #title>
        <span class="st-label">{{ item.name }}</span>
      </template>
      <template #append>
        <v-menu @click.stop>
          <template #activator="{ props: menuProps }">
            <v-btn
              icon="mdi-dots-vertical"
              size="small"
              :aria-label="$t('session.itemActions', { name: item.name })"
              :title="$t('session.itemActions', { name: item.name })"
              v-bind="menuProps"
              @click.stop
            />
          </template>
          <v-list>
            <v-list-item
              prepend-icon="mdi-plus"
              :title="$t('session.newSession')"
              @click="$emit('create-session', item.id)"
            />
            <v-list-item
              prepend-icon="mdi-folder-plus"
              :title="$t('sidebar.newFolder')"
              @click="$emit('create-folder', item.id)"
            />
            <v-list-item
              prepend-icon="mdi-pencil"
              :title="$t('session.rename')"
              @click="$emit('rename', item)"
            />
            <v-list-item
              prepend-icon="mdi-delete"
              :title="$t('common.delete')"
              @click="$emit('delete-folder', item.id)"
            />
          </v-list>
        </v-menu>
      </template>
    </v-list-item>

    <v-expand-transition>
      <div v-show="folderOpen || filtering" class="pl-4">
        <draggable
          v-model="localChildren"
          item-key="id"
          tag="div"
          group="sessions"
          :disabled="filtering"
          :animation="200"
          class="pa-0"
          @change="onDragChange"
          @start="$emit('drag-start')"
          @end="$emit('drag-end')"
        >
          <template #item="{ element }">
            <div>
              <SessionTreeItem
                :item="element"
                :filtering="filtering"
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
    class="tree-row st-focusable st-focusable--inset connection-item pl-6"
    active-class="st-active"
    @dblclick="handleSelect"
    @keydown.enter.self="handleSelect"
  >
    <template #prepend>
      <v-icon
        :icon="isSshConnection(item.data) ? 'mdi-key-variant' : 'mdi-console'"
        :class="isSshConnection(item.data) ? 'st-block-icon' : 'st-block-icon--muted'"
        size="small"
      ></v-icon>
    </template>

    <template #append>
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn
            icon="mdi-dots-vertical"
            size="small"
            :aria-label="$t('session.itemActions', { name: item.name })"
            :title="$t('session.itemActions', { name: item.name })"
            v-bind="menuProps"
          ></v-btn>
        </template>
        <v-list>
          <v-list-item
            prepend-icon="mdi-pencil"
            :title="$t('common.edit')"
            @click.stop="$emit('edit', item)"
          ></v-list-item>
          <v-list-item
            prepend-icon="mdi-delete"
            :title="$t('common.delete')"
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
  filtering?: boolean
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
  // Intentional: keeps the parent tree in sync during drag; persistence goes through updateListOrder
  // eslint-disable-next-line vue/no-mutating-props
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
/* Vuetify's compact one-line row is 40px and its nav "rounded" utility is !important. */
.tree-row.v-list-item {
  --v-list-prepend-gap: 12px; /* icon to name; Vuetify's default is 32px */
  min-height: var(--st-ctl-lg);
  border-radius: var(--st-r-sm) !important;
}

.connection-item.v-list-item--active :deep(.v-list-item__overlay) {
  opacity: 0;
}
</style>
