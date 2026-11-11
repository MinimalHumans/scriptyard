import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Tests cover the pure board → export builders only, so they run in plain
// Node with no DOM. The alias mirrors vite.config.ts.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
