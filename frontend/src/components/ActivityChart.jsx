import { useState } from 'react'

// Reviews-per-day bar chart (single series → one hue, no legend; the heading names it).
// Plain SVG — no chart library needed for 14 bars.
const W = 900
const H = 240
const PAD = { top: 16, right: 8, bottom: 26, left: 30 }

export default function ActivityChart({ data }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(4, ...data.map((d) => d.reviews))
  const niceMax = Math.ceil(max / 4) * 4
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const slot = innerW / data.length
  const barW = Math.min(32, slot - 12)
  const y = (v) => PAD.top + innerH - (v / niceMax) * innerH
  const ticks = [0, niceMax / 2, niceMax]

  const fmtDay = (iso, opts) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, opts)

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Reviews per day over the last 14 days" className="chart__svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart__grid" />
            <text x={PAD.left - 6} y={y(t)} className="chart__tick" textAnchor="end" dominantBaseline="middle">
              {t}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2
          const h = Math.max(0, y(0) - y(d.reviews))
          const r = Math.min(4, h / 2, barW / 2)
          return (
            <g key={d.date}>
              {d.reviews > 0 && (
                // Rounded top, square base anchored to the baseline.
                <path
                  className={`chart__bar${hover === i ? ' chart__bar--hover' : ''}`}
                  d={`M${x},${y(0)} V${y(d.reviews) + r} Q${x},${y(d.reviews)} ${x + r},${y(d.reviews)} H${x + barW - r} Q${x + barW},${y(d.reviews)} ${x + barW},${y(d.reviews) + r} V${y(0)} Z`}
                />
              )}
              {(i % 2 === data.length % 2 || i === data.length - 1) && (
                <text x={x + barW / 2} y={H - 8} className="chart__tick" textAnchor="middle">
                  {i === data.length - 1 ? 'Today' : fmtDay(d.date, { day: 'numeric', month: 'short' })}
                </text>
              )}
              {/* Hit target: the full column, much larger than the bar */}
              <rect
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${fmtDay(d.date, { weekday: 'long', day: 'numeric', month: 'long' })}: ${d.reviews} reviews`}
              />
            </g>
          )
        })}
      </svg>

      {hover !== null && (
        <div
          className="chart__tooltip"
          style={{ left: `${((PAD.left + hover * slot + slot / 2) / W) * 100}%` }}
          aria-hidden="true"
        >
          <strong>{data[hover].reviews}</strong> review{data[hover].reviews === 1 ? '' : 's'}
          <span>{fmtDay(data[hover].date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>
      )}
    </figure>
  )
}
