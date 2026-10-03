import { useCallback, useMemo, useState } from 'react'

// Small form-state hook: controlled values, client-side validation,
// touched tracking (errors appear after blur/submit), server-side field errors,
// and a submitting flag. `validate(values)` returns { field: message }.
export function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const clientErrors = useMemo(() => validate(values), [validate, values])
  const errors = { ...clientErrors, ...serverErrors }
  const isValid = Object.keys(clientErrors).length === 0

  const setField = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }))
    // A server error for this field is stale as soon as the user edits it.
    setServerErrors(({ [name]: _removed, ...rest }) => rest)
    setFormError(null)
  }, [])

  const handleChange = useCallback((e) => setField(e.target.name, e.target.value), [setField])
  const handleBlur = useCallback((e) => setTouched((t) => ({ ...t, [e.target.name]: true })), [])

  const reset = useCallback((next = initialValues) => {
    setValues(next)
    setTouched({})
    setServerErrors({})
    setFormError(null)
  }, [initialValues])

  async function handleSubmit(e) {
    e?.preventDefault()
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])))
    if (!isValid || submitting) return

    setSubmitting(true)
    try {
      await onSubmit(values, { reset })
    } catch (err) {
      if (err?.fields) setServerErrors(err.fields)
      setFormError(err?.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // Only show a field's error once the user has interacted with it.
  const errorFor = (name) => (touched[name] || serverErrors[name] ? errors[name] : undefined)

  return { values, errors, touched, isValid, submitting, formError, errorFor, setField, handleChange, handleBlur, handleSubmit, reset }
}
