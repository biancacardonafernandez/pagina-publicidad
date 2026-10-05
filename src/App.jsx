import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router'
import AdviceForm from './components/AdviceForm.jsx'
import ProjectCard from './components/ProjectCard.jsx'
import ProjectModal from './components/ProjectModal.jsx'
import ServiceCard from './components/ServiceCard.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import SiteHeader from './components/SiteHeader.jsx'
import useReveal from './hooks/useReveal.js'
import './App.css'

const services = [
  {
    title: 'Gestión de redes sociales',
    description: 'Presencia digital estratégica, contenido y community management.',
    detail: 'Organizamos tu presencia digital con calendario, contenido y seguimiento de la conversación.',
    id: 'detalle-redes',
    icon: <><rect x="2" y="2" width="20" height="20" rx="2" /><path d="M16 11.37A4 4 0 1 1 12.63 8" /></>,
  },
  {
    title: 'Branding e identidad visual',
    description: 'Identidad reconocible, coherente y memorable para tu marca.',
    detail: 'Definimos una identidad reconocible: concepto, sistema visual y aplicaciones para tu marca.',
    id: 'detalle-branding',
    icon: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  },
  {
    title: 'Creación de contenido',
    description: 'Piezas claras, atractivas y adaptadas a cada plataforma.',
    detail: 'Convertimos tus ideas en piezas claras, atractivas y adaptadas a cada canal.',
    id: 'detalle-contenido',
    icon: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
  },
  {
    title: 'Publicidad digital',
    description: 'Campañas enfocadas en resultados, audiencias y conversión.',
    detail: 'Diseñamos campañas con objetivos claros, audiencias relevantes y optimización continua.',
    id: 'detalle-publicidad',
    icon: <><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" /></>,
  },
  {
    title: 'Estrategia de marketing',
    description: 'Diagnóstico, objetivos y acciones alineadas para crecer.',
    detail: 'Conectamos diagnóstico, objetivos y acciones para que tu comunicación tenga dirección.',
    id: 'detalle-estrategia',
    icon: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>,
  },
  {
    title: 'Diseño gráfico',
    description: 'Piezas visuales coherentes y consistentes para tu identidad.',
    detail: 'Desarrollamos piezas para campañas, redes y soportes impresos con una misma línea visual.',
    id: 'detalle-diseno',
    icon: <><path d="M6 9l6-6 6 6M3 8h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" /></>,
  },
  {
    title: 'Producción audiovisual',
    description: 'Videos e imágenes que comunican el valor de tu marca.',
    detail: 'Planificamos y producimos videos e imágenes que hacen visible el valor de tu marca.',
    id: 'detalle-audiovisual',
    icon: <><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></>,
  },
]

const projects = [
  { id: 1, title: 'Campaña integral', category: 'publicidad', label: 'Publicidad', description: 'Propuesta integral de campaña.', image: 'https://i.pinimg.com/736x/a6/28/0c/a6280cd98d4304d7d7fe69f61c9dda4c.jpg', alt: 'Propuesta visual de campaña', goal: 'Crear una campaña integral y coherente en múltiples canales.', concept: 'Propuesta visual moderna, atractiva y estratégica.', contribution: 'Diseño conceptual, estrategia visual y producción de piezas.', layout: 'project-large' },
  { id: 2, title: 'Campaña seasonal', category: 'publicidad', label: 'Publicidad', description: 'Propuesta temática y estacional.', image: 'https://i.pinimg.com/1200x/de/40/2f/de402f1d38028464a895a9c9eaaada9e.jpg', alt: 'Campaña temática seasonal', goal: 'Captar atención con una propuesta temática impactante.', concept: 'Diseño festivo e inmediato con paleta distintiva.', contribution: 'Concepto creativo y adaptación de recursos visuales.' },
  { id: 3, title: 'Estrategia de contenido', category: 'redes', label: 'Redes sociales', description: 'Contenido estratégico para redes.', image: 'https://i.pinimg.com/736x/cd/a8/06/cda806e2ffdf40916c04f6af5d617c44.jpg', alt: 'Contenido para redes sociales', goal: 'Aumentar engagement y alcance en plataformas digitales.', concept: 'Contenido visual estratégico y calendario editorial.', contribution: 'Creación de piezas, planificación y community management.' },
  { id: 4, title: 'Sistema de marca', category: 'branding', label: 'Branding', description: 'Identidad visual completa.', image: 'https://i.pinimg.com/736x/a9/8a/f7/a98af7b7b08bf90f1438cdcf7ca3f6cb.jpg', alt: 'Sistema visual de marca', goal: 'Desarrollar una identidad visual sólida y reconocible.', concept: 'Sistema gráfico coherente y versátil.', contribution: 'Desarrollo de manual, guía de marca y recursos visuales.', layout: 'project-wide' },
  { id: 5, title: 'Colaboración influencers', category: 'redes', label: 'Redes sociales', description: 'Estrategia con personalidades.', image: 'https://i.pinimg.com/1200x/39/42/99/39429970a729a2e74a7c1fe50bdb5164.jpg', alt: 'Estrategia con influencers', goal: 'Posicionar marca mediante alcance de personalidades digitales.', concept: 'Estrategia colaborativa y contenido auténtico.', contribution: 'Coordinación de proyecto, diseño y gestión de colaboraciones.' },
  { id: 6, title: 'Aplicación de marca', category: 'diseno', label: 'Diseño', description: 'Recursos en múltiples soportes.', image: 'https://i.pinimg.com/736x/f5/e6/9d/f5e69d1dad12d6a366767efed602e1b0.jpg', alt: 'Aplicación de marca en soportes', goal: 'Materializar la identidad en todos los soportes.', concept: 'Aplicación coherente en packaging, digital y físico.', contribution: 'Diseño de aplicaciones y supervisión de producción.' },
  { id: 7, title: 'Rediseño corporativo', category: 'branding', label: 'Branding', description: 'Actualización de identidad.', image: 'https://i.pinimg.com/736x/62/e0/32/62e03262ea4dee4031c4ed0d00a447cc.jpg', alt: 'Rediseño de identidad corporativa', goal: 'Modernizar y actualizar la identidad existente.', concept: 'Evolución visual manteniendo valores corporativos.', contribution: 'Análisis, concepto rediseñado y guía de transición.' },
  { id: 8, title: 'Packaging innovador', category: 'diseno', label: 'Diseño', description: 'Solución creativa de empaque.', image: 'https://i.pinimg.com/1200x/a0/3c/89/a03c89075db65d8d5ba481dceb82ecba.jpg', alt: 'Diseño de packaging', goal: 'Crear packaging que destaque en punto de venta.', concept: 'Solución creativa, funcional y sostenible.', contribution: 'Concepto, diseño 3D y especificaciones técnicas.' },
]

