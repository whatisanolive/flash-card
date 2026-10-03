// Mirror of backend/src/lib/srs.js — used only to *preview* the next interval
// on each grade button. The server does the real scheduling.

export const GRADES = [
  { value: 0, key: 'again', label: 'Again', shortcut: '1' },
  { value: 1, key: 'hard', label: 'Hard', shortcut: '2' },
  { value: 2, key: 'good', label: 'Good', shortcut: '3' },
  { value: 3, key: 'easy', label: 'Easy', shortcut: '4' },
]

const QUALITY = [1, 3, 4, 5]

export function nextInterval(card, grade) {
  if (grade === 0) return 0
  const q = QUALITY[grade]
  const ease = Math.max(1.3, card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  let interval
  if (card.repetitions === 0) interval = grade === 3 ? 4 : 1
  else if (card.repetitions === 1) interval = grade === 1 ? 3 : 6
  else interval = Math.round(card.interval * ease)
  if (grade === 1) interval = Math.max(1, Math.round(interval * 0.8))
  if (grade === 3 && card.repetitions > 0) interval = Math.round(interval * 1.3)
  return interval
}

export function formatInterval(days) {
  if (days === 0) return '10m'
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}
