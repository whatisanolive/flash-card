// validate(schema, 'body' | 'query') — parses the request part with a zod schema.
// On success the parsed (trimmed, defaulted) value replaces the raw input
// (stored on req.validated for query, since Express 5 makes req.query read-only).
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {})
    if (!result.success) return next(result.error)
    if (source === 'body') req.body = result.data
    else req.validated = result.data
    next()
  }
}
