import { useEffect, useRef } from 'react'

function ProjectModal({ project, onClose }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <button className="modal-backdrop" type="button" aria-label="Cerrar detalles del proyecto" onClick={onClose} />
      <div className="modal-content">
        <button className="modal-close" type="button" aria-label="Cerrar" ref={closeButtonRef} onClick={onClose}>&times;</button>
        <div className="modal-project">
          <img className="modal-image" src={project.image} alt={project.alt} />
          <div className="modal-body">
            <h2 id="modalTitle">{project.title}</h2>
            <div className="modal-meta"><span className="modal-tag">{project.label}</span></div>
            <div className="modal-sections">
              <section><h3>Objetivo</h3><p>{project.goal}</p></section>
              <section><h3>Concepto</h3><p>{project.concept}</p></section>
              <section><h3>Mi aporte</h3><p>{project.contribution}</p></section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectModal
