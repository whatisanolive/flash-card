import { describe, it, expect } from 'vitest'
import { schedule, cardStatus, isDue, GRADES } from '../src/lib/srs.js'
import { computeStreak } from '../src/routes/stats.js'

const fresh = { easeFactor: 2.5, interval: 0, repetitions: 0, lapses: 0, reviewCount: 0 }
const NOW = new Date('2026-09-01T10:00:00Z')
const DAY = 24 * 60 * 60 * 1000

describe('SM-2 schedule()', () => {
  it('schedules a new card 1 day out when answered "good"', () => {
    const next = schedule(fresh, GRADES.good, NOW)
    expect(next.interval).toBe(1)
    expect(next.repetitions).toBe(1)
    expect(next.dueAt.getTime() - NOW.getTime()).toBe(DAY)
    expect(next.reviewCount).toBe(1)
  })

  it('grows the interval on consecutive successes (1 → 6 → ~15 days)', () => {
    const a = schedule(fresh, GRADES.good, NOW)
    const b = schedule(a, GRADES.good, NOW)
    const c = schedule(b, GRADES.good, NOW)
    expect(b.interval).toBe(6)
    expect(c.interval).toBe(Math.round(6 * c.easeFactor))
    expect(c.interval).toBeGreaterThan(b.interval)
  })

  it('resets the streak and counts a lapse on "again"', () => {
    const learned = { ...fresh, interval: 10, repetitions: 3, reviewCount: 3 }
    const next = schedule(learned, GRADES.again, NOW)
    expect(next.repetitions).toBe(0)
    expect(next.interval).toBe(0)
    expect(next.lapses).toBe(1)
    expect(next.dueAt.getTime() - NOW.getTime()).toBe(10 * 60 * 1000)
  })

  it('never lets the ease factor drop below 1.3', () => {
    let card = fresh
    for (let i = 0; i < 20; i++) card = schedule(card, GRADES.again, NOW)
    expect(card.easeFactor).toBe(1.3)
  })

  it('gives "easy" a longer interval than "good"', () => {
    const base = { ...fresh, interval: 6, repetitions: 2, reviewCount: 2 }
    expect(schedule(base, GRADES.easy, NOW).interval).toBeGreaterThan(schedule(base, GRADES.good, NOW).interval)
    expect(schedule(base, GRADES.hard, NOW).interval).toBeLessThan(schedule(base, GRADES.good, NOW).interval)
  })

  it('rejects invalid grades', () => {
    expect(() => schedule(fresh, 7, NOW)).toThrow(RangeError)
  })
})

describe('card status helpers', () => {
  it('classifies new / learning / mastered', () => {
    expect(cardStatus(fresh)).toBe('new')
    expect(cardStatus({ ...fresh, reviewCount: 2, interval: 3 })).toBe('learning')
    expect(cardStatus({ ...fresh, reviewCount: 4, interval: 12 })).toBe('mastered')
  })

  it('detects due cards', () => {
    expect(isDue({ dueAt: new Date(NOW.getTime() - 1) }, NOW)).toBe(true)
    expect(isDue({ dueAt: new Date(NOW.getTime() + DAY) }, NOW)).toBe(false)
  })
})

describe('computeStreak()', () => {
  it('counts consecutive days ending today', () => {
    expect(computeStreak(new Set(['2026-09-01', '2026-09-02', '2026-09-03']), '2026-09-03')).toBe(3)
  })
  it('keeps the streak alive if the last study day was yesterday', () => {
    expect(computeStreak(new Set(['2026-09-01', '2026-09-02']), '2026-09-03')).toBe(2)
  })
  it('breaks on a gap', () => {
    expect(computeStreak(new Set(['2026-08-30', '2026-09-03']), '2026-09-03')).toBe(1)
    expect(computeStreak(new Set(), '2026-09-03')).toBe(0)
  })
})
