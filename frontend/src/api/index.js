import { request } from './client.js'

export { ApiError } from './client.js'

export const decksApi = {
  list: (params, signal) => request('/decks', { params, signal }),
  subjects: (signal) => request('/decks/subjects', { signal }),
  get: (id, signal) => request(`/decks/${id}`, { signal }),
  create: (data) => request('/decks', { method: 'POST', body: data }),
  update: (id, data) => request(`/decks/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => request(`/decks/${id}`, { method: 'DELETE' }),
  resetProgress: (id) => request(`/decks/${id}/reset`, { method: 'POST' }),
  exportDeck: (id) => request(`/decks/${id}/export`),
  importDeck: (data) => request('/decks/import', { method: 'POST', body: data }),
  study: (id, params, signal) => request(`/decks/${id}/study`, { params, signal }),
  addCard: (deckId, data) => request(`/decks/${deckId}/cards`, { method: 'POST', body: data }),
}

export const cardsApi = {
  update: (id, data) => request(`/cards/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => request(`/cards/${id}`, { method: 'DELETE' }),
  review: (id, grade) => request(`/cards/${id}/review`, { method: 'POST', body: { grade } }),
}

export const sessionsApi = {
  create: (data) => request('/sessions', { method: 'POST', body: data }),
}

export const statsApi = {
  get: (signal) => request('/stats', { params: { tzOffset: new Date().getTimezoneOffset() }, signal }),
}

export const healthApi = {
  check: (signal) => request('/health', { signal, timeout: 4000 }),
}