const filters = [
  { label: 'Todos', value: 'all' },
  { label: 'Branding', value: 'branding' },
  { label: 'Redes sociales', value: 'redes' },
  { label: 'Publicidad', value: 'publicidad' },
  { label: 'Diseño', value: 'diseno' },
]

const processSteps = [
  ['01', 'Descubrimiento', 'Investigación, análisis y briefing detallado.'],
  ['02', 'Estrategia', 'Definición de objetivos, audiencia y KPIs.'],
  ['03', 'Concepto', 'Ideación creativa y propuestas visuales.'],
  ['04', 'Producción', 'Desarrollo de piezas, diseños y contenidos.'],
  ['05', 'Revisión', 'Feedback, ajustes y optimizaciones.'],
  ['06', 'Entrega', 'Entregables finales y reporte de resultados.'],
]

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppLayout />
    </BrowserRouter>
  )
}

function AppLayout() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      window.requestAnimationFrame(() => {
        document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()
      })
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, location.hash])

  return (
    <>
      <SiteHeader />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/servicios" element={<ServicesPage />} />
          <Route path="/proyectos" element={<ProjectsPage />} />
          <Route path="/proceso" element={<ProcessPage />} />
          <Route path="/nosotros" element={<AboutPage />} />
          <Route path="/contacto" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <SiteFooter />
    </>
  )
}

function HomePage() {
  const [heroRef, heroReveal] = useReveal()

  return (
    <section id="inicio" className="hero">
      <div className="container hero-grid">
        <div ref={heroRef} className={`hero-content ${heroReveal}`}>
          <h1 className="brand">GAM+</h1>
          <h2 className="eyebrow">Convertimos ideas en marcas que conectan.</h2>
          <p>Combinamos estrategia, diseño y comunicación para ayudar a emprendimientos y empresas a construir marcas relevantes y crecer con intención.</p>
          <div className="hero-actions">
            <Link className="btn outline" to="/servicios">Conoce nuestros servicios</Link>
            <Link className="btn primary" to="/contacto#asesoramiento">Quiero asesoramiento</Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <img src="https://i.pinimg.com/1200x/00/9f/b2/009fb2f8fb2d0c1de658461d3dbc93b8.jpg" alt="" />
        </div>
      </div>
    </section>
  )
}

