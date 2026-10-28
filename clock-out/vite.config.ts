import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: {
    port: 5179,
    strictPort: true,
    watch: { ignored: ['**/public/art/**'] },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
