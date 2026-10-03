import { describe, it, expect } from 'vitest'
import { formatInterval, nextInterval } from '../utils/srs.js'

const fresh = { easeFactor: 2.5, interval: 0, repetitions: 0 }

describe('nextInterval preview', () => {
  it('matches the SM-2 steps used by the server', () => {
    expect(nextInterval(fresh, 0)).toBe(0)
    expect(nextInterval(fresh, 2)).toBe(1)
    expect(nextInterval(fresh, 3)).toBe(4)
    expect(nextInterval({ ...fresh, repetitions: 1, interval: 1 }, 2)).toBe(6)
  })

  it('orders hard < good < easy for a learned card', () => {
    const card = { easeFactor: 2.5, interval: 10, repetitions: 3 }
    const [hard, good, easy] = [1, 2, 3].map((g) => nextInterval(card, g))
    expect(hard).toBeLessThan(good)
    expect(good).toBeLessThan(easy)
  })
})

describe('formatInterval', () => {
  it('formats minutes, days, months and years', () => {
    expect(formatInterval(0)).toBe('10m')
    expect(formatInterval(6)).toBe('6d')
    expect(formatInterval(60)).toBe('2mo')
    expect(formatInterval(730)).toBe('2.0y')
  })
})
