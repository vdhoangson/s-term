import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = parseInt(env.VITE_PORT) || 5173

  return {
    base: './',   // Quan trọng cho Electron

    plugins: [
      vue(),
      vuetify({ autoImport: true })
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'vue': 'vue/dist/vue.esm-bundler.js'
      }
    },

    server: {
      port,
      strictPort: true
    },

    optimizeDeps: {
      exclude: [
        'vue',
        'vue-i18n',
        'vuetify'
      ]
    },

    build: {
      outDir: 'dist',
      target: 'chrome118',
      chunkSizeWarningLimit: 1200,
      sourcemap: mode === 'development',

      rollupOptions: {
        // Những module Electron không cho Vite bundle
        external: [
          'electron',
          'fs',
          'path',
          'os',
          'node-pty',
          'ssh2',
          'keytar'
        ]
      }
    }
  }
})
