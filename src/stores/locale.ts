import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n } from '../locales'

export type Locale = 'en' | 'vi'

export const useLocaleStore = defineStore('locale', () => {
  const currentLocale = ref<Locale>((localStorage.getItem('locale') as Locale) || 'vi')

  function setLocale(locale: Locale) {
    currentLocale.value = locale
    localStorage.setItem('locale', locale)
    i18n.global.locale.value = locale
  }

  // Sync with i18n on init
  i18n.global.locale.value = currentLocale.value

  return {
    currentLocale,
    setLocale,
  }
})
