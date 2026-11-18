import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const field = { variant: 'outlined', density: 'compact', color: 'primary' } as const

// Theme colors mirror the --st-* tokens in src/styles.css and must be kept in sync.
export default createVuetify({
  components,
  directives,
  defaults: {
    VBtn: { variant: 'text', class: 'text-none' },
    VTextField: field,
    VSelect: field,
    VTextarea: field,
    VCombobox: field,
    VAutocomplete: field,
    VSwitch: { color: 'primary', inset: true, density: 'compact' },
    VCheckbox: { color: 'primary', density: 'compact' },
    VRadioGroup: { color: 'primary' },
    VList: { density: 'compact' },
    VProgressLinear: { color: 'primary', rounded: true },
    VDialog: { VCard: { class: 'st-dialog' } },
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      light: {
        dark: false,
        colors: {
          background: '#F3F0E8',
          surface: '#FFFFFF',
          primary: '#AA8419',
          'on-primary': '#1A1405',
          secondary: '#8A6510', // gold text
          'on-secondary': '#FFFFFF',
          accent: '#AA8419',
          error: '#C0392B',
          info: '#2F6DB5',
          success: '#3B7A2A',
          warning: '#9A5B00',
        },
      },
      dark: {
        dark: true,
        colors: {
          background: '#09090A',
          surface: '#111113',
          primary: '#D4AF37',
          'on-primary': '#1A1405',
          secondary: '#F2D27A', // gold text
          'on-secondary': '#1A1405',
          accent: '#D4AF37',
          error: '#F07167',
          'on-error': '#1A1405', // auto contrast picks white (2.9:1)
          info: '#7AA7E0',
          'on-info': '#1A1405', // auto contrast picks white (2.5:1)
          success: '#7CC66A',
          warning: '#E9A23B',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
})
