import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { decksApi } from '../api/index.js'
import { useApi } from '../hooks/useApi.js'
import { useDebounce } from '../hooks/useDebounce.js'
import { useKeyboard } from '../hooks/useKeyboard.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { useToast } from '../context/ToastContext.jsx'
import { useConfirm } from '../context/ConfirmContext.jsx'
import DeckCard from '../components/DeckCard.jsx'
import SearchBar from '../components/SearchBar.jsx'
import FilterChips from '../components/FilterChips.jsx'
import { EmptyState, ErrorState, SkeletonGrid } from '../components/Feedback.jsx'
import { plural } from '../utils/format.js'
import { validateImport } from '../utils/validators.js'

const SORTS = [
  { value: 'recent', label: 'Recently updated' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'cards', label: 'Most cards' },
  { value: 'due', label: 'Most due' },
]

export default function DashboardPage() {
  useDocumentTitle('Your decks')
  const toast = useToast()
  const confirm = useConfirm()
  const searchRef = useRef(null)
  const fileRef = useRef(null)

  // Filters are React state, mirrored into the URL (?q=&subject=&sort=) so a
  // reload or shared link restores them. State is the source of truth, which
  // keeps rapid successive changes from reading stale URL params.
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(() => params.get('q') ?? '')
  const [subject, setSubject] = useState(() => params.get('subject') ?? '')
  const [sort, setSort] = useState(() => params.get('sort') ?? 'recent')
  const q = useDebounce(search.trim(), 300)

  useEffect(() => {
    const next = {}
    if (q) next.q = q
    if (subject) next.subject = subject
    if (sort !== 'recent') next.sort = sort
    setParams(next, { replace: true })
  }, [q, subject, sort, setParams])

  const decks = useApi((signal) => decksApi.list({ q, subject, sort }, signal), [q, subject, sort])
  const subjects = useApi((signal) => decksApi.subjects(signal), [])
  const { setData: setDeckList } = decks
  const { reload: reloadSubjects } = subjects

  useKeyboard({ '/': () => searchRef.current?.focus() })

  const handleDelete = useCallback(
    async (deck) => {
      const ok = await confirm({
        title: `Delete “${deck.title}”?`,
        message: `This permanently removes the deck, its ${plural(deck.counts.total, 'card')} and all study history.`,
        confirmLabel: 'Delete deck',
        danger: true,
      })
      if (!ok) return
      try {
        await decksApi.remove(deck.id)
        setDeckList((list) => list.filter((d) => d.id !== deck.id))
        reloadSubjects()
        toast.success(`Deleted “${deck.title}”`)
      } catch (err) {
        toast.error(err.message)
      }
    },
    [confirm, toast, setDeckList, reloadSubjects],
  )

  async function handleImport(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    try {
      let data
      try {
        data = JSON.parse(await file.text())
      } catch {
        throw new Error('That file is not valid JSON')
      }
      const problem = validateImport(data)
      if (problem) throw new Error(problem)
      const deck = await decksApi.importDeck(data)
      toast.success(`Imported “${deck.title}” with ${plural(deck.counts.total, 'card')}`)
      decks.reload()
      subjects.reload()
    } catch (err) {
      toast.error(err.fields?.title ?? err.message)
    }
  }

  const list = decks.data ?? []
  const totalCards = list.reduce((sum, d) => sum + d.counts.total, 0)
  const totalDue = list.reduce((sum, d) => sum + d.counts.due, 0)
  const filtering = Boolean(q || subject)

  const subjectOptions = [
    { value: '', label: 'All' },
    ...(subjects.data ?? []).map((s) => ({ value: s.subject, label: s.subject, count: s.count })),
  ]

  return (
    <section className="dashboard">
      <div className="page-header">
        <div>
          <h1>Your decks</h1>
          {decks.data && (
            <p className="page-header__sub">
              {filtering ? 'Showing ' : ''}
              {plural(list.length, 'deck')} · {plural(totalCards, 'card')}
              {totalDue > 0 && (
                <>
                  {' · '}
                  <strong className="text-due">{totalDue} due for review</strong>
                </>
              )}
            </p>
          )}
        </div>
        <div className="page-header__actions">
          <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            Import
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
          <Link to="/decks/new" className="btn btn--primary">
            + New deck
          </Link>
        </div>
      </div>

      <div className="toolbar">
        <SearchBar
          ref={searchRef}
          value={search}
          onChange={setSearch}
          busy={decks.loading && Boolean(decks.data)}
          placeholder="Search decks and cards…  ( / )"
          label="Search decks and cards"
        />
        <label className="select">
          <span className="visually-hidden">Sort decks</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {subjectOptions.length > 2 && (
        <FilterChips label="Filter by subject" options={subjectOptions} value={subject} onChange={setSubject} />
      )}

      {decks.error && !decks.data ? (
        <ErrorState error={decks.error} onRetry={decks.reload} />
      ) : !decks.data ? (
        <SkeletonGrid />
      ) : list.length === 0 ? (
        filtering ? (
          <EmptyState title="No decks match your filters" hint="Try a different search term or subject.">
            <button
              className="btn btn--ghost"
              onClick={() => {
                setSearch('')
                setSubject('')
              }}
            >
              Clear filters
            </button>
          </EmptyState>
        ) : (
          <EmptyState title="No decks yet" hint="Create your first deck, or import one from a JSON file.">
            <Link to="/decks/new" className="btn btn--primary">
              + New deck
            </Link>
          </EmptyState>
        )
      ) : (
        <div className="deck-grid">
          {list.map((deck) => (
            <DeckCard key={deck.id} deck={deck} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </section>
  )
}
