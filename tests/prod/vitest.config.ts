import { defineConfig } from 'vitest/config'

// Production smoke tests: read-only checks against a deployed site.
// SMOKE_URL (required), SUPABASE_URL + SUPABASE_ANON_KEY + DEMO_PASSWORD (for sign-in checks).
export default defineConfig({
  test: {
    include: ['tests/prod/**/*.test.ts'],
    testTimeout: 20_000,
    retry: 1,
  },
})
