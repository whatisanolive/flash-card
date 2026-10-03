import { describe, it, expect, vi, afterEach } from 'vitest'
import { ApiError, request } from '../api/client.js'

const jsonResponse = (status, body) =>
  Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

afterEach(() => vi.unstubAllGlobals())

describe('api client', () => {
  it('returns parsed JSON and builds query strings (skipping empty params)', async () => {
    const fetchMock = vi.fn(() => jsonResponse(200, [{ id: 1 }]))
    vi.stubGlobal('fetch', fetchMock)
    const data = await request('/decks', { params: { q: 'bio', subject: '', sort: undefined } })
    expect(data).toEqual([{ id: 1 }])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/decks?q=bio')
  })

  it('sends JSON bodies', async () => {
    const fetchMock = vi.fn(() => jsonResponse(201, { id: 'x' }))
    vi.stubGlobal('fetch', fetchMock)
    await request('/decks', { method: 'POST', body: { title: 'T' } })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ title: 'T' })
  })

  it('returns null for 204 No Content', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))))
    expect(await request('/decks/1', { method: 'DELETE' })).toBeNull()
  })

  it('throws ApiError with status and field errors from the server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(409, { error: { status: 409, message: 'Duplicate', fields: { title: 'Taken' } } })),
    )
    const err = await request('/decks', { method: 'POST', body: {} }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(409)
    expect(err.fields).toEqual({ title: 'Taken' })
    expect(err.message).toBe('Duplicate')
  })

  it('turns network failures into a friendly ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    const err = await request('/decks').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.isNetworkError).toBe(true)
    expect(err.message).toMatch(/Can't reach the server/)
  })

  it('times out slow requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))),
    )
    const err = await request('/slow', { timeout: 20 }).catch((e) => e)
    expect(err.message).toMatch(/too long/)
  })
})
