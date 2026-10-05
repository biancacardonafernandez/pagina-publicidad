import { useState } from 'react'

const links = [
  ['Inicio', '#inicio'],
  ['Servicios', '#servicios'],
  ['Proyectos', '#proyectos'],
  ['Proceso', '#proceso'],
  ['Nosotros', '#nosotros'],
  ['Contacto', '#contacto'],
]

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="nav-wrap">
      <div className="container nav">
        <a className="logo" href="#inicio" aria-label="GAM+, volver al inicio" onClick={closeMenu}>GAM+</a>
        <nav className={`nav-links${menuOpen ? ' open' : ''}`} id="navLinks" aria-label="Navegación principal">
          {links.map(([label, href]) => <a href={href} key={href} onClick={closeMenu}>{label}</a>)}
          <a className="btn primary" href="#asesoramiento" onClick={closeMenu}>Solicitar asesoramiento</a>
        </nav>
        <button
          className={`burger${menuOpen ? ' open' : ''}`}
          type="button"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-controls="navLinks"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>
      </div>
    </header>
  )
}

export default SiteHeader
