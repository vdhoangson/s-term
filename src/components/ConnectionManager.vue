<template>
  <v-dialog v-model="dialog" max-width="600">
    <v-card>
      <v-card-title>Connection Manager</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="4">
            <v-list density="compact" nav>
              <v-list-item
                v-for="conn in store.connections"
                :key="conn.id"
                :title="conn.name"
                :value="conn.id"
                @click="selectConnection(conn)"
              >
                <template #append>
                  <v-icon
                    icon="mdi-delete"
                    size="small"
                    color="error"
                    @click.stop="deleteConnection(conn.id)"
                  ></v-icon>
                </template>
              </v-list-item>
              <v-list-item
                prepend-icon="mdi-plus"
                title="New Connection"
                value="new"
                @click="createNew"
              ></v-list-item>
            </v-list>
          </v-col>

          <v-col cols="8">
            <v-form v-model="valid" @submit.prevent="save">
              <v-text-field
                v-model="form.name"
                label="Connection Name"
                required
                density="compact"
              ></v-text-field>

              <v-select
                v-model="form.type"
                :items="['ssh', 'local']"
                label="Type"
                density="compact"
              ></v-select>

              <template v-if="form.type === 'ssh'">
                <v-text-field
                  v-model="form.host"
                  label="Host"
                  required
                  density="compact"
                ></v-text-field>
                <v-text-field
                  v-model.number="form.port"
                  label="Port"
                  type="number"
                  density="compact"
                ></v-text-field>
                <v-text-field
                  v-model="form.username"
                  label="Username"
                  required
                  density="compact"
                ></v-text-field>
                <v-text-field
                  v-model="form.password"
                  label="Password"
                  type="password"
                  density="compact"
                ></v-text-field>
              </template>

              <v-btn type="submit" color="primary" block class="mt-4">Save</v-btn>
            </v-form>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useConnectionStore, type Connection } from '../stores/connections'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const store = useConnectionStore()
const dialog = ref(props.modelValue)
const valid = ref(false)

const defaultForm: Partial<Connection> = {
  name: '',
  type: 'ssh',
  host: '',
  port: 22,
  username: '',
  password: '',
}

const form = reactive<Partial<Connection>>({ ...defaultForm })

watch(
  () => props.modelValue,
  val => {
    dialog.value = val
    if (val) {
      store.loadConnections()
    }
  }
)

watch(dialog, val => {
  emit('update:modelValue', val)
})

function createNew() {
  Object.assign(form, defaultForm)
  delete form.id
}

function selectConnection(conn: Connection) {
  Object.assign(form, conn)
}

async function save() {
  if (!form.name) return

  const connection: Connection = {
    id: form.id || Math.random().toString(36).substring(7),
    name: form.name,
    type: form.type as 'ssh' | 'local',
    host: form.host,
    port: form.port,
    username: form.username,
    password: form.password,
  }

  await store.saveConnection(connection)
  createNew()
}

async function deleteConnection(id: string) {
  if (confirm('Are you sure?')) {
    await store.deleteConnection(id)
    if (form.id === id) {
      createNew()
    }
  }
}
</script>
