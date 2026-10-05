import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

const links = [
  ['Inicio', '/'],
  ['Servicios', '/servicios'],
  ['Proyectos', '/proyectos'],
  ['Proceso', '/proceso'],
  ['Nosotros', '/nosotros'],
  ['Contacto', '/contacto#contacto'],
]

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location.pathname])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="nav-wrap">
      <div className="container nav">
        <Link className="logo" to="/" aria-label="GAM+, volver al inicio" onClick={closeMenu}>GAM+</Link>
        <nav className={`nav-links${menuOpen ? ' open' : ''}`} id="navLinks" aria-label="Navegación principal">
          {links.map(([label, href]) => <NavLink to={href} key={href} end={href === '/'} onClick={closeMenu}>{label}</NavLink>)}
          <Link className="btn primary" to="/contacto#asesoramiento" onClick={closeMenu}>Solicitar asesoramiento</Link>
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
