import { useState } from 'react'
import { submitContactMessage } from '../lib/contact.js'
import { isSupabaseConfigured } from '../lib/supabase.js'

const initialValues = {
  name: '',
  business: '',
  email: '',
  type: '',
  need: 'Asesoramiento inicial',
  message: '',
}

function AdviceForm() {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateField = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: false }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setStatus('')
    const nextErrors = {
      name: !values.name.trim(),
      business: !values.business.trim(),
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()),
      type: !values.type.trim(),
      message: !values.message.trim(),
    }

    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      setStatus('Revisa los campos marcados antes de continuar.')
      return
    }

    if (!isSupabaseConfigured) {
      setStatus('No se pudo registrar tu mensaje. Intenta nuevamente más tarde.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await submitContactMessage({
        ...values,
        name: values.name.trim(),
        business: values.business.trim(),
        email: values.email.trim(),
        type: values.type.trim(),
        message: values.message.trim(),
      })
      if (error) {
        setStatus('No se pudo registrar tu mensaje. Intenta nuevamente más tarde.')
        return
      }

      setStatus('Gracias. Tu mensaje se registró correctamente; nos pondremos en contacto contigo.')
      setValues(initialValues)
      setErrors({})
    } catch {
      setStatus('No se pudo registrar tu mensaje. Intenta nuevamente más tarde.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form-grid" noValidate onSubmit={handleSubmit}>
      <label htmlFor="name">Nombre
        <input className={errors.name ? 'error' : ''} id="name" type="text" name="name" autoComplete="name" required value={values.name} onChange={updateField} />
      </label>
      <label htmlFor="business">Nombre del emprendimiento
        <input className={errors.business ? 'error' : ''} id="business" type="text" name="business" autoComplete="organization" required value={values.business} onChange={updateField} />
      </label>
      <label htmlFor="email">Correo
        <input className={errors.email ? 'error' : ''} id="email" type="email" name="email" autoComplete="email" required value={values.email} onChange={updateField} />
      </label>
      <label htmlFor="type">Tipo de negocio
        <input className={errors.type ? 'error' : ''} id="type" type="text" name="type" required value={values.type} onChange={updateField} />
      </label>
      <label htmlFor="need">¿Qué necesitas?
        <select id="need" name="need" value={values.need} onChange={updateField}>
          <option>Asesoramiento inicial</option>
          <option>Gestión de redes sociales</option>
          <option>Branding e identidad visual</option>
          <option>Publicidad digital</option>
        </select>
      </label>
      <label htmlFor="message">Mensaje
        <textarea className={errors.message ? 'error' : ''} id="message" name="message" rows="4" required value={values.message} onChange={updateField} />
      </label>
      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={submitting}>{submitting ? 'Enviando…' : 'Quiero asesoramiento'}</button>
        <p className="form-status" role="status" aria-live="polite">{status}</p>
      </div>
    </form>
  )
}

export default AdviceForm
