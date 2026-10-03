import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from './utils.jsx'
import { studyReducer } from '../pages/StudyPage.jsx'

vi.mock('../api/index.js', async (orig) => {
  const actual = await orig()
  return {
    ...actual,
    decksApi: { list: vi.fn(), subjects: vi.fn(), remove: vi.fn(), get: vi.fn(), study: vi.fn() },
    cardsApi: { review: vi.fn(() => Promise.resolve({})) },
    sessionsApi: { create: vi.fn(() => Promise.resolve({})) },
  }
})

const { decksApi, cardsApi, sessionsApi } = await import('../api/index.js')
const { default: DashboardPage } = await import('../pages/DashboardPage.jsx')
const { default: StudyPage } = await import('../pages/StudyPage.jsx')

const counts = (total, due = 0) => ({ total, new: total, learning: 0, mastered: 0, due })
const DECKS = [
  { id: 'a', title: 'Algebra', subject: 'Maths', swatch: 'blue', counts: counts(3, 1) },
  { id: 'b', title: 'Biology', subject: 'Science', swatch: 'green', counts: counts(2) },
]

beforeEach(() => {
  vi.clearAllMocks()
  decksApi.subjects.mockResolvedValue([
    { subject: 'Maths', count: 1 },
    { subject: 'Science', count: 1 },
  ])
  decksApi.list.mockImplementation(({ q }) =>
    Promise.resolve(q ? DECKS.filter((d) => d.title.toLowerCase().includes(q.toLowerCase())) : DECKS),
  )
})

describe('DashboardPage', () => {
  it('lists decks with a summary line', async () => {
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText('Algebra')).toBeInTheDocument()
    expect(screen.getByText('Biology')).toBeInTheDocument()
    expect(screen.getByText(/2 decks · 5 cards/)).toBeInTheDocument()
    expect(screen.getByText('1 due for review')).toBeInTheDocument()
  })

  it('debounces search and queries the API with the term', async () => {
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Algebra')
    await userEvent.type(screen.getByLabelText('Search decks and cards'), 'bio')
    await waitFor(() => expect(screen.queryByText('Algebra')).not.toBeInTheDocument())
    expect(screen.getByText('Biology')).toBeInTheDocument()
    // One request for the final term, not one per keystroke.
    const queries = decksApi.list.mock.calls.map(([p]) => p.q)
    expect(queries).toContain('bio')
    expect(queries).not.toContain('b')
  })

  it('filters by subject chip', async () => {
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Algebra')
    await userEvent.click(within(screen.getByRole('group', { name: 'Filter by subject' })).getByRole('button', { name: /Maths/ }))
    await waitFor(() => expect(decksApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ subject: 'Maths' }), expect.anything()))
  })

  it('deletes a deck after confirmation', async () => {
    decksApi.remove.mockResolvedValue(null)
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Algebra')
    await userEvent.click(screen.getByRole('button', { name: 'Delete Algebra' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete deck' }))
    await waitFor(() => expect(screen.queryByText('Algebra')).not.toBeInTheDocument())
    expect(decksApi.remove).toHaveBeenCalledWith('a')
    expect(await screen.findByText('Deleted “Algebra”')).toBeInTheDocument()
  })

  it('shows an error with retry when the API is down', async () => {
    const { ApiError } = await import('../api/client.js')
    decksApi.list.mockRejectedValueOnce(new ApiError("Can't reach the server."))
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText('Server unreachable')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Algebra')).toBeInTheDocument()
  })
})

describe('StudyPage', () => {
  const studyCards = [
    { id: 'c1', front: 'Q1?', back: 'A1', easeFactor: 2.5, interval: 0, repetitions: 0 },
    { id: 'c2', front: 'Q2?', back: 'A2', easeFactor: 2.5, interval: 0, repetitions: 0 },
  ]

  const renderStudy = () =>
    renderWithProviders(
      <Routes>
        <Route path="/decks/:deckId/study" element={<StudyPage />} />
      </Routes>,
      { route: '/decks/d1/study?mode=all' },
    )

  it('runs a full session with the keyboard and saves results', async () => {
    decksApi.study.mockResolvedValue({ deck: { id: 'd1', title: 'Deck', swatch: 'green' }, mode: 'all', cards: studyCards })
    renderStudy()
    expect(await screen.findByText('Card 1 of 2')).toBeInTheDocument()

    await userEvent.keyboard(' ') // flip
    expect(screen.getByRole('group', { name: /How well/ })).toBeInTheDocument()
    await userEvent.keyboard('3') // good
    expect(cardsApi.review).toHaveBeenCalledWith('c1', 2)

    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument()
    await userEvent.keyboard(' ')
    await userEvent.keyboard('1') // again
    expect(cardsApi.review).toHaveBeenCalledWith('c2', 0)

    expect(await screen.findByText(/Session complete/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry 1 missed' })).toBeInTheDocument()
    await waitFor(() =>
      expect(sessionsApi.create).toHaveBeenCalledWith(expect.objectContaining({ deckId: 'd1', total: 2, known: 1, review: 1 })),
    )
  })

  it('shows an "all caught up" state when nothing is due', async () => {
    decksApi.study.mockResolvedValue({ deck: { id: 'd1', title: 'Deck', swatch: 'green' }, mode: 'due', cards: [] })
    renderWithProviders(
      <Routes>
        <Route path="/decks/:deckId/study" element={<StudyPage />} />
      </Routes>,
      { route: '/decks/d1/study?mode=due' },
    )
    expect(await screen.findByText(/All caught up/)).toBeInTheDocument()
  })
})

describe('studyReducer', () => {
  const cards = [{ id: 1 }, { id: 2 }]
  const started = studyReducer(undefined, { type: 'start', cards, now: 0 })

  it('ignores grading before the card is flipped', () => {
    expect(studyReducer(started, { type: 'grade', grade: 2 })).toBe(started)
  })

  it('records an answer and advances', () => {
    const flipped = studyReducer(started, { type: 'flip' })
    const next = studyReducer(flipped, { type: 'grade', grade: 3 })
    expect(next.index).toBe(1)
    expect(next.flipped).toBe(false)
    expect(next.answers).toEqual([{ card: cards[0], grade: 3 }])
  })
})
