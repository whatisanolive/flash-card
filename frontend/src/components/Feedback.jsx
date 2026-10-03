// Small presentational pieces for loading / empty / error states.

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  )
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className="deck-grid" aria-busy="true" aria-label="Loading decks">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton skeleton--card" />
      ))}
    </div>
  )
}

export function EmptyState({ title, hint, children }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {hint && <p className="empty-state__hint">{hint}</p>}
      {children && <div className="empty-state__actions">{children}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="error-state" role="alert">
      <p className="error-state__title">{error?.isNetworkError ? 'Server unreachable' : title}</p>
      <p className="error-state__msg">{error?.message ?? String(error)}</p>
      {onRetry && (
        <button className="btn btn--primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
