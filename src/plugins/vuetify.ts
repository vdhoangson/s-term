import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      light: {
        dark: false,
        colors: {
          background: '#F3F0E8',
          surface: '#FFFFFF',
          primary: '#B8901F',
          'on-primary': '#1A1405',
          secondary: '#8A6510', // gold text
          'on-secondary': '#FFFFFF',
          accent: '#B8901F',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FB8C00',
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
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FB8C00',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
})
