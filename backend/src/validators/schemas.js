import { z } from 'zod'

// These rules are mirrored on the client in src/utils/validators.js so users
// get instant feedback — but the server is the source of truth.

export const SWATCHES = ['green', 'amber', 'blue', 'rose']
export const CARD_STATUSES = ['new', 'learning', 'mastered', 'due']
export const DECK_SORTS = ['recent', 'title', 'cards', 'due']

const text = (field, min, max) =>
  z
    .string({ required_error: `${field} is required`, invalid_type_error: `${field} must be text` })
    .trim()
    .min(min, min === 1 ? `${field} is required` : `${field} must be at least ${min} characters`)
    .max(max, `${field} must be at most ${max} characters`)

export const deckSchema = z.object({
  title: text('Title', 2, 60),
  subject: z
    .string()
    .trim()
    .max(30, 'Subject must be at most 30 characters')
    .regex(/^[\p{L}\p{N} &/.+-]*$/u, 'Subject can only contain letters, numbers, spaces and & / . + -')
    .optional()
    .transform((s) => s || 'General'),
  description: z.string().trim().max(200, 'Description must be at most 200 characters').optional().default(''),
  swatch: z.enum(SWATCHES, { errorMap: () => ({ message: `Colour must be one of ${SWATCHES.join(', ')}` }) }).optional(),
})

export const deckUpdateSchema = deckSchema.partial().refine((d) => Object.keys(d).length > 0, {
  message: 'Nothing to update',
})

export const cardSchema = z
  .object({
    front: text('Question', 2, 300),
    back: text('Answer', 1, 500),
  })
  .refine((c) => c.front.toLowerCase() !== c.back.toLowerCase(), {
    message: 'Answer must be different from the question',
    path: ['back'],
  })

export const cardUpdateSchema = z
  .object({
    front: text('Question', 2, 300).optional(),
    back: text('Answer', 1, 500).optional(),
  })
  .refine((c) => c.front !== undefined || c.back !== undefined, { message: 'Nothing to update' })

export const reviewSchema = z.object({
  grade: z.number({ required_error: 'grade is required' }).int().min(0).max(3),
})

export const sessionSchema = z.object({
  deckId: z.string().min(1),
  mode: z.enum(['all', 'due']).default('all'),
  total: z.number().int().min(0),
  known: z.number().int().min(0),
  review: z.number().int().min(0),
  durationSec: z.number().int().min(0).max(24 * 60 * 60).default(0),
})

export const importSchema = deckSchema.extend({
  cards: z
    .array(z.object({ front: text('Question', 2, 300), back: text('Answer', 1, 500) }))
    .max(1000, 'A deck can import at most 1000 cards')
    .default([]),
})

export const deckQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  subject: z.string().trim().max(30).optional(),
  sort: z.enum(DECK_SORTS).default('recent'),
})

export const cardQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(CARD_STATUSES).optional(),
})

export const studyQuerySchema = z.object({
  mode: z.enum(['all', 'due']).default('all'),
  shuffle: z.enum(['0', '1', 'true', 'false']).optional().transform((v) => v === '1' || v === 'true'),
})
