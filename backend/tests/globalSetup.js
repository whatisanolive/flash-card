import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'

// Build a fresh, empty prisma/test.db before the suite runs (never touches dev.db).
export default function setup() {
  for (const suffix of ['', '-journal']) rmSync(`prisma/test.db${suffix}`, { force: true })
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  })
}
