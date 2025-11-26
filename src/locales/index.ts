import { createI18n } from 'vue-i18n'
import en from './en'
import vi from './vi'

const messages = {
  en,
  vi,
}

// Auto-detect browser language or default to Vietnamese
const getDefaultLocale = (): string => {
  const stored = localStorage.getItem('locale')
  if (stored && (stored === 'en' || stored === 'vi')) {
    return stored
  }

  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('vi')) {
    return 'vi'
  }
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages,
})
