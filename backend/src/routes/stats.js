import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { summarizeDeck, CARD_SUMMARY_FIELDS } from '../lib/serialize.js'

const router = Router()
const DAY_MS = 24 * 60 * 60 * 1000
const ACTIVITY_DAYS = 14

// Date key (YYYY-MM-DD) in the *viewer's* timezone. The client sends its
// Date#getTimezoneOffset() so "today" matches what the user sees.
function dayKey(date, tzOffsetMin) {
  return new Date(date.getTime() - tzOffsetMin * 60 * 1000).toISOString().slice(0, 10)
}

export function computeStreak(activeDays, todayKey) {
  let cursor = new Date(`${todayKey}T00:00:00Z`)
  // A streak is still alive if you studied yesterday but not yet today.
  if (!activeDays.has(todayKey)) cursor = new Date(cursor.getTime() - DAY_MS)
  let streak = 0
  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor = new Date(cursor.getTime() - DAY_MS)
  }
  return streak
}

router.get('/', async (req, res) => {
  const offset = Number.isFinite(Number(req.query.tzOffset)) ? Number(req.query.tzOffset) : new Date().getTimezoneOffset()
  const now = new Date()
  const todayKey = dayKey(now, offset)

  const [decks, reviews, recentSessions] = await Promise.all([
    prisma.deck.findMany({ orderBy: { title: 'asc' }, include: { cards: { select: CARD_SUMMARY_FIELDS } } }),
    prisma.review.findMany({
      where: { reviewedAt: { gte: new Date(now.getTime() - 365 * DAY_MS) } },
      select: { reviewedAt: true, grade: true },
    }),
    prisma.studySession.findMany({
      orderBy: { completedAt: 'desc' },
      take: 5,
      include: { deck: { select: { title: true, swatch: true } } },
    }),
  ])

  const deckStats = decks.map((d) => summarizeDeck(d, now))
  const totals = deckStats.reduce(
    (acc, d) => {
      for (const k of ['total', 'new', 'learning', 'mastered', 'due']) acc[k] += d.counts[k]
      return acc
    },
    { decks: decks.length, total: 0, new: 0, learning: 0, mastered: 0, due: 0 },
  )

  // Reviews per day for the activity chart.
  const perDay = new Map()
  for (const r of reviews) {
    const key = dayKey(r.reviewedAt, offset)
    perDay.set(key, (perDay.get(key) ?? 0) + 1)
  }
  const activity = []
  for (let i = ACTIVITY_DAYS - 1; i >= 0; i--) {
    const key = new Date(new Date(`${todayKey}T00:00:00Z`).getTime() - i * DAY_MS).toISOString().slice(0, 10)
    activity.push({ date: key, reviews: perDay.get(key) ?? 0 })
  }

  const last30 = reviews.filter((r) => r.reviewedAt >= new Date(now.getTime() - 30 * DAY_MS))
  const correct = last30.filter((r) => r.grade >= 2).length

  res.json({
    totals,
    reviewsToday: perDay.get(todayKey) ?? 0,
    totalReviews: reviews.length,
    streak: computeStreak(new Set(perDay.keys()), todayKey),
    accuracy: last30.length ? Math.round((correct / last30.length) * 100) : null,
    activity,
    decks: deckStats.map(({ id, title, swatch, subject, counts }) => ({ id, title, swatch, subject, counts })),
    recentSessions,
  })
})

export default router
