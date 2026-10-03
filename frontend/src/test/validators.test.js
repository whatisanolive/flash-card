import { describe, it, expect } from 'vitest'
import { validateCard, validateDeck, validateImport } from '../utils/validators.js'

describe('validateDeck', () => {
  const ok = { title: 'Biology', subject: 'Science', description: '', swatch: 'green' }

  it('accepts a valid deck', () => {
    expect(validateDeck(ok)).toEqual({})
  })

  it('requires a title of at least 2 characters', () => {
    expect(validateDeck({ ...ok, title: '  ' }).title).toBe('Title is required')
    expect(validateDeck({ ...ok, title: 'A' }).title).toMatch(/at least 2/)
  })

  it('limits lengths', () => {
    expect(validateDeck({ ...ok, title: 'x'.repeat(61) }).title).toMatch(/at most 60/)
    expect(validateDeck({ ...ok, description: 'x'.repeat(201) }).description).toMatch(/at most 200/)
  })

  it('rejects odd characters in subject', () => {
    expect(validateDeck({ ...ok, subject: 'Maths<script>' }).subject).toMatch(/only contain/)
    expect(validateDeck({ ...ok, subject: 'C++ & Java' }).subject).toBeUndefined()
  })
})

describe('validateCard', () => {
  it('requires both sides', () => {
    const errors = validateCard({ front: '', back: '' })
    expect(errors.front).toBe('Question is required')
    expect(errors.back).toBe('Answer is required')
  })

  it('rejects an answer identical to the question (case-insensitive)', () => {
    expect(validateCard({ front: 'Paris', back: 'paris' }).back).toMatch(/different/)
  })

  it('accepts a normal card', () => {
    expect(validateCard({ front: 'Capital of France?', back: 'Paris' })).toEqual({})
  })
})

describe('validateImport', () => {
  it('accepts a well-formed deck file', () => {
    expect(validateImport({ title: 'X', cards: [{ front: 'a', back: 'b' }] })).toBeNull()
  })

  it('explains what is wrong', () => {
    expect(validateImport([])).toMatch(/single deck/)
    expect(validateImport({ cards: [] })).toMatch(/title/)
    expect(validateImport({ title: 'X', cards: [{ front: 'a' }] })).toMatch(/Card #1/)
  })
})
