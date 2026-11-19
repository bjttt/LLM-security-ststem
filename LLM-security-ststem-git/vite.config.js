import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { modelGateway } from './server/model-gateway.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    vueDevTools(),
    modelGateway(loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/watermark-api': {
        target: 'http://10.161.105.212:15000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/watermark-api/, '')
      }
    }
  }
}))
