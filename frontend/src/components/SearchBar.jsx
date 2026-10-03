import { forwardRef } from 'react'

const SearchBar = forwardRef(function SearchBar({ value, onChange, placeholder = 'Search…', label = 'Search', busy }, ref) {
  return (
    <div className="search">
      <span className="search__icon" aria-hidden="true">
        ⌕
      </span>
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      {busy && <span className="search__spinner" aria-hidden="true" />}
      {value && !busy && (
        <button className="search__clear" onClick={() => onChange('')} aria-label="Clear search">
          ×
        </button>
      )}
    </div>
  )
})

export default SearchBar
