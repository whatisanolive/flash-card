import { memo } from 'react'
import { Link } from 'react-router-dom'
import MasteryBar from './MasteryBar.jsx'
import { plural } from '../utils/format.js'

// memo: the dashboard re-renders on every keystroke in the search box;
// cards whose deck object hasn't changed skip rendering entirely.
function DeckCard({ deck, onDelete }) {
  const { total, due } = deck.counts

  return (
    <article className={`deck-card deck-card--${deck.swatch}`}>
      <p className="deck-card__subject">{deck.subject}</p>
      <h3 className="deck-card__title">
        {/* Stretched link: the whole card is clickable, buttons stay separate */}
        <Link to={`/decks/${deck.id}`} className="deck-card__link">
          {deck.title}
        </Link>
      </h3>

      <p className="deck-card__count">
        {total === 0 ? 'No cards yet' : plural(total, 'card')}
        {due > 0 && <span className="pill pill--due">{due} due</span>}
      </p>

      {total > 0 && <MasteryBar counts={deck.counts} compact />}

      <Link
        to={total === 0 ? `/decks/${deck.id}` : `/decks/${deck.id}/study${due > 0 ? '?mode=due' : ''}`}
        className="deck-card__study-btn"
      >
        {total === 0 ? 'Add cards →' : due > 0 ? `Review ${due} due →` : 'Study all →'}
      </Link>

      <button className="deck-card__delete" onClick={() => onDelete(deck)} aria-label={`Delete ${deck.title}`}>
        ×
      </button>
    </article>
  )
}

export default memo(DeckCard)
