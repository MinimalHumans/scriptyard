import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // sqlite-wasm finds its .wasm file relative to its own module, which the
  // dev server's dependency pre-bundling would move out from under it.
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  resolve: {
    alias: {
      // Allows imports like: import { Toolbar } from '@/components/Toolbar/Toolbar'
      // This alias must survive the port to the SCF React branch unchanged.
      '@': path.resolve(__dirname, './src'),
    },
  },
})