function ServicesPage() {
  return (
    <section id="servicios" className="section">
      <div className="container">
        <h3>Servicios</h3>
        <p className="lead">Soluciones creativas e integradas para tu marca.</p>
        <div className="cards services-grid">
          {services.map((service) => <ServiceCard key={service.id} service={service} />)}
        </div>
        <div className="service-details" aria-label="Detalle de servicios">
          {services.map((service) => (
            <article id={service.id} key={service.id}>
              <h4>{service.title}</h4>
              <p>{service.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProjectsPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedProject, setSelectedProject] = useState(null)
  const projectTriggerRef = useRef(null)

  useEffect(() => {
    if (!selectedProject) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedProject(null)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
      projectTriggerRef.current?.focus()
    }
  }, [selectedProject])

  const openProject = (project, event) => {
    projectTriggerRef.current = event.currentTarget
    setSelectedProject(project)
  }

  const visibleProjects = activeFilter === 'all'
    ? projects
    : projects.filter((project) => project.category === activeFilter)
  return (
    <>
      <section id="proyectos" className="section alt">
          <div className="container">
            <h3>Proyectos</h3>
            <p className="lead">Una selección de ejercicios conceptuales y propuestas visuales para distintas necesidades de comunicación.</p>
            <div className="filters-wrap">
              <div className="filters" aria-label="Filtrar proyectos">
                {filters.map((filter) => (
                  <button
                    className={`filter${activeFilter === filter.value ? ' active' : ''}`}
                    type="button"
                    key={filter.value}
                    aria-pressed={activeFilter === filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="projects-grid" aria-live="polite">
              {visibleProjects.map((project) => (
                <ProjectCard key={project.id} project={project} onOpen={openProject} />
              ))}
              {visibleProjects.length === 0 && <p className="lead">No hay proyectos en esta categoría todavía.</p>}
            </div>
          </div>
      </section>
      {selectedProject && <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
    </>
  )
}

function ProcessPage() {
  const [progressReady, setProgressReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setProgressReady(true), 300)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <section id="proceso" className="section">
          <div className="container">
            <h3>Nuestro proceso</h3>
            <p className="lead">Cómo trabajamos paso a paso en cada proyecto.</p>
            <div className="process-grid process-timeline">
              {processSteps.map(([number, title, description]) => (
                <ProcessStep key={number} number={number} title={title} description={description} />
              ))}
            </div>
            <div className="project-tracker">
              <h4>Ejemplo de seguimiento: identidad de marca</h4>
              <div className="tracker">
                <div className="progress" role="progressbar" aria-label="Progreso de producción" aria-valuemin="0" aria-valuemax="100" aria-valuenow="70">
                  <div className={`progress-fill${progressReady ? ' ready' : ''}`} />
                </div>
                <p>Progreso: <strong>70%</strong> — Etapa actual: <em>Producción</em></p>
              </div>
            </div>
          </div>
    </section>
  )
}

function ContactPage() {
  const [clientCtaRef, clientCtaReveal] = useReveal()
  const [contactRef, contactReveal] = useReveal()

  return (
    <>
      <section id="clientes" className="section alt">
        <div ref={clientCtaRef} className={`container cta-box ${clientCtaReveal}`}>
          <h3>¿Ya trabajas con GAM+?</h3>
          <p>En futuros proyectos podrás consultar avances y entregables desde un espacio privado.</p>
          <Link className="btn outline" to="/contacto#asesoramiento">Solicitar información</Link>
        </div>
      </section>
      <section id="asesoramiento" className="section">
          <div className="container">
            <h3>¿No sabes por dónde empezar?</h3>
            <p className="lead">Cuéntanos sobre tu proyecto y te ayudaremos a encontrar una estrategia.</p>
            <AdviceForm />
          </div>
      </section>
      <section id="contacto" className="section">
        <div ref={contactRef} className={`container contact-grid ${contactReveal}`}>
            <div>
              <h3>Construyamos algo que haga crecer tu marca.</h3>
              <p>Escríbenos para conversar sobre tu próximo proyecto.</p>
            </div>
            <div className="socials">
              <a className="btn outline" href="https://www.instagram.com/gammas_studios?utm_source=ig_web_button_share_sheet&amp;igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a className="btn outline" href="https://www.tiktok.com/@gammas_studios" target="_blank" rel="noopener noreferrer">Tik Tok</a>
            </div>
        </div>
      </section>
    </>
  )
}

function AboutPage() {
  return (
    <section id="nosotros" className="section alt">
      <div className="container">
        <h3>Nosotros</h3>
        <p>GAM+ es una agencia de publicidad creativa que acompaña a emprendimientos y empresas a convertir sus ideas en comunicación clara, atractiva y estratégica.</p>
        <ul className="values">
          <li>Creatividad</li>
          <li>Estrategia</li>
          <li>Organización</li>
          <li>Comunicación</li>
          <li>Resultados</li>
        </ul>
      </div>
    </section>
  )
}

function NotFoundPage() {
  return (
    <section className="section">
      <div className="container">
        <h3>Página no encontrada</h3>
        <p className="lead">La dirección que buscas no existe o pudo haber cambiado.</p>
        <Link className="btn primary" to="/">Volver al inicio</Link>
      </div>
    </section>
  )
}

function ProcessStep({ number, title, description }) {
  const [stepRef, revealClass] = useReveal()

  return (
    <div ref={stepRef} className={`step ${revealClass}`}>
      <span className="step-number">{number}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  )
}

export default App
