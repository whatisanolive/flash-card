import { useRef } from 'react'
import { useForm } from '../hooks/useForm.js'
import { LIMITS, validateCard } from '../utils/validators.js'
import Field from './Field.jsx'

const EMPTY = { front: '', back: '' }

// Add a card (stays open for rapid entry) or edit one (closes on save).
export default function CardForm({ initialValues = EMPTY, onSubmit, onCancel, submitLabel = 'Add card', keepOpen = false }) {
  const frontRef = useRef(null)
  const { values, errorFor, handleChange, handleBlur, handleSubmit, submitting, formError } = useForm({
    initialValues,
    validate: validateCard,
    onSubmit: async (v, { reset }) => {
      await onSubmit({ front: v.front.trim(), back: v.back.trim() })
      if (keepOpen) {
        reset(EMPTY)
        frontRef.current?.focus()
      }
    },
  })

  // Ctrl/⌘ + Enter submits from inside either textarea.
  const submitOnModEnter = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e)
  }

  return (
    <form className="panel form form--card" onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className="form__error" role="alert">
          {formError}
        </p>
      )}
      <div className="form__row">
        <Field
          as="textarea"
          ref={frontRef}
          label="Question / term (front)"
          name="front"
          value={values.front}
          onChange={handleChange}
          onBlur={handleBlur}
          readOnly={submitting}
          onKeyDown={submitOnModEnter}
          error={errorFor('front')}
          max={LIMITS.front.max}
          rows={3}
          placeholder="What is…?"
          autoFocus
        />
        <Field
          as="textarea"
          label="Answer / definition (back)"
          name="back"
          value={values.back}
          onChange={handleChange}
          onBlur={handleBlur}
          readOnly={submitting}
          onKeyDown={submitOnModEnter}
          error={errorFor('back')}
          max={LIMITS.back.max}
          rows={3}
          placeholder="It is…"
        />
      </div>
      <div className="form__actions">
        <span className="form__tip">Tip: Ctrl/⌘ + Enter to save</span>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {keepOpen ? 'Close' : 'Cancel'}
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
