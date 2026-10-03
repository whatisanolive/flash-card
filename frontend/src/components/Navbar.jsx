import { Link, NavLink } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme.js'

export default function Navbar() {
  const { theme, toggle } = useTheme()

  return (
    <header className="navbar">
      <Link to="/" className="navbar__logo">
        <span className="navbar__mark" aria-hidden="true">
          ✦
        </span>
        Recall
      </Link>

      <nav className="navbar__links" aria-label="Main">
        <NavLink to="/" end className="navbar__link">
          Decks
        </NavLink>
        <NavLink to="/stats" className="navbar__link">
          Progress
        </NavLink>
      </nav>

      <button
        className="navbar__theme"
        onClick={toggle}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        title="Toggle theme"
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  )
}

const iconProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true }

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}
