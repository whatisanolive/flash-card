import express from 'express'
import cors from 'cors'
import prisma from './lib/prisma.js'
import decksRouter from './routes/decks.js'
import cardsRouter from './routes/cards.js'
import sessionsRouter from './routes/sessions.js'
import statsRouter from './routes/stats.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  const origins = (process.env.CORS_ORIGIN ?? '*').split(',').map((o) => o.trim())
  app.use(cors({ origin: origins.includes('*') ? '*' : origins }))
  app.use(express.json({ limit: '1mb' }))

  // Tiny request logger (skipped in tests to keep output clean).
  if (process.env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
      const start = performance.now()
      res.on('finish', () => {
        console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Math.round(performance.now() - start)}ms)`)
      })
      next()
    })
  }

  app.get('/api/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', time: new Date().toISOString() })
  })

  app.use('/api/decks', decksRouter)
  app.use('/api/cards', cardsRouter)
  app.use('/api/sessions', sessionsRouter)
  app.use('/api/stats', statsRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
