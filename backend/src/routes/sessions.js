import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { notFound } from '../lib/httpError.js'
import { validate } from '../middleware/validate.js'
import { sessionSchema } from '../validators/schemas.js'

const router = Router()

router.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50)
  const sessions = await prisma.studySession.findMany({
    orderBy: { completedAt: 'desc' },
    take: limit,
    include: { deck: { select: { title: true, swatch: true } } },
  })
  res.json(sessions)
})

router.post('/', validate(sessionSchema), async (req, res) => {
  const deck = await prisma.deck.findUnique({ where: { id: req.body.deckId } })
  if (!deck) throw notFound('Deck')
  const session = await prisma.studySession.create({ data: req.body })
  res.status(201).json(session)
})

export default router
