import 'dotenv/config'
import { createApp } from './app.js'
import prisma from './lib/prisma.js'

const PORT = Number(process.env.PORT) || 4000
const server = createApp().listen(PORT, () => {
  console.log(`Recall API listening on http://localhost:${PORT}/api`)
})

// Close the DB connection cleanly on Ctrl+C / platform shutdown.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
  })
}
