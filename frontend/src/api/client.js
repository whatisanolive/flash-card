// Thin wrapper around fetch that:
//  • prefixes the API base URL (VITE_API_URL in production, Vite proxy in dev)
//  • sends/receives JSON
//  • times out slow requests
//  • turns every failure into an ApiError with a friendly message (+ field errors)

const BASE = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}/api`
const DEFAULT_TIMEOUT = 10_000

export class ApiError extends Error {
  constructor(message, { status = 0, fields } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }

  get isNetworkError() {
    return this.status === 0
  }

  get isNotFound() {
    return this.status === 404
  }
}

function toQuery(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  return entries.length ? `?${new URLSearchParams(entries)}` : ''
}

export async function request(path, { method = 'GET', body, params, signal, timeout = DEFAULT_TIMEOUT } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const onCallerAbort = () => controller.abort()
  signal?.addEventListener('abort', onCallerAbort)

  try {
    const res = await fetch(`${BASE}${path}${toQuery(params)}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    if (res.status === 204) return null
    const data = await res.json().catch(() => null)

    if (!res.ok) {
      throw new ApiError(data?.error?.message ?? `Request failed (${res.status})`, {
        status: res.status,
        fields: data?.error?.fields,
      })
    }
    return data
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (signal?.aborted) throw err // the caller cancelled — let them ignore it
    if (controller.signal.aborted) throw new ApiError('The server took too long to respond. Please try again.')
    throw new ApiError("Can't reach the server. Make sure the backend is running.")
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onCallerAbort)
  }
}
