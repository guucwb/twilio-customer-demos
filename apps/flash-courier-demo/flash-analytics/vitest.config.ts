import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['plugin-flash-analytics/src/**/*.test.ts', 'analytics-backend/src/**/*.test.ts'],
  },
});
