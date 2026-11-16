import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router'
import AdviceForm from './components/AdviceForm.jsx'
import AdminPage from './components/AdminPage.jsx'
import ProjectCard from './components/ProjectCard.jsx'
import ProjectModal from './components/ProjectModal.jsx'
import ServiceCard from './components/ServiceCard.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import SiteHeader from './components/SiteHeader.jsx'
import useReveal from './hooks/useReveal.js'
import { getPublishedProjects } from './lib/projects.js'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'
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

async function resolveProjectImage(project) {
  const relatedFile = project.project_files?.[0]?.clave_almacenamiento
  let reference = typeof relatedFile === 'string' && relatedFile.trim()
    ? relatedFile.trim()
    : typeof project.imagen === 'string' ? project.imagen.trim() : ''
  if (!reference) return { image: '', failed: true }

  if (/^https?:\/\//i.test(reference)) {
    try {
      const url = new URL(reference)
      const configuredOrigin = new URL(import.meta.env.VITE_SUPABASE_URL).origin
      const objectRoute = '/storage/v1/object/'
      if (url.origin === configuredOrigin && url.pathname.includes(objectRoute)) {
        const objectParts = url.pathname.slice(url.pathname.indexOf(objectRoute) + objectRoute.length).split('/')
        const routeType = objectParts.shift()
        const bucket = objectParts.shift()
        if (['public', 'authenticated', 'sign'].includes(routeType) && bucket === 'project-private-images') {
          // Ignore signed/public URL tokens for the private bucket; re-check RLS
          // with the authenticated Storage download request instead.
          reference = objectParts.map((part) => decodeURIComponent(part)).join('/')
        } else {
          if (url.protocol !== 'https:' || project.estado !== 'publicado') {
            return { image: '', failed: project.estado === 'publicado' }
          }
          return { image: url.href, failed: false }
        }
      } else {
        // Public image URLs are valid for published portfolio items. Draft images
        // must use a path in the private bucket so their URL cannot bypass Storage RLS.
        if (url.protocol !== 'https:' || project.estado !== 'publicado') {
          return { image: '', failed: project.estado === 'publicado' }
        }
        return { image: url.href, failed: false }
      }
    } catch {
      return { image: '', failed: true }
    }
  }

  const { data, error } = await supabase.storage
    .from('project-private-images')
    .download(reference)
  if (error || !data) return { image: '', failed: true }
  return { image: URL.createObjectURL(data), failed: false, objectUrl: true }
}

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
          <Route path="/admin" element={<AdminPage />} />
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
  const [databaseProjects, setDatabaseProjects] = useState(null)
  const [projectsError, setProjectsError] = useState('')
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

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setDatabaseProjects([])
      setProjectsError('No se pudo cargar el catálogo. Comprueba la configuración de Supabase.')
      return undefined
    }
    let active = true
    const objectUrls = []
    const loadProjects = async () => {
      setProjectsError('')
      const { data, error } = await getPublishedProjects()
      if (error) {
        if (active) {
          setDatabaseProjects([])
          setProjectsError('No se pudieron cargar los proyectos. Intenta nuevamente más tarde.')
        }
        return
      }
      const imageResults = await Promise.all(data.map(async (project) => {
        const result = await resolveProjectImage(project)
        if (result.objectUrl) objectUrls.push(result.image)
        return { project, ...result }
      }))
      if (active) {
        setDatabaseProjects(imageResults.map(({ project, image }) => ({
          ...project,
          image,
          alt: `Imagen de ${project.titulo}`,
          title: project.titulo,
          category: project.categoria,
          label: filters.find((filter) => filter.value === project.categoria)?.label ?? project.categoria,
          description: project.descripcion,
          goal: project.descripcion,
          concept: project.descripcion,
          contribution: `Publicado el ${project.creado_en ?? project.fecha}`,
        })))
        setProjectsError(imageResults.some((result) => result.failed)
          ? 'Algunas imágenes no pudieron cargarse. Revisa que las rutas del bucket sean correctas y que los objetos publicados tengan permiso de lectura.'
          : '')
      } else objectUrls.forEach((imageUrl) => URL.revokeObjectURL(imageUrl))
    }
    loadProjects()
    return () => {
      active = false
      objectUrls.forEach((imageUrl) => URL.revokeObjectURL(imageUrl))
    }
  }, [])

  const openProject = (project, event) => {
    projectTriggerRef.current = event.currentTarget
    setSelectedProject(project)
  }

  const sourceProjects = databaseProjects ?? []
  const visibleProjects = activeFilter === 'all'
    ? sourceProjects
    : sourceProjects.filter((project) => project.category === activeFilter)
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
              {projectsError && <p className="lead" role="alert">{projectsError}</p>}
              {isSupabaseConfigured && databaseProjects === null && <p className="lead" role="status">Cargando proyectos…</p>}
              {visibleProjects.map((project) => (
                <ProjectCard key={project.id} project={project} onOpen={openProject} />
              ))}
              {isSupabaseConfigured && databaseProjects !== null && visibleProjects.length === 0 && <p className="lead">No hay proyectos publicados en esta categoría todavía.</p>}
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
