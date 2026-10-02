import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Keep the laptop's memory available: embedded PostgreSQL and browser DOM
  // suites run one file at a time. These tests never start Docker containers.
  test: { environment: 'node', include: ['tests/**/*.test.ts', 'src/**/*.test.ts'], fileParallelism: false, testTimeout: 30000, hookTimeout: 30000 }
});
