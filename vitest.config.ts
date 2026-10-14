import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // The booking tests build their times with local Dates and read them back
    // on the business's clock, Israel's (LT-315): pin the zone so they mean
    // the same on any machine. Tests that need another zone set
    // TZ themselves (vi.stubEnv); Node picks the change up at once.
    env: { TZ: 'Asia/Jerusalem' },
    // Scoped so `npm test` never tries to run the Playwright specs, which
    // need a browser and a served site.
    include: ['src/test/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/services/**', 'src/models/**', 'src/hooks/**'],
    },
  },
});
