import { useCallback, useEffect, useReducer, useRef } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { cardsApi, decksApi, sessionsApi } from '../api/index.js'
import { useApi } from '../hooks/useApi.js'
import { useKeyboard } from '../hooks/useKeyboard.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { useToast } from '../context/ToastContext.jsx'
import Flashcard from '../components/Flashcard.jsx'
import { EmptyState, ErrorState, Spinner } from '../components/Feedback.jsx'
import { GRADES, formatInterval, nextInterval } from '../utils/srs.js'
import { formatDuration } from '../utils/format.js'
import NotFoundPage from './NotFoundPage.jsx'

// ---- Study session state machine (useReducer) ----
const initialState = { cards: [], index: 0, flipped: false, answers: [], startedAt: 0 }

export function studyReducer(state, action) {
  switch (action.type) {
    case 'start':
      return { ...initialState, cards: action.cards, startedAt: action.now }
    case 'flip':
      return { ...state, flipped: !state.flipped }
    case 'grade':
      if (!state.flipped || state.index >= state.cards.length) return state
      return {
        ...state,
        answers: [...state.answers, { card: state.cards[state.index], grade: action.grade }],
        index: state.index + 1,
        flipped: false,
      }
    default:
      throw new Error(`Unknown action ${action.type}`)
  }
}

