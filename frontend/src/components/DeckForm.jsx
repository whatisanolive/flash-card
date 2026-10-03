import { useForm } from '../hooks/useForm.js'
import { LIMITS, SWATCHES, validateDeck } from '../utils/validators.js'
import Field from './Field.jsx'

const EMPTY = { title: '', subject: '', description: '', swatch: 'green' }

// Used for both "New deck" and "Edit deck".
export default function DeckForm({ initialValues = EMPTY, onSubmit, onCancel, submitLabel = 'Create deck' }) {
  const form = useForm({
    initialValues,
    validate: validateDeck,
    onSubmit: (values) =>
      onSubmit({
        title: values.title.trim(),
        subject: values.subject.trim(),
        description: values.description.trim(),
        swatch: values.swatch,
      }),
  })
  const { values, errorFor, handleChange, handleBlur, handleSubmit, submitting, formError } = form

  return (
    <form className="panel form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className="form__error" role="alert">
          {formError}
        </p>
      )}

      <Field
        label="Deck name"
        name="title"
        value={values.title}
        onChange={handleChange}
        onBlur={handleBlur}
        readOnly={submitting}
        error={errorFor('title')}
        max={LIMITS.title.max}
        placeholder="e.g. Organic Chemistry"
        autoFocus
      />

      <Field
        label="Subject (optional)"
        name="subject"
        value={values.subject}
        onChange={handleChange}
        onBlur={handleBlur}
        readOnly={submitting}
        error={errorFor('subject')}
        max={LIMITS.subject.max}
        hint='Used for filtering. Defaults to "General".'
        placeholder="e.g. Chemistry"
      />

      <Field
        as="textarea"
        label="Description (optional)"
        name="description"
        value={values.description}
        onChange={handleChange}
        onBlur={handleBlur}
        readOnly={submitting}
        error={errorFor('description')}
        max={LIMITS.description.max}
        rows={2}
        placeholder="What is this deck about?"
      />

      <fieldset className="swatch-picker">
        <legend>Colour</legend>
        {SWATCHES.map((s) => (
          <label key={s} className={`swatch swatch--${s}`}>
            <input type="radio" name="swatch" value={s} checked={values.swatch === s} onChange={handleChange} />
            <span className="visually-hidden">{s}</span>
          </label>
        ))}
      </fieldset>

      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
