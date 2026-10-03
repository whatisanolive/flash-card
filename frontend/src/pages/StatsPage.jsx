import { Link } from 'react-router-dom'
import { statsApi } from '../api/index.js'
import { useApi } from '../hooks/useApi.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import ActivityChart from '../components/ActivityChart.jsx'
import MasteryBar from '../components/MasteryBar.jsx'
import { EmptyState, ErrorState, Spinner } from '../components/Feedback.jsx'
import { formatDuration, percent, plural, relativeTime } from '../utils/format.js'

function StatTile({ label, value, hint }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile__label">{label}</span>
      <span className="stat-tile__value">{value}</span>
      {hint && <span className="stat-tile__hint">{hint}</span>}
    </div>
  )
}

export default function StatsPage() {
  useDocumentTitle('Progress')
  const { data, error, reload } = useApi((signal) => statsApi.get(signal), [])

  if (error && !data) return <ErrorState error={error} onRetry={reload} />
  if (!data) return <Spinner />

  const { totals } = data

  return (
    <section className="stats">
      <div className="page-header">
        <div>
          <h1>Your progress</h1>
          <p className="page-header__sub">
            {plural(totals.decks, 'deck')} · {plural(totals.total, 'card')} · {plural(data.totalReviews, 'review')} this year
          </p>
        </div>
      </div>

      <div className="stat-tiles">
        <StatTile label="Day streak" value={`${data.streak}🔥`} hint={data.streak ? 'Keep it going!' : 'Study today to start one'} />
        <StatTile label="Reviewed today" value={data.reviewsToday} />
        <StatTile label="Due now" value={totals.due} hint={totals.due ? 'Waiting for review' : 'All caught up'} />
        <StatTile label="Recall rate" value={data.accuracy === null ? '—' : `${data.accuracy}%`} hint="Last 30 days" />
        <StatTile
          label="Mastered"
          value={`${percent(totals.mastered, totals.total)}%`}
          hint={`${totals.mastered} of ${totals.total} cards`}
        />
      </div>

      <div className="panel">
        <h2 className="panel__title">Reviews per day · last 14 days</h2>
        {data.totalReviews === 0 ? (
          <EmptyState title="No reviews yet" hint="Study a deck and your activity will show up here." />
        ) : (
          <ActivityChart data={data.activity} />
        )}
      </div>

      <div className="stats__cols">
        <div className="panel">
          <h2 className="panel__title">Mastery by deck</h2>
          {data.decks.length === 0 ? (
            <EmptyState title="No decks yet" />
          ) : (
            <ul className="deck-mastery">
              {data.decks.map((d) => (
                <li key={d.id}>
                  <div className="deck-mastery__head">
                    <Link to={`/decks/${d.id}`}>{d.title}</Link>
                    <span>
                      {percent(d.counts.mastered, d.counts.total)}% mastered
                      {d.counts.due > 0 && <span className="pill pill--due">{d.counts.due} due</span>}
                    </span>
                  </div>
                  {d.counts.total > 0 ? <MasteryBar counts={d.counts} compact /> : <p className="muted">No cards</p>}
                </li>
              ))}
            </ul>
          )}
          {data.decks.some((d) => d.counts.total > 0) && <MasteryBar counts={totals} />}
        </div>

        <div className="panel">
          <h2 className="panel__title">Recent sessions</h2>
          {data.recentSessions.length === 0 ? (
            <EmptyState title="No sessions yet" />
          ) : (
            <ul className="sessions">
              {data.recentSessions.map((s) => (
                <li key={s.id} className="sessions__item">
                  <span className={`sessions__swatch swatch-bg--${s.deck.swatch}`} aria-hidden="true" />
                  <div>
                    <p className="sessions__title">{s.deck.title}</p>
                    <p className="muted">
                      {relativeTime(s.completedAt)} · {formatDuration(s.durationSec)}
                    </p>
                  </div>
                  <span className="sessions__score">
                    {s.known}/{s.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
