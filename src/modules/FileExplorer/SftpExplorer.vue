<template>
  <div class="p-3">
    <h3>SFTP Explorer</h3>
    <div class="connect-form">
      <input v-model="host" placeholder="host" />
      <input v-model="username" placeholder="username" />
      <input v-model="password" placeholder="password" type="password" />
      <button @click="connect">Connect</button>
    </div>

    <div v-if="connected" class="explorer">
      <div class="path-bar">
        <button @click="cd('..')">..</button>
        <span>{{ cwd }}</span>
        <button @click="openLocalFolder">Download to...</button>
      </div>
      <ul>
        <li v-for="e in entries" :key="e.filename">
          <span @dblclick="handleDouble(e)">{{ e.filename }}</span>
          <button @click="download(e)">Download</button>
        </li>
      </ul>
    </div>

    <pre v-if="error">{{ error }}</pre>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import type { SFTPEntry } from '../../../shared/models/sftp'

export default defineComponent({
  setup() {
    const host = ref('127.0.0.1')
    const username = ref('user')
    const password = ref('')
    const connected = ref(false)
    const entries = ref<SFTPEntry[]>([])
    const cwd = ref('.')
    const error = ref<string | null>(null)

    async function connect() {
      error.value = null
      try {
        await (window as any).sftp.connect({
          host: host.value,
          username: username.value,
          password: password.value,
        })
        connected.value = true
        await list(cwd.value)
      } catch (e: any) {
        error.value = e?.message || String(e)
      }
    }

    async function list(remotePath: string) {
      entries.value = await (window as any).sftp.list(remotePath)
      cwd.value = remotePath
    }

    async function cd(name: string) {
      let newPath = cwd.value
      if (name === '..') {
        newPath = newPath.split('/').slice(0, -1).join('/') || '/'
      }
      await list(newPath)
    }

    async function handleDouble(e: SFTPEntry) {
      // naive: treat directories by trailing 'd' in longname (not robust)
      if (e.longname && e.longname.startsWith('d')) {
        await list(cwd.value + '/' + e.filename)
      }
    }

    async function openLocalFolder() {
      const local = await (window as any).sftp.openDialog()
      if (local) {
        // store chosen local folder
        ;(window as any)._vterm_download_dest = local
      }
    }

    async function download(e: SFTPEntry) {
      const dest = (window as any)._vterm_download_dest
      if (!dest) {
        alert('Choose local folder first (Download to...)')
        return
      }
      const localPath = dest + '/' + e.filename
      await (window as any).sftp.download(cwd.value + '/' + e.filename, localPath)
      alert('Downloaded to ' + localPath)
    }

    return {
      host,
      username,
      password,
      connect,
      connected,
      entries,
      cwd,
      error,
      cd,
      handleDouble,
      openLocalFolder,
      download,
    }
  },
})
</script>

<style scoped>
.connect-form {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
input {
  padding: 6px;
}
ul {
  list-style: none;
  padding: 0;
}
li {
  padding: 6px 0;
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
