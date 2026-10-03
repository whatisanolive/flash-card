import { memo, useState } from 'react'
import CardForm from './CardForm.jsx'
import { relativeTime, STATUS_LABELS } from '../utils/format.js'

function CardRow({ card, index, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <li className="card-row card-row--editing">
        <CardForm
          initialValues={{ front: card.front, back: card.back }}
          submitLabel="Save changes"
          onSubmit={async (values) => {
            await onSave(card.id, values)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li className="card-row">
      <span className="card-row__num">{index + 1}</span>
      <div className="card-row__text">
        <p className="card-row__front">{card.front}</p>
        <p className="card-row__back">{card.back}</p>
        <p className="card-row__meta">
          <span className={`pill pill--${card.status}`}>{STATUS_LABELS[card.status]}</span>
          {card.due ? (
            <span className="pill pill--due">Due now</span>
          ) : (
            <span>Next review {relativeTime(card.dueAt)}</span>
          )}
          {card.reviewCount > 0 && <span>· {card.reviewCount} reviews</span>}
        </p>
      </div>
      <div className="card-row__actions">
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label={`Edit card ${index + 1}`}>
          ✎
        </button>
        <button className="icon-btn icon-btn--danger" onClick={() => onDelete(card)} aria-label={`Delete card ${index + 1}`}>
          ×
        </button>
      </div>
    </li>
  )
}

export default memo(CardRow)
