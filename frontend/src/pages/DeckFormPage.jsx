import { Link, useNavigate, useParams } from 'react-router-dom'
import { decksApi } from '../api/index.js'
import { useApi } from '../hooks/useApi.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { useToast } from '../context/ToastContext.jsx'
import DeckForm from '../components/DeckForm.jsx'
import { ErrorState, Spinner } from '../components/Feedback.jsx'

// /decks/new           → create
// /decks/:deckId/edit  → edit (loads the deck first)
export default function DeckFormPage() {
  const { deckId } = useParams()
  const isEdit = Boolean(deckId)
  const navigate = useNavigate()
  const toast = useToast()
  useDocumentTitle(isEdit ? 'Edit deck' : 'New deck')

  const deck = useApi((signal) => (isEdit ? decksApi.get(deckId, signal) : Promise.resolve(null)), [deckId])

  async function handleSubmit(values) {
    if (isEdit) {
      await decksApi.update(deckId, values)
      toast.success('Deck updated')
      navigate(`/decks/${deckId}`)
    } else {
      const created = await decksApi.create(values)
      toast.success(`Created “${created.title}” — now add some cards`)
      navigate(`/decks/${created.id}`, { state: { openCardForm: true } })
    }
  }

  const backTo = isEdit ? `/decks/${deckId}` : '/'

  return (
    <section className="narrow">
      <Link to={backTo} className="back-link">
        ← {isEdit ? 'Back to deck' : 'All decks'}
      </Link>
      <h1 className="page-title">{isEdit ? 'Edit deck' : 'Create a new deck'}</h1>

      {isEdit && deck.error ? (
        <ErrorState error={deck.error} onRetry={deck.reload} title="Couldn't load this deck" />
      ) : isEdit && !deck.data ? (
        <Spinner />
      ) : (
        <DeckForm
          key={deck.data?.id ?? 'new'}
          initialValues={
            deck.data
              ? { title: deck.data.title, subject: deck.data.subject, description: deck.data.description, swatch: deck.data.swatch }
              : undefined
          }
          submitLabel={isEdit ? 'Save changes' : 'Create deck'}
          onSubmit={handleSubmit}
          onCancel={() => navigate(backTo)}
        />
      )}
    </section>
  )
}
