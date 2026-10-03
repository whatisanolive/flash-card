// SM-2 spaced-repetition scheduler (the algorithm behind SuperMemo / Anki).
// Pure function: takes a card's current state and a grade, returns the new state.
// The same file is mirrored in the frontend (frontend/src/utils/srs.js) to preview intervals.

export const GRADES = { again: 0, hard: 1, good: 2, easy: 3 }

// Our 4 buttons mapped onto SM-2's 0–5 quality scale.
const QUALITY = [1, 3, 4, 5]
const MIN_EASE = 1.3
const DAY_MS = 24 * 60 * 60 * 1000
const RELEARN_MS = 10 * 60 * 1000 // "again" cards come back in 10 minutes

export function schedule(card, grade, now = new Date()) {
  if (!Number.isInteger(grade) || grade < 0 || grade > 3) {
    throw new RangeError(`grade must be 0–3, got ${grade}`)
  }

  const q = QUALITY[grade]
  const ease = Math.max(MIN_EASE, card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  // Forgotten: reset the streak and show it again shortly.
  if (grade === GRADES.again) {
    return {
      easeFactor: round2(ease),
      interval: 0,
      repetitions: 0,
      lapses: card.lapses + 1,
      reviewCount: card.reviewCount + 1,
      dueAt: new Date(now.getTime() + RELEARN_MS),
      lastReviewedAt: now,
    }
  }

  let interval
  if (card.repetitions === 0) interval = grade === GRADES.easy ? 4 : 1
  else if (card.repetitions === 1) interval = grade === GRADES.hard ? 3 : 6
  else interval = Math.round(card.interval * ease)

  if (grade === GRADES.hard) interval = Math.max(1, Math.round(interval * 0.8))
  if (grade === GRADES.easy && card.repetitions > 0) interval = Math.round(interval * 1.3)

  return {
    easeFactor: round2(ease),
    interval,
    repetitions: card.repetitions + 1,
    lapses: card.lapses,
    reviewCount: card.reviewCount + 1,
    dueAt: new Date(now.getTime() + interval * DAY_MS),
    lastReviewedAt: now,
  }
}

// Derived, human-readable status used for filtering and stats.
export const MASTERED_INTERVAL = 7

export function cardStatus(card) {
  if (card.reviewCount === 0) return 'new'
  if (card.interval >= MASTERED_INTERVAL) return 'mastered'
  return 'learning'
}

export function isDue(card, now = new Date()) {
  return new Date(card.dueAt) <= now
}

function round2(n) {
  return Math.round(n * 100) / 100
}
