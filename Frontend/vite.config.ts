import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('ag-grid')) return 'vendor-aggrid';
            if (id.includes('devextreme')) return 'vendor-devextreme';
            if (id.includes('xlsx') || id.includes('exceljs')) return 'vendor-excel';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            return 'vendor-common';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
