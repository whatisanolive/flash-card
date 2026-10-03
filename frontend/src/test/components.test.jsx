import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Flashcard from '../components/Flashcard.jsx'
import DeckCard from '../components/DeckCard.jsx'
import DeckForm from '../components/DeckForm.jsx'
import CardForm from '../components/CardForm.jsx'
import FilterChips from '../components/FilterChips.jsx'
import ErrorBoundary from '../components/ErrorBoundary.jsx'
import { renderWithProviders } from './utils.jsx'

const card = { id: 'c1', front: 'What is JSX?', back: 'A syntax extension' }

describe('<Flashcard />', () => {
  it('is an accessible button that flips on click', async () => {
    const onFlip = vi.fn()
    render(<Flashcard card={card} flipped={false} onFlip={onFlip} />)
    const btn = screen.getByRole('button', { name: /Question: What is JSX\?/ })
    await userEvent.click(btn)
    expect(onFlip).toHaveBeenCalledOnce()
  })

  it('announces the answer when flipped', () => {
    render(<Flashcard card={card} flipped onFlip={() => {}} />)
    expect(screen.getByRole('button', { name: /Answer: A syntax extension/ })).toBeInTheDocument()
  })
})

describe('<DeckCard />', () => {
  const deck = {
    id: 'd1',
    title: 'Biology',
    subject: 'Science',
    swatch: 'green',
    counts: { total: 3, new: 1, learning: 1, mastered: 1, due: 2 },
  }

  it('shows counts and links to a due-only study session', () => {
    renderWithProviders(<DeckCard deck={deck} onDelete={() => {}} />)
    expect(screen.getByText('3 cards')).toBeInTheDocument()
    expect(screen.getByText('2 due')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Review 2 due/ })).toHaveAttribute('href', '/decks/d1/study?mode=due')
  })

  it('handles an empty deck', () => {
    renderWithProviders(<DeckCard deck={{ ...deck, counts: { total: 0, new: 0, learning: 0, mastered: 0, due: 0 } }} onDelete={() => {}} />)
    expect(screen.getByText('No cards yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add cards/ })).toHaveAttribute('href', '/decks/d1')
  })

  it('calls onDelete with the deck', async () => {
    const onDelete = vi.fn()
    renderWithProviders(<DeckCard deck={deck} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete Biology' }))
    expect(onDelete).toHaveBeenCalledWith(deck)
  })
})

describe('<DeckForm />', () => {
  it('shows validation errors and does not submit an empty form', async () => {
    const onSubmit = vi.fn()
    render(<DeckForm onSubmit={onSubmit} onCancel={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Create deck' }))
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed values', async () => {
    const onSubmit = vi.fn()
    render(<DeckForm onSubmit={onSubmit} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText('Deck name'), '  Chemistry  ')
    await userEvent.type(screen.getByLabelText('Subject (optional)'), 'Science')
    await userEvent.click(screen.getByLabelText('blue'))
    await userEvent.click(screen.getByRole('button', { name: 'Create deck' }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Chemistry', subject: 'Science', description: '', swatch: 'blue' })
  })

  it('displays server-side field errors', async () => {
    const err = Object.assign(new Error('A deck with this title already exists'), {
      fields: { title: 'You already have a deck with this title' },
    })
    render(<DeckForm onSubmit={() => Promise.reject(err)} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText('Deck name'), 'Biology')
    await userEvent.click(screen.getByRole('button', { name: 'Create deck' }))
    expect(await screen.findByText('You already have a deck with this title')).toBeInTheDocument()
    expect(screen.getByText('A deck with this title already exists')).toBeInTheDocument()
  })

  it('shows a live character counter', async () => {
    render(<DeckForm onSubmit={() => {}} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText('Deck name'), 'Maths')
    expect(screen.getByText('5/60')).toBeInTheDocument()
  })
})

describe('<CardForm />', () => {
  it('clears itself after adding when keepOpen is set', async () => {
    const onSubmit = vi.fn(() => Promise.resolve())
    render(<CardForm keepOpen onSubmit={onSubmit} onCancel={() => {}} />)
    const front = screen.getByLabelText('Question / term (front)')
    await userEvent.type(front, 'Capital of France?')
    await userEvent.type(screen.getByLabelText('Answer / definition (back)'), 'Paris')
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    expect(onSubmit).toHaveBeenCalledWith({ front: 'Capital of France?', back: 'Paris' })
    expect(front).toHaveValue('')
    expect(front).toHaveFocus()
  })
})

describe('<FilterChips />', () => {
  it('marks the active option and reports changes', async () => {
    const onChange = vi.fn()
    const options = [
      { value: 'all', label: 'All', count: 3 },
      { value: 'due', label: 'Due', count: 1 },
    ]
    render(<FilterChips options={options} value="all" onChange={onChange} label="Status" />)
    expect(screen.getByRole('button', { name: /All/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: /Due/ }))
    expect(onChange).toHaveBeenCalledWith('due')
  })
})

describe('<ErrorBoundary />', () => {
  it('renders a fallback instead of crashing the app', () => {
    const Boom = () => {
      throw new Error('kaboom')
    }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('kaboom')
    console.error.mockRestore()
  })
})
