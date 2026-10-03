import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { HttpError, notFound } from '../lib/httpError.js'
import { serializeCard, summarizeDeck, CARD_SUMMARY_FIELDS } from '../lib/serialize.js'
import { validate } from '../middleware/validate.js'
import {
  SWATCHES,
  deckSchema,
  deckUpdateSchema,
  cardSchema,
  importSchema,
  deckQuerySchema,
  cardQuerySchema,
  studyQuerySchema,
} from '../validators/schemas.js'

const router = Router()

// ---------- helpers ----------

async function findDeckOr404(id, include) {
  const deck = await prisma.deck.findUnique({ where: { id }, include })
  if (!deck) throw notFound('Deck')
  return deck
}

// SQLite comparisons are case-sensitive, so uniqueness is checked in JS.
// Fine at flashcard-app scale; with Postgres use `mode: 'insensitive'` instead.
async function assertUniqueTitle(title, ignoreId) {
  const decks = await prisma.deck.findMany({ select: { id: true, title: true } })
  const clash = decks.find((d) => d.id !== ignoreId && d.title.toLowerCase() === title.toLowerCase())
  if (clash) throw new HttpError(409, 'A deck with this title already exists', { title: 'You already have a deck with this title' })
}

export async function assertUniqueFront(deckId, front, ignoreId) {
  const cards = await prisma.card.findMany({ where: { deckId }, select: { id: true, front: true } })
  const clash = cards.find((c) => c.id !== ignoreId && c.front.toLowerCase() === front.toLowerCase())
  if (clash) throw new HttpError(409, 'This deck already has that question', { front: 'This question is already in the deck' })
}

async function nextSwatch() {
  const count = await prisma.deck.count()
  return SWATCHES[count % SWATCHES.length]
}

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------- decks: list / search / filter / sort ----------

router.get('/', validate(deckQuerySchema, 'query'), async (req, res) => {
  const { q, subject, sort } = req.validated
  const where = {}
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { subject: { contains: q } },
      { description: { contains: q } },
      { cards: { some: { OR: [{ front: { contains: q } }, { back: { contains: q } }] } } },
    ]
  }
  if (subject) where.subject = subject

  const orderBy = sort === 'title' ? { title: 'asc' } : sort === 'cards' ? { cards: { _count: 'desc' } } : { updatedAt: 'desc' }

  const decks = await prisma.deck.findMany({
    where,
    orderBy,
    include: { cards: { select: CARD_SUMMARY_FIELDS } },
  })

  const now = new Date()
  let result = decks.map((d) => summarizeDeck(d, now))
  if (sort === 'due') result.sort((a, b) => b.counts.due - a.counts.due)
  res.json(result)
})

router.get('/subjects', async (_req, res) => {
  const groups = await prisma.deck.groupBy({ by: ['subject'], _count: { _all: true }, orderBy: { subject: 'asc' } })
  res.json(groups.map((g) => ({ subject: g.subject, count: g._count._all })))
})

// ---------- decks: CRUD ----------

router.post('/', validate(deckSchema), async (req, res) => {
  await assertUniqueTitle(req.body.title)
  const deck = await prisma.deck.create({
    data: { ...req.body, swatch: req.body.swatch ?? (await nextSwatch()) },
  })
  res.status(201).json(summarizeDeck(deck))
})

