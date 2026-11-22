import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests unitarios de funciones puras (shared/, app/sync) y, si hay Supabase local,
// tests de integración de la base (tests/db). No levantan Nuxt.
export default defineConfig({
  resolve: {
    alias: { '#shared': fileURLToPath(new URL('./shared', import.meta.url)) },
  },
  test: {
    include: ['shared/**/*.test.ts', 'app/**/*.test.ts', 'tests/db/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
  },
})
