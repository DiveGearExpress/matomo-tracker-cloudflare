import { defineConfig, coverageConfigDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: ['**/tests/**', ...coverageConfigDefaults.exclude]
    }
  }
});
