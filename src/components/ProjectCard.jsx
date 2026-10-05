import useReveal from '../hooks/useReveal.js'

function ProjectCard({ project, onOpen }) {
  const [cardRef, revealClass] = useReveal()
  const handleOpen = (event) => onOpen(project, event)

  return (
    <article ref={cardRef} className={`project ${revealClass}${project.layout ? ` ${project.layout}` : ''}`}>
      <button className="project-trigger" type="button" aria-label={`Ver detalles: ${project.title}`} onClick={handleOpen}>
        <img src={project.image} alt={project.alt} loading="lazy" />
      </button>
      <div className="meta">
        <h4>{project.title}</h4>
        <span className="tag">{project.label}</span>
        <p>{project.description}</p>
        <button className="see-more" type="button" aria-label={`Ver detalles: ${project.title}`} onClick={handleOpen}>Ver →</button>
      </div>
    </article>
  )
}

export default ProjectCard
