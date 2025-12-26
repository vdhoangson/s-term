import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSnackbarStore = defineStore('snackbar', () => {
  const show = ref(false)
  const message = ref('')
  const color = ref('info')
  const timeout = ref(3000)

  function showSnackbar(
    msg: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration = 3000
  ) {
    message.value = msg
    color.value = type
    timeout.value = duration
    show.value = true
  }

  function success(msg: string, duration = 3000) {
    showSnackbar(msg, 'success', duration)
  }

  function error(msg: string, duration = 3000) {
    showSnackbar(msg, 'error', duration)
  }

  return {
    show,
    message,
    color,
    timeout,
    showSnackbar,
    success,
    error,
  }
})
