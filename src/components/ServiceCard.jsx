import useReveal from '../hooks/useReveal.js'
import { Link } from 'react-router'

function ServiceCard({ service }) {
  const [cardRef, revealClass] = useReveal()

  return (
    <article ref={cardRef} className={`card service-card ${revealClass}`}>
      <div className="service-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {service.icon}
        </svg>
      </div>
      <h4>{service.title}</h4>
      <p>{service.description}</p>
      <Link className="link" to={`/servicios#${service.id}`}>Conocer más</Link>
    </article>
  )
}

export default ServiceCard
