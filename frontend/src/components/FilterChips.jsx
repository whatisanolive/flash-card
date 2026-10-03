// A single-select row of pill buttons. options: [{ value, label, count? }]
export default function FilterChips({ options, value, onChange, label }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`chip${value === o.value ? ' chip--active' : ''}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className="chip__count">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
