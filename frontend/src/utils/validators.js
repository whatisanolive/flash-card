// Client-side validation rules. They mirror backend/src/validators/schemas.js
// so users get instant feedback; the server re-checks everything.

export const LIMITS = {
  title: { min: 2, max: 60 },
  subject: { max: 30 },
  description: { max: 200 },
  front: { min: 2, max: 300 },
  back: { min: 1, max: 500 },
}

export const SWATCHES = ['green', 'amber', 'blue', 'rose']
const SUBJECT_PATTERN = /^[\p{L}\p{N} &/.+-]*$/u

function length(errors, field, label, value, { min, max }) {
  const v = value.trim()
  if (min && !v) errors[field] = `${label} is required`
  else if (min && v.length < min) errors[field] = `${label} must be at least ${min} characters`
  else if (max && v.length > max) errors[field] = `${label} must be at most ${max} characters`
}

export function validateDeck(values) {
  const errors = {}
  length(errors, 'title', 'Title', values.title ?? '', LIMITS.title)
  length(errors, 'subject', 'Subject', values.subject ?? '', LIMITS.subject)
  if (!errors.subject && !SUBJECT_PATTERN.test(values.subject ?? '')) {
    errors.subject = 'Subject can only contain letters, numbers, spaces and & / . + -'
  }
  length(errors, 'description', 'Description', values.description ?? '', LIMITS.description)
  if (values.swatch && !SWATCHES.includes(values.swatch)) errors.swatch = 'Pick one of the colours'
  return errors
}

export function validateCard(values) {
  const errors = {}
  length(errors, 'front', 'Question', values.front ?? '', LIMITS.front)
  length(errors, 'back', 'Answer', values.back ?? '', LIMITS.back)
  if (!errors.back && values.front.trim() && values.front.trim().toLowerCase() === values.back.trim().toLowerCase()) {
    errors.back = 'Answer must be different from the question'
  }
  return errors
}

// Validates a parsed JSON file before sending it to /decks/import.
export function validateImport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'File must contain a single deck object'
  if (typeof data.title !== 'string' || !data.title.trim()) return 'Deck file is missing a "title"'
  if (data.cards !== undefined && !Array.isArray(data.cards)) return '"cards" must be a list'
  const bad = (data.cards ?? []).findIndex((c) => typeof c?.front !== 'string' || typeof c?.back !== 'string')
  if (bad !== -1) return `Card #${bad + 1} needs a "front" and a "back"`
  return null
}
