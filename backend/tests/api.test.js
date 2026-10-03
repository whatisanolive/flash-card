import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import prisma from '../src/lib/prisma.js'

// Safety net: these tests delete rows, so never run them against a real database.
if (!process.env.DATABASE_URL?.includes('test.db')) {
  throw new Error(`Refusing to run API tests against ${process.env.DATABASE_URL}. Run them with "npm test" inside backend/.`)
}

const app = createApp()
const api = () => request(app)

async function makeDeck(body = {}) {
  const res = await api().post('/api/decks').send({ title: 'Test Deck', subject: 'Testing', ...body })
  expect(res.status).toBe(201)
  return res.body
}

beforeEach(async () => {
  await prisma.review.deleteMany()
  await prisma.studySession.deleteMany()
  await prisma.card.deleteMany()
  await prisma.deck.deleteMany()
})

afterAll(() => prisma.$disconnect())

describe('health', () => {
  it('reports ok', async () => {
    const res = await api().get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})

describe('decks CRUD', () => {
  it('creates, reads, updates and deletes a deck', async () => {
    const deck = await makeDeck({ description: '  trimmed  ' })
    expect(deck.id).toBeTruthy()
    expect(deck.description).toBe('trimmed')
    expect(deck.counts.total).toBe(0)

    const read = await api().get(`/api/decks/${deck.id}`)
    expect(read.status).toBe(200)
    expect(read.body.title).toBe('Test Deck')
    expect(read.body.cards).toEqual([])

    const upd = await api().put(`/api/decks/${deck.id}`).send({ title: 'Renamed', swatch: 'rose' })
    expect(upd.status).toBe(200)
    expect(upd.body.title).toBe('Renamed')
    expect(upd.body.swatch).toBe('rose')

    expect((await api().delete(`/api/decks/${deck.id}`)).status).toBe(204)
    expect((await api().get(`/api/decks/${deck.id}`)).status).toBe(404)
  })

  it('defaults subject to "General"', async () => {
    const deck = await makeDeck({ subject: '' })
    expect(deck.subject).toBe('General')
  })

  it('returns field errors for invalid input', async () => {
    const res = await api().post('/api/decks').send({ title: 'x', swatch: 'purple' })
    expect(res.status).toBe(400)
    expect(res.body.error.fields.title).toMatch(/at least 2/)
    expect(res.body.error.fields.swatch).toBeDefined()
  })

  it('rejects duplicate titles case-insensitively with 409', async () => {
    await makeDeck({ title: 'Physics' })
    const res = await api().post('/api/decks').send({ title: 'PHYSICS' })
    expect(res.status).toBe(409)
    expect(res.body.error.fields.title).toBeDefined()
  })

  it('returns 404 for unknown decks and routes', async () => {
    expect((await api().get('/api/decks/does-not-exist')).status).toBe(404)
    expect((await api().put('/api/decks/does-not-exist').send({ title: 'Nope' })).status).toBe(404)
    expect((await api().get('/api/unknown')).status).toBe(404)
  })

  it('rejects malformed JSON with 400', async () => {
    const res = await api().post('/api/decks').set('Content-Type', 'application/json').send('{bad json')
    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/JSON/)
  })
})

describe('search, filter and sort', () => {
  beforeEach(async () => {
    const bio = await makeDeck({ title: 'Cell Biology', subject: 'Biology' })
    await makeDeck({ title: 'Algebra', subject: 'Maths' })
    await makeDeck({ title: 'Geometry', subject: 'Maths' })
    await api().post(`/api/decks/${bio.id}/cards`).send({ front: 'Powerhouse of the cell?', back: 'Mitochondria' })
  })

  it('searches deck titles', async () => {
    const res = await api().get('/api/decks?q=alg')
    expect(res.body.map((d) => d.title)).toEqual(['Algebra'])
  })

  it('searches inside card content', async () => {
    const res = await api().get('/api/decks?q=mitochondria')
    expect(res.body.map((d) => d.title)).toEqual(['Cell Biology'])
  })

  it('filters by subject', async () => {
    const res = await api().get('/api/decks?subject=Maths')
    expect(res.body).toHaveLength(2)
  })

  it('sorts by title', async () => {
    const res = await api().get('/api/decks?sort=title')
    expect(res.body.map((d) => d.title)).toEqual(['Algebra', 'Cell Biology', 'Geometry'])
  })

  it('lists subjects with counts', async () => {
    const res = await api().get('/api/decks/subjects')
    expect(res.body).toEqual([
      { subject: 'Biology', count: 1 },
      { subject: 'Maths', count: 2 },
    ])
  })

  it('rejects an invalid sort key', async () => {
    expect((await api().get('/api/decks?sort=banana')).status).toBe(400)
  })
})

describe('cards CRUD and review', () => {
  it('adds, edits, filters and deletes cards', async () => {
    const deck = await makeDeck()
    const created = await api().post(`/api/decks/${deck.id}/cards`).send({ front: 'Q one', back: 'A one' })
    expect(created.status).toBe(201)
    expect(created.body.status).toBe('new')
    expect(created.body.due).toBe(true)

    await api().post(`/api/decks/${deck.id}/cards`).send({ front: 'Q two', back: 'A two' })

    const edited = await api().patch(`/api/cards/${created.body.id}`).send({ back: 'A one (edited)' })
    expect(edited.status).toBe(200)
    expect(edited.body.back).toBe('A one (edited)')

    const search = await api().get(`/api/decks/${deck.id}/cards?q=edited`)
    expect(search.body).toHaveLength(1)

    expect((await api().delete(`/api/cards/${created.body.id}`)).status).toBe(204)
    const detail = await api().get(`/api/decks/${deck.id}`)
    expect(detail.body.counts.total).toBe(1)
  })

  it('validates cards', async () => {
    const deck = await makeDeck()
    const empty = await api().post(`/api/decks/${deck.id}/cards`).send({ front: '', back: '' })
    expect(empty.status).toBe(400)
    expect(Object.keys(empty.body.error.fields)).toEqual(expect.arrayContaining(['front', 'back']))

    const same = await api().post(`/api/decks/${deck.id}/cards`).send({ front: 'Same', back: 'same' })
    expect(same.status).toBe(400)
    expect(same.body.error.fields.back).toMatch(/different/)

    await api().post(`/api/decks/${deck.id}/cards`).send({ front: 'Dup', back: 'x' })
    const dup = await api().post(`/api/decks/${deck.id}/cards`).send({ front: 'dup', back: 'y' })
    expect(dup.status).toBe(409)
  })

  it('reschedules a card when reviewed and records history', async () => {
    const deck = await makeDeck()
    const { body: card } = await api().post(`/api/decks/${deck.id}/cards`).send({ front: 'Question', back: 'Answer' })

    const res = await api().post(`/api/cards/${card.id}/review`).send({ grade: 2 })
    expect(res.status).toBe(200)
    expect(res.body.interval).toBe(1)
    expect(res.body.status).toBe('learning')
    expect(res.body.due).toBe(false)
    expect(await prisma.review.count()).toBe(1)

    const due = await api().get(`/api/decks/${deck.id}/study?mode=due`)
    expect(due.body.cards).toHaveLength(0)
    const all = await api().get(`/api/decks/${deck.id}/study?mode=all`)
    expect(all.body.cards).toHaveLength(1)

    expect((await api().post(`/api/cards/${card.id}/review`).send({ grade: 9 })).status).toBe(400)
  })

  it('resets deck progress', async () => {
    const deck = await makeDeck()
    const { body: card } = await api().post(`/api/decks/${deck.id}/cards`).send({ front: 'Question', back: 'Answer' })
    await api().post(`/api/cards/${card.id}/review`).send({ grade: 3 })
    const res = await api().post(`/api/decks/${deck.id}/reset`)
    expect(res.body.reset).toBe(1)
    const after = await api().get(`/api/cards/${card.id}`)
    expect(after.body.status).toBe('new')
  })
})

describe('import / export', () => {
  it('round-trips a deck through export and import', async () => {
    const deck = await makeDeck({ title: 'Export Me' })
    await api().post(`/api/decks/${deck.id}/cards`).send({ front: 'Question 1', back: 'Answer 1' })
    const exported = await api().get(`/api/decks/${deck.id}/export`)
    expect(exported.headers['content-disposition']).toMatch(/export-me\.json/)

    const imported = await api()
      .post('/api/decks/import')
      .send({ ...exported.body, title: 'Imported', cards: [...exported.body.cards, { front: 'question 1', back: 'dup' }] })
    expect(imported.status).toBe(201)
    expect(imported.body.counts.total).toBe(1) // duplicate question dropped
  })
})

describe('sessions and stats', () => {
  it('records sessions and aggregates stats', async () => {
    const deck = await makeDeck()
    const { body: card } = await api().post(`/api/decks/${deck.id}/cards`).send({ front: 'Question', back: 'Answer' })
    await api().post(`/api/cards/${card.id}/review`).send({ grade: 3 })

    const session = await api().post('/api/sessions').send({ deckId: deck.id, total: 1, known: 1, review: 0, durationSec: 12 })
    expect(session.status).toBe(201)

    const stats = await api().get('/api/stats?tzOffset=0')
    expect(stats.status).toBe(200)
    expect(stats.body.totals).toMatchObject({ decks: 1, total: 1, learning: 1 })
    expect(stats.body.reviewsToday).toBe(1)
    expect(stats.body.streak).toBe(1)
    expect(stats.body.accuracy).toBe(100)
    expect(stats.body.activity).toHaveLength(14)
    expect(stats.body.recentSessions[0].deck.title).toBe('Test Deck')
  })

  it('rejects a session for a missing deck', async () => {
    const res = await api().post('/api/sessions').send({ deckId: 'nope', total: 1, known: 1, review: 0 })
    expect(res.status).toBe(404)
  })
})
