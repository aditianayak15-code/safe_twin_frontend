import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('@react-three') || id.includes('drei')) return 'r3f'
          if (id.includes('echarts')) return 'echarts'
          if (id.includes('node_modules/motion')) return 'motion'
        },
      },
    },
  },
})
