import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'

export default function NotFoundPage({ what = 'page' }) {
  useDocumentTitle('Not found')
  return (
    <section className="not-found">
      <p className="not-found__code">404</p>
      <h1>We couldn’t find that {what}</h1>
      <p className="muted">It may have been deleted, or the link is wrong.</p>
      <Link to="/" className="btn btn--primary">
        Back to your decks
      </Link>
    </section>
  )
}
