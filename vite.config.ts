import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/block-image-reveal/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://astroloversketch.vercel.app',
        changeOrigin: true,
      },
    },
  },
})