router.post('/import', validate(importSchema), async (req, res) => {
  const { cards, ...deckData } = req.body
  await assertUniqueTitle(deckData.title)

  // Drop duplicate questions inside the imported file.
  const seen = new Set()
  const uniqueCards = cards.filter((c) => {
    const key = c.front.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const deck = await prisma.deck.create({
    data: {
      ...deckData,
      swatch: deckData.swatch ?? (await nextSwatch()),
      cards: { create: uniqueCards },
    },
    include: { cards: { select: CARD_SUMMARY_FIELDS } },
  })
  res.status(201).json(summarizeDeck(deck))
})

router.get('/:id', async (req, res) => {
  const deck = await findDeckOr404(req.params.id, { cards: { orderBy: { createdAt: 'asc' } } })
  const now = new Date()
  const summary = summarizeDeck(deck, now)
  res.json({ ...summary, cards: deck.cards.map((c) => serializeCard(c, now)) })
})

const updateDeck = [
  validate(deckUpdateSchema),
  async (req, res) => {
    await findDeckOr404(req.params.id)
    if (req.body.title) await assertUniqueTitle(req.body.title, req.params.id)
    const deck = await prisma.deck.update({
      where: { id: req.params.id },
      data: req.body,
      include: { cards: { select: CARD_SUMMARY_FIELDS } },
    })
    res.json(summarizeDeck(deck))
  },
]
router.put('/:id', updateDeck)
router.patch('/:id', updateDeck)

router.delete('/:id', async (req, res) => {
  await findDeckOr404(req.params.id)
  await prisma.deck.delete({ where: { id: req.params.id } }) // cards, reviews, sessions cascade
  res.status(204).end()
})

// Reset all spaced-repetition progress in a deck (cards become "new" again).
router.post('/:id/reset', async (req, res) => {
  await findDeckOr404(req.params.id)
  const { count } = await prisma.card.updateMany({
    where: { deckId: req.params.id },
    data: { easeFactor: 2.5, interval: 0, repetitions: 0, lapses: 0, reviewCount: 0, dueAt: new Date(), lastReviewedAt: null },
  })
  res.json({ reset: count })
})

router.get('/:id/export', async (req, res) => {
  const deck = await findDeckOr404(req.params.id, { cards: { orderBy: { createdAt: 'asc' } } })
  const payload = {
    title: deck.title,
    subject: deck.subject,
    description: deck.description,
    swatch: deck.swatch,
    cards: deck.cards.map(({ front, back }) => ({ front, back })),
  }
  const filename = deck.title.replace(/[^\w-]+/g, '-').toLowerCase()
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`)
  res.json(payload)
})

// ---------- cards inside a deck ----------

router.get('/:id/cards', validate(cardQuerySchema, 'query'), async (req, res) => {
  const { q, status } = req.validated
  await findDeckOr404(req.params.id)
  const where = { deckId: req.params.id }
  if (q) where.OR = [{ front: { contains: q } }, { back: { contains: q } }]

  const now = new Date()
  const cards = (await prisma.card.findMany({ where, orderBy: { createdAt: 'asc' } })).map((c) => serializeCard(c, now))
  res.json(status ? cards.filter((c) => (status === 'due' ? c.due : c.status === status)) : cards)
})

router.post('/:id/cards', validate(cardSchema), async (req, res) => {
  const deck = await findDeckOr404(req.params.id)
  await assertUniqueFront(deck.id, req.body.front)
  const [card] = await prisma.$transaction([
    prisma.card.create({ data: { ...req.body, deckId: deck.id } }),
    prisma.deck.update({ where: { id: deck.id }, data: { updatedAt: new Date() } }),
  ])
  res.status(201).json(serializeCard(card))
})

// Cards to study: all cards, or only those due now. Optional shuffle.
router.get('/:id/study', validate(studyQuerySchema, 'query'), async (req, res) => {
  const { mode, shuffle: doShuffle } = req.validated
  const deck = await findDeckOr404(req.params.id)
  const now = new Date()
  const where = { deckId: deck.id, ...(mode === 'due' && { dueAt: { lte: now } }) }
  const cards = await prisma.card.findMany({ where, orderBy: mode === 'due' ? { dueAt: 'asc' } : { createdAt: 'asc' } })
  const serialized = cards.map((c) => serializeCard(c, now))
  res.json({ deck: { id: deck.id, title: deck.title, swatch: deck.swatch }, mode, cards: doShuffle ? shuffle(serialized) : serialized })
})

export default router
