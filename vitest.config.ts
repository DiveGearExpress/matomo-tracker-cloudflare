import { defineConfig, coverageConfigDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        '**/tests/**',
        '**/scripts/**',
        ...coverageConfigDefaults.exclude
      ]
    }
  }
});
