import { percent } from '../utils/format.js'

// Stacked bar of new → learning → mastered, drawn as one hue light → dark
// (it's an ordered scale, so it's encoded as lightness, not three unrelated colours).
const SEGMENTS = [
  { key: 'mastered', label: 'Mastered' },
  { key: 'learning', label: 'Learning' },
  { key: 'new', label: 'New' },
]

export default function MasteryBar({ counts, compact = false }) {
  const { total } = counts
  const label = SEGMENTS.map((s) => `${counts[s.key]} ${s.label.toLowerCase()}`).join(', ')

  return (
    <div className={`mastery${compact ? ' mastery--compact' : ''}`}>
      <div className="mastery__bar" role="img" aria-label={`${percent(counts.mastered, total)}% mastered: ${label}`}>
        {SEGMENTS.map(
          (s) =>
            counts[s.key] > 0 && (
              <span
                key={s.key}
                className={`mastery__seg mastery__seg--${s.key}`}
                style={{ flexGrow: counts[s.key] }}
                title={`${s.label}: ${counts[s.key]}`}
              />
            ),
        )}
      </div>
      {!compact && (
        <ul className="mastery__legend">
          {SEGMENTS.map((s) => (
            <li key={s.key}>
              <span className={`mastery__dot mastery__seg--${s.key}`} aria-hidden="true" />
              {s.label} <strong>{counts[s.key]}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
