import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['electron/**/*.test.ts'],
    // Fixture tests shell out to real git; give them headroom.
    testTimeout: 30_000,
    hookTimeout: 30_000
  }
})
