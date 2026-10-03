import { useCallback, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { cardsApi, decksApi } from '../api/index.js'
import { useApi } from '../hooks/useApi.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useToast } from '../context/ToastContext.jsx'
import { useConfirm } from '../context/ConfirmContext.jsx'
import CardForm from '../components/CardForm.jsx'
import CardRow from '../components/CardRow.jsx'
import MasteryBar from '../components/MasteryBar.jsx'
import SearchBar from '../components/SearchBar.jsx'
import FilterChips from '../components/FilterChips.jsx'
import { EmptyState, ErrorState, Spinner } from '../components/Feedback.jsx'
import { downloadJson, plural } from '../utils/format.js'
import { withCounts } from '../utils/deck.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function DeckDetailPage() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const confirm = useConfirm()

  const { data: deck, error, reload, setData } = useApi((signal) => decksApi.get(deckId, signal), [deckId])
  useDocumentTitle(deck?.title)

  const [showForm, setShowForm] = useState(Boolean(location.state?.openCardForm))
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [shuffle, setShuffle] = useLocalStorage('recall.shuffle', false)

  // Card search/filter happens client-side — the deck is already loaded,
  // and useMemo means we only re-filter when the inputs actually change.
  const visibleCards = useMemo(() => {
    if (!deck) return []
    const term = search.trim().toLowerCase()
    return deck.cards
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => (status === 'all' ? true : status === 'due' ? card.due : card.status === status))
      .filter(({ card }) => !term || card.front.toLowerCase().includes(term) || card.back.toLowerCase().includes(term))
  }, [deck, search, status])

  const addCard = useCallback(
    async (values) => {
      const card = await decksApi.addCard(deckId, values) // errors surface inline in the form
      setData((d) => withCounts({ ...d, cards: [...d.cards, card] }))
      toast.success('Card added')
    },
    [deckId, setData, toast],
  )

  const saveCard = useCallback(
    async (cardId, values) => {
      const updated = await cardsApi.update(cardId, values)
      setData((d) => withCounts({ ...d, cards: d.cards.map((c) => (c.id === cardId ? updated : c)) }))
      toast.success('Card updated')
    },
    [setData, toast],
  )

  const deleteCard = useCallback(
    async (card) => {
      const ok = await confirm({ title: 'Delete this card?', message: `“${card.front}”`, confirmLabel: 'Delete', danger: true })
      if (!ok) return
      try {
        await cardsApi.remove(card.id)
        setData((d) => withCounts({ ...d, cards: d.cards.filter((c) => c.id !== card.id) }))
        toast.success('Card deleted')
      } catch (err) {
        toast.error(err.message)
      }
    },
    [confirm, setData, toast],
  )

  async function deleteDeck() {
    const ok = await confirm({
      title: `Delete “${deck.title}”?`,
      message: `This permanently removes the deck, its ${plural(deck.counts.total, 'card')} and all study history.`,
      confirmLabel: 'Delete deck',
      danger: true,
    })
    if (!ok) return
    try {
      await decksApi.remove(deck.id)
      toast.success(`Deleted “${deck.title}”`)
      navigate('/')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function resetProgress() {
    const ok = await confirm({
      title: 'Reset study progress?',
      message: 'Every card goes back to “New” and becomes due now. Your cards are kept.',
      confirmLabel: 'Reset progress',
      danger: true,
    })
    if (!ok) return
    try {
      await decksApi.resetProgress(deck.id)
      reload()
      toast.success('Progress reset')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function exportDeck() {
    try {
      const data = await decksApi.exportDeck(deck.id)
      downloadJson(data, `${deck.title.replace(/[^\w-]+/g, '-').toLowerCase()}.json`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (error?.isNotFound) return <NotFoundPage what="deck" />
  if (error && !deck) return <ErrorState error={error} onRetry={reload} title="Couldn't load this deck" />
  if (!deck) return <Spinner />

  const { counts } = deck
  const studyUrl = (mode) => `/decks/${deck.id}/study?mode=${mode}${shuffle ? '&shuffle=1' : ''}`
  const statusOptions = [
    { value: 'all', label: 'All', count: counts.total },
    { value: 'due', label: 'Due', count: counts.due },
    { value: 'new', label: 'New', count: counts.new },
    { value: 'learning', label: 'Learning', count: counts.learning },
    { value: 'mastered', label: 'Mastered', count: counts.mastered },
  ]

  return (
    <section className={`deck-detail deck-detail--${deck.swatch}`}>
      <Link to="/" className="back-link">
        ← All decks
      </Link>

      <div className="page-header">
        <div className="deck-detail__intro">
          <p className="eyebrow">{deck.subject}</p>
          <h1>{deck.title}</h1>
          {deck.description && <p className="deck-detail__desc">{deck.description}</p>}
        </div>
        <div className="page-header__actions">
          <Link
            to={studyUrl('due')}
            className={`btn btn--primary${counts.due === 0 ? ' btn--disabled' : ''}`}
            aria-disabled={counts.due === 0}
            onClick={(e) => counts.due === 0 && e.preventDefault()}
          >
            Review {counts.due} due →
          </Link>
          <Link
            to={studyUrl('all')}
            className={`btn btn--ghost${counts.total === 0 ? ' btn--disabled' : ''}`}
            aria-disabled={counts.total === 0}
            onClick={(e) => counts.total === 0 && e.preventDefault()}
          >
            Study all
          </Link>
        </div>
      </div>

      {counts.total > 0 && (
        <div className="panel deck-detail__progress">
          <MasteryBar counts={counts} />
          <label className="toggle">
            <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
            Shuffle cards when studying
          </label>
        </div>
      )}

      <div className="deck-detail__tools">
        <button className="btn btn--ghost btn--sm" onClick={() => setShowForm((s) => !s)} aria-expanded={showForm}>
          {showForm ? 'Hide form' : '+ Add card'}
        </button>
        <Link to={`/decks/${deck.id}/edit`} className="btn btn--ghost btn--sm">
          Edit deck
        </Link>
        <button className="btn btn--ghost btn--sm" onClick={exportDeck} disabled={counts.total === 0}>
          Export JSON
        </button>
        <button className="btn btn--ghost btn--sm" onClick={resetProgress} disabled={counts.total === 0}>
          Reset progress
        </button>
        <button className="btn btn--ghost btn--sm btn--danger-text" onClick={deleteDeck}>
          Delete deck
        </button>
      </div>

      {showForm && <CardForm keepOpen onSubmit={addCard} onCancel={() => setShowForm(false)} />}

      {counts.total === 0 ? (
        <EmptyState title="This deck has no cards yet" hint="Add your first card to start studying.">
          {!showForm && (
            <button className="btn btn--primary" onClick={() => setShowForm(true)}>
              + Add card
            </button>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="toolbar toolbar--cards">
            <SearchBar value={search} onChange={setSearch} placeholder="Search cards…" label="Search cards in this deck" />
          </div>
          <FilterChips label="Filter cards by status" options={statusOptions} value={status} onChange={setStatus} />

          {visibleCards.length === 0 ? (
            <EmptyState title="No cards match" hint="Try another search term or status filter." />
          ) : (
            <ul className="card-table">
              {visibleCards.map(({ card, index }) => (
                <CardRow key={card.id} card={card} index={index} onSave={saveCard} onDelete={deleteCard} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
