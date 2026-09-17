import { useState } from 'react'

const LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'insights', label: 'Insights' },
  { id: 'about', label: 'About' },
]

function Navbar({ current, onNavigate }) {
  const [open, setOpen] = useState(false)

  function go(id) {
    setOpen(false)
    onNavigate(id)
  }

  return (
    <header className={`navbar ${current !== 'home' ? 'navbar--solid' : ''}`}>
      <div className="tricolor" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="navbar__inner">
        <button className="brand" type="button" onClick={() => go('home')}>
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 36 36" role="img">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#4ea3ff" strokeWidth="1.4" />
              <circle cx="18" cy="18" r="5" fill="none" stroke="#d4b36a" strokeWidth="1.2" />
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180
                const x1 = 18 + Math.cos(angle) * 6.5
                const y1 = 18 + Math.sin(angle) * 6.5
                const x2 = 18 + Math.cos(angle) * 13.5
                const y2 = 18 + Math.sin(angle) * 13.5
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#4ea3ff"
                    strokeWidth="1"
                  />
                )
              })}
            </svg>
          </span>
          <span className="brand__text">
            <strong>MPLADS</strong>
            <small>AI MONITOR</small>
          </span>
        </button>

        <nav className={`nav-links ${open ? 'is-open' : ''}`} aria-label="Primary">
          {LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className={`nav-link ${current === link.id ? 'is-active' : ''}`}
              onClick={() => go(link.id)}
            >
              {link.label}
            </button>
          ))}
          <button
            type="button"
            className="nav-cta nav-cta--mobile"
            onClick={() => go('dashboard')}
          >
            Open Dashboard →
          </button>
        </nav>

        <button
          type="button"
          className="nav-cta nav-cta--desktop"
          onClick={() => go('dashboard')}
        >
          Open Dashboard →
        </button>

        <button
          className={`menu-btn ${open ? 'is-open' : ''}`}
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}

export default Navbar