export default function StudyPage() {
  const { deckId } = useParams()
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'due' ? 'due' : 'all'
  const shuffle = params.get('shuffle') === '1'
  const navigate = useNavigate()
  const toast = useToast()

  const { data, error, reload } = useApi(
    (signal) => decksApi.study(deckId, { mode, shuffle: shuffle ? 1 : undefined }, signal),
    [deckId, mode, shuffle],
  )
  useDocumentTitle(data ? `Studying ${data.deck.title}` : 'Study')

  const [state, dispatch] = useReducer(studyReducer, initialState)
  const { cards, index, flipped, answers, startedAt } = state
  const finished = cards.length > 0 && index >= cards.length
  const current = cards[index]

  useEffect(() => {
    if (data) dispatch({ type: 'start', cards: data.cards, now: Date.now() })
  }, [data])

  const grade = useCallback(
    (value) => {
      if (!flipped || !current) return
      dispatch({ type: 'grade', grade: value })
      // Fire-and-forget: the UI moves on immediately; failures are reported, not blocking.
      cardsApi.review(current.id, value).catch((err) => toast.error(`Couldn't save that answer: ${err.message}`))
    },
    [flipped, current, toast],
  )

  // Save the session summary once, when the last card is graded.
  const savedFor = useRef(null)
  useEffect(() => {
    if (!finished || savedFor.current === startedAt) return
    savedFor.current = startedAt
    const known = answers.filter((a) => a.grade >= 2).length
    sessionsApi
      .create({
        deckId,
        mode,
        total: answers.length,
        known,
        review: answers.length - known,
        durationSec: Math.round((Date.now() - startedAt) / 1000),
      })
      .catch(() => toast.error("Couldn't save this session to your stats"))
  }, [finished, answers, deckId, mode, startedAt, toast])

  const exit = () => navigate(`/decks/${deckId}`)
  const flip = () => !finished && current && dispatch({ type: 'flip' })

  useKeyboard({
    ' ': flip,
    Enter: flip,
    1: () => grade(0),
    2: () => grade(1),
    3: () => grade(2),
    4: () => grade(3),
    Escape: exit,
  })

  if (error?.isNotFound) return <NotFoundPage what="deck" />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data || (data.cards.length > 0 && cards.length === 0)) return <Spinner />

  const toggleUrl = (next) => `?mode=${next.mode ?? mode}${(next.shuffle ?? shuffle) ? '&shuffle=1' : ''}`

  const header = (
    <div className="study-top">
      <Link to={`/decks/${deckId}`} className="back-link">
        ← {data.deck.title}
      </Link>
      <div className="study-top__modes">
        <Link to={toggleUrl({ mode: 'due' })} className={`chip${mode === 'due' ? ' chip--active' : ''}`}>
          Due only
        </Link>
        <Link to={toggleUrl({ mode: 'all' })} className={`chip${mode === 'all' ? ' chip--active' : ''}`}>
          All cards
        </Link>
        <Link to={toggleUrl({ shuffle: !shuffle })} className={`chip${shuffle ? ' chip--active' : ''}`} aria-pressed={shuffle}>
          ⤮ Shuffle
        </Link>
      </div>
    </div>
  )

  if (data.cards.length === 0) {
    return (
      <section className="study-view">
        {header}
        {mode === 'due' ? (
          <EmptyState title="All caught up! 🎉" hint="No cards are due right now. Come back later, or practise the whole deck.">
            <Link to={toggleUrl({ mode: 'all' })} className="btn btn--primary">
              Study all cards
            </Link>
          </EmptyState>
        ) : (
          <EmptyState title="This deck has no cards" hint="Add a few cards before studying.">
            <Link to={`/decks/${deckId}`} className="btn btn--primary">
              Add cards
            </Link>
          </EmptyState>
        )}
      </section>
    )
  }

  if (finished) {
    const byGrade = GRADES.map((g) => ({ ...g, count: answers.filter((a) => a.grade === g.value).length }))
    const known = byGrade[2].count + byGrade[3].count
    const missed = answers.filter((a) => a.grade <= 1).map((a) => a.card)

    return (
      <section className="study-view">
        {header}
        <div className="study-summary panel">
          <h2>Session complete 🎉</h2>
          <p className="study-summary__sub">
            {answers.length} cards in {formatDuration(Math.round((Date.now() - startedAt) / 1000))} ·{' '}
            {Math.round((known / answers.length) * 100)}% recalled
          </p>
          <div className="study-summary__stats">
            <div className="stat stat--known">
              <span className="stat__num">{known}</span>
              <span>Known</span>
            </div>
            <div className="stat stat--review">
              <span className="stat__num">{missed.length}</span>
              <span>To review</span>
            </div>
          </div>
          <ul className="grade-breakdown">
            {byGrade.map((g) => (
              <li key={g.key} className={`grade-breakdown__item grade--${g.key}`}>
                {g.label} <strong>{g.count}</strong>
              </li>
            ))}
          </ul>
          <div className="study-summary__actions">
            <button className="btn btn--ghost" onClick={exit}>
              Back to deck
            </button>
            {missed.length > 0 && (
              <button className="btn btn--ghost" onClick={() => dispatch({ type: 'start', cards: missed, now: Date.now() })}>
                Retry {missed.length} missed
              </button>
            )}
            <button className="btn btn--primary" onClick={reload}>
              Study again
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="study-view">
      {header}

      <div className="study-progress">
        <div
          className="study-progress__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={cards.length}
          aria-valuenow={index}
          aria-label="Session progress"
        >
          <div className="study-progress__fill" style={{ width: `${(index / cards.length) * 100}%` }} />
        </div>
        <span>
          Card {index + 1} of {cards.length}
        </span>
      </div>

      <Flashcard card={current} flipped={flipped} onFlip={flip} />

      {flipped ? (
        <div className="grade-buttons" role="group" aria-label="How well did you remember?">
          {GRADES.map((g) => (
            <button key={g.key} className={`grade-btn grade--${g.key}`} onClick={() => grade(g.value)}>
              <span className="grade-btn__label">{g.label}</span>
              <span className="grade-btn__meta">
                {formatInterval(nextInterval(current, g.value))} · <kbd>{g.shortcut}</kbd>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="study-actions__hint">
          Flip the card to reveal the answer · <kbd>Space</kbd> to flip · <kbd>Esc</kbd> to exit
        </p>
      )}
    </section>
  )
}
