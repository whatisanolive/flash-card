import { cardStatus, isDue } from './srs.js'

// Adds derived fields the UI needs so the client never re-implements them.
export function serializeCard(card, now = new Date()) {
  return { ...card, status: cardStatus(card), due: isDue(card, now) }
}

// Summary counts for a deck, computed from its (lightweight) card list.
export function summarizeDeck(deck, now = new Date()) {
  const { cards = [], ...rest } = deck
  const counts = { total: cards.length, new: 0, learning: 0, mastered: 0, due: 0 }
  for (const card of cards) {
    counts[cardStatus(card)] += 1
    if (isDue(card, now)) counts.due += 1
  }
  return { ...rest, counts }
}

export const CARD_SUMMARY_FIELDS = { interval: true, reviewCount: true, dueAt: true }
