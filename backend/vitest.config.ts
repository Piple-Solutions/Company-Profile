import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // node:sqlite (DatabaseSync) requires a real Node runtime; run files
    // sequentially in one forked process (Vitest 4 top-level options).
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
