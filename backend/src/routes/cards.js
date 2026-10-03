import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { HttpError, notFound } from '../lib/httpError.js'
import { schedule } from '../lib/srs.js'
import { serializeCard } from '../lib/serialize.js'
import { validate } from '../middleware/validate.js'
import { cardUpdateSchema, reviewSchema } from '../validators/schemas.js'
import { assertUniqueFront } from './decks.js'

const router = Router()

async function findCardOr404(id) {
  const card = await prisma.card.findUnique({ where: { id } })
  if (!card) throw notFound('Card')
  return card
}

router.get('/:id', async (req, res) => {
  res.json(serializeCard(await findCardOr404(req.params.id)))
})

const updateCard = [
  validate(cardUpdateSchema),
  async (req, res) => {
    const card = await findCardOr404(req.params.id)
    const next = { front: req.body.front ?? card.front, back: req.body.back ?? card.back }
    if (next.front.toLowerCase() === next.back.toLowerCase()) {
      throw new HttpError(400, 'Please fix the highlighted fields', { back: 'Answer must be different from the question' })
    }
    if (req.body.front) await assertUniqueFront(card.deckId, req.body.front, card.id)
    const updated = await prisma.card.update({ where: { id: card.id }, data: req.body })
    res.json(serializeCard(updated))
  },
]
router.put('/:id', updateCard)
router.patch('/:id', updateCard)

router.delete('/:id', async (req, res) => {
  await findCardOr404(req.params.id)
  await prisma.card.delete({ where: { id: req.params.id } })
  res.status(204).end()
})

// Record a study answer and reschedule the card with SM-2.
router.post('/:id/review', validate(reviewSchema), async (req, res) => {
  const card = await findCardOr404(req.params.id)
  const now = new Date()
  const next = schedule(card, req.body.grade, now)
  const [updated] = await prisma.$transaction([
    prisma.card.update({ where: { id: card.id }, data: next }),
    prisma.review.create({ data: { cardId: card.id, grade: req.body.grade, reviewedAt: now } }),
  ])
  res.json(serializeCard(updated, now))
})

export default router
