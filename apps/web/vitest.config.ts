import { defineConfig } from 'vitest/config'

// Unit tests live next to the code as *.test.ts(x).
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
})
