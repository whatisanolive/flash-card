export const plural = (n, word, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

// "in 3 days", "tomorrow", "2 hours ago" …
export function relativeTime(date, now = new Date()) {
  const diffSec = Math.round((new Date(date) - now) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 60) return diffSec >= 0 ? 'now' : 'just now'
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day')
  return rtf.format(Math.round(diffSec / (86400 * 30)), 'month')
}

export function formatDuration(totalSec) {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`
}

export const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

export const STATUS_LABELS = { new: 'New', learning: 'Learning', mastered: 'Mastered' }
