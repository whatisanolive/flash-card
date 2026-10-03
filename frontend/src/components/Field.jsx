import { forwardRef, useId } from 'react'

// Labelled input/textarea with inline error, hint and character counter.
const Field = forwardRef(function Field({ label, name, value, error, hint, max, as: Tag = 'input', ...rest }, ref) {
  const id = useId()
  const msgId = `${id}-msg`
  const length = value?.length ?? 0

  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <Tag ref={ref} id={id} name={name} value={value} aria-invalid={Boolean(error)} aria-describedby={msgId} {...rest} />
      <div className="field__meta" id={msgId}>
        {error ? (
          <span className="field__error" role="alert">
            {error}
          </span>
        ) : (
          <span className="field__hint">{hint}</span>
        )}
        {max && <span className={`field__count${length > max ? ' field__count--over' : ''}`}>{length}/{max}</span>}
      </div>
    </div>
  )
})

export default Field
