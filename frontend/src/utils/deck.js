// Recompute a deck's summary counts after a local (optimistic) card change,
// so the header updates instantly without refetching.
export function withCounts(deck) {
  const counts = { total: deck.cards.length, new: 0, learning: 0, mastered: 0, due: 0 }
  for (const c of deck.cards) {
    counts[c.status] += 1
    if (c.due) counts.due += 1
  }
  return { ...deck, counts }
}
