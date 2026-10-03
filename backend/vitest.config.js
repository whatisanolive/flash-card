import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Tests run against a throwaway SQLite file, never your dev data.
    env: { DATABASE_URL: 'file:./test.db', NODE_ENV: 'test' },
    globalSetup: './tests/globalSetup.js',
    fileParallelism: false,
  },
})
