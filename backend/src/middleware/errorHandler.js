import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { HttpError } from '../lib/httpError.js'

// Every error in the app ends up here and leaves as a consistent JSON shape:
// { error: { status, message, fields? } }
// `fields` maps form field names to messages so the UI can show them inline.

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, `Route ${req.method} ${req.originalUrl} not found`))
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500
  let message = 'Something went wrong on our end'
  let fields

  if (err instanceof ZodError) {
    status = 400
    message = 'Please fix the highlighted fields'
    fields = {}
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_form'
      fields[key] ??= issue.message
    }
  } else if (err instanceof HttpError) {
    status = err.status
    message = err.message
    fields = err.details
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      status = 404
      message = 'Resource not found'
    } else if (err.code === 'P2002') {
      status = 409
      message = 'That already exists'
    }
  } else if (err.type === 'entity.parse.failed') {
    status = 400
    message = 'Request body is not valid JSON'
  } else if (err.type === 'entity.too.large') {
    status = 413
    message = 'Request body is too large'
  }

  if (status === 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[${req.method} ${req.originalUrl}]`, err)
  }

  res.status(status).json({ error: { status, message, ...(fields && { fields }) } })
}
