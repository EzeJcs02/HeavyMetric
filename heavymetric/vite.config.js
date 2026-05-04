import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Subir el límite de advertencia a 600kb (el chunk de vendor es esperado)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Code splitting: separa librerías pesadas en chunks propios para mejor cache
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('jspdf-autotable')) return 'vendor-pdf'
            if (id.includes('xlsx'))                                      return 'vendor-xlsx'
            if (id.includes('@supabase'))                                 return 'vendor-supabase'
            if (id.includes('react-dom'))                                 return 'vendor-react'
            if (id.includes('react-router'))                              return 'vendor-router'
            if (id.includes('sonner'))                                    return 'vendor-ui'
          }
        }
      }
    }
  }
})
