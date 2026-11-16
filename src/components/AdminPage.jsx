import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { getAdminContactMessages } from '../lib/contact.js'
import {
  addProjectFileRecord,
  checkProjectAdmin,
  createProject,
  deleteProjectFileObject,
  deleteProjectFileRecord,
  deleteProjectRecord,
  getAdminProjects,
  updateProject,
  updateProjectStatus,
  uploadProjectFile,
} from '../lib/projects.js'

const projectFields = [
  ['titulo', 'Título'],
  ['descripcion', 'Descripción'],
  ['categoria', 'Categoría'],
  ['creado_en', 'Creado'],
]

const emptyForm = { titulo: '', descripcion: '', categoria: 'publicidad' }
function AdminPage() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [projects, setProjects] = useState([])
  const [contactMessages, setContactMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [contactMessagesError, setContactMessagesError] = useState('')
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [fileForProject, setFileForProject] = useState('')

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return undefined
    }

    let active = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError('No se pudo recuperar la sesión.')
      setSession(data?.session ?? null)
      setAuthReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession)
        setIsAdmin(false)
        setProjects([])
        setContactMessages([])
        setError('')
        setNotice('')
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true
    const checkAdmin = async () => {
      setIsAdmin(false)
      setProjects([])
      if (!session || !supabase) return
      const { data, error: roleError } = await checkProjectAdmin()
      if (!active) return
      if (roleError) {
        setError('No se pudo verificar el rol. Comprueba que las migraciones de seguridad estén aplicadas.')
        return
      }
      setIsAdmin(data === true)
      if (data !== true) setError('Acceso denegado: esta cuenta no está registrada como administradora.')
    }
    checkAdmin()
    return () => { active = false }
  }, [session])

  const loadProjects = useCallback(async () => {
    if (!supabase || !isAdmin) return
    setLoadingProjects(true)
    setError('')
    const { data, error: queryError } = await getAdminProjects()
    setLoadingProjects(false)
    if (queryError) {
      setError(`No se pudieron consultar los proyectos: ${queryError.message}`)
      return
    }
    setProjects(data ?? [])
  }, [isAdmin])

  useEffect(() => { loadProjects() }, [loadProjects])

  const loadContactMessages = useCallback(async () => {
    if (!supabase || !isAdmin) return
    setLoadingMessages(true)
    setContactMessagesError('')
    const { data, error: queryError } = await getAdminContactMessages()
    setLoadingMessages(false)
    if (queryError) {
      setContactMessagesError('No se pudieron cargar los mensajes de contacto.')
      return
    }
    setContactMessages(data ?? [])
  }, [isAdmin])

  useEffect(() => { loadContactMessages() }, [loadContactMessages])

  const handleSignIn = async (event) => {
    event.preventDefault()
    if (!supabase) return
    setError('')
    setNotice('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError('No se pudo iniciar sesión. Revisa el correo y la contraseña.')
    setPassword('')
  }

  const handleSignOut = async () => {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError('No se pudo cerrar la sesión.')
  }

  const openCreateForm = () => {
    setEditingProject(null)
    setForm(emptyForm)
    setFileForProject('')
    setError('')
    setFormOpen(true)
  }

  const openEditForm = (project) => {
    setEditingProject(project)
    setForm({ titulo: project.titulo, descripcion: project.descripcion, categoria: project.categoria })
    setFileForProject('')
    setError('')
    setFormOpen(true)
  }

  const saveProject = async (event) => {
    event.preventDefault()
    if (!supabase || !isAdmin) return
    setBusyId(editingProject?.id ?? 'new-project')
    setError('')
    setNotice('')

    let projectId = editingProject?.id
    if (editingProject) {
      const { data, error: updateError } = await updateProject(projectId, { titulo: form.titulo.trim(), descripcion: form.descripcion.trim(), categoria: form.categoria })
      if (updateError || !data) {
        setBusyId('')
        setError(`No se pudo guardar el proyecto${updateError ? `: ${updateError.message}` : ': no se encontró una fila autorizada.'}`)
        return
      }
    } else {
      const { data, error: insertError } = await createProject({ titulo: form.titulo.trim(), descripcion: form.descripcion.trim(), categoria: form.categoria })
      if (insertError || !data) {
        setBusyId('')
        setError(`No se pudo crear el proyecto: ${insertError?.message ?? 'No se recibió el identificador.'}`)
        return
      }
      projectId = data.id
    }

    if (fileForProject) {
      const fileError = await attachFile(projectId, fileForProject)
      if (fileError) {
        setBusyId('')
        setError(`El proyecto se guardó, pero el archivo no se vinculó: ${fileError}`)
        await loadProjects()
        return
      }
    }

    setBusyId('')
    setFormOpen(false)
    setEditingProject(null)
    setForm(emptyForm)
    setFileForProject('')
    setNotice(editingProject ? 'Proyecto actualizado.' : 'Proyecto creado como borrador.')
    await loadProjects()
  }

  const attachFile = async (projectId, file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) return 'Usa una imagen JPEG, PNG o WebP.'
    if (file.size > 10 * 1024 * 1024) return 'El archivo supera el límite de 10 MB.'
    const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'imagen'
    const storagePath = `${projectId}/${crypto.randomUUID()}-${safeName}`
    const { data: uploaded, error: uploadError } = await uploadProjectFile(projectId, file, storagePath)
    if (uploadError || !uploaded?.path) return uploadError?.message ?? 'Storage no confirmó la carga.'
    const { data: fileRecord, error: recordError } = await addProjectFileRecord(projectId, storagePath)
    if (recordError || !fileRecord?.archivo_id) {
      const { error: cleanupError } = await deleteProjectFileObject(storagePath)
      return [recordError?.message ?? 'La base de datos no confirmó el registro del archivo.', cleanupError?.message].filter(Boolean).join(' No se pudo limpiar el objeto temporal: ')
    }
    return ''
  }

  const changeStatus = async (project) => {
    if (!supabase || !isAdmin) return
    const nextStatus = project.estado === 'publicado' ? 'borrador' : 'publicado'
    setBusyId(project.id)
    setError('')
    setNotice('')
    const { data, error: updateError } = await updateProjectStatus(project.id, nextStatus)
    setBusyId('')
    if (updateError || !data) {
      setError(`No se pudo cambiar el estado${updateError ? `: ${updateError.message}` : '.'}`)
      return
    }
    setProjects((current) => current.map((item) => item.id === data.id ? { ...item, estado: data.estado } : item))
    setNotice(`Estado de «${data.titulo}» actualizado a ${data.estado}.`)
  }

  const downloadProjectFile = async (fileRecord) => {
    if (!supabase || !isAdmin) return
    setBusyId(fileRecord.archivo_id)
    setError('')
    const { data, error: downloadError } = await supabase.storage
      .from('project-private-images')
      .download(fileRecord.clave_almacenamiento)
    setBusyId('')
    if (downloadError || !data) {
      setError(`No se pudo descargar el archivo privado${downloadError ? `: ${downloadError.message}` : '.'}`)
      return
    }

    const objectUrl = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = fileRecord.clave_almacenamiento.split('/').pop() || 'imagen'
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    setNotice('Descarga privada autorizada para esta sesión administradora.')
  }

  const removeProjectFile = async (project, fileRecord) => {
    if (!supabase || !isAdmin || !window.confirm(`¿Quitar el archivo ${fileRecord.clave_almacenamiento} de «${project.titulo}»?`)) return
    setBusyId(fileRecord.archivo_id)
    setError('')
    const { data, error: deleteError } = await deleteProjectFileRecord(fileRecord.archivo_id)
    if (deleteError || !data) {
      setBusyId('')
      setError(`No se pudo quitar el registro del archivo${deleteError ? `: ${deleteError.message}` : '.'}`)
      return
    }
    const { error: storageError } = await deleteProjectFileObject(fileRecord.clave_almacenamiento)
    setBusyId('')
    if (storageError) setError(`Se quitó el registro, pero el objeto privado quedó sin referencia: ${storageError.message}`)
    else setNotice('Archivo quitado.')
    await loadProjects()
  }

  const deleteProject = async (project) => {
    if (!supabase || !isAdmin || project.project_files?.length) return
    if (!window.confirm(`¿Eliminar el proyecto «${project.titulo}»? Esta operación no se puede deshacer.`)) return
    setBusyId(project.id)
    setError('')
    const { data, error: deleteError } = await deleteProjectRecord(project.id)
    setBusyId('')
    if (deleteError || !data) {
      setError(`No se pudo eliminar el proyecto${deleteError ? `: ${deleteError.message}` : '.'}`)
      return
    }
    setProjects((current) => current.filter((item) => item.id !== project.id))
    setNotice(`Proyecto «${project.titulo}» eliminado.`)
  }

  if (!isSupabaseConfigured) {
    return <AdminShell><p role="alert">Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para usar el panel.</p></AdminShell>
  }

  if (!authReady) return <AdminShell><p role="status">Comprobando sesión…</p></AdminShell>

  if (!session) {
    return (
      <AdminShell>
        <h1>Administración de proyectos</h1>
        <p>Inicia sesión con tu cuenta de Supabase.</p>
        <form className="admin-login" onSubmit={handleSignIn}>
          <label>Correo electrónico<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="btn primary" type="submit">Iniciar sesión</button>
        </form>
        {error && <p className="admin-error" role="alert">{error}</p>}
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <div className="admin-heading">
        <div><h1>Administración de proyectos</h1><p>Sesión: {session.user.email}</p></div>
        <button className="btn outline" type="button" onClick={handleSignOut}>Cerrar sesión</button>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {isAdmin && <>
        <section className="admin-messages" aria-labelledby="admin-messages-title">
          <div className="admin-list-heading">
            <h2 id="admin-messages-title">Mensajes de contacto ({contactMessages.length})</h2>
            <button className="btn outline" type="button" onClick={loadContactMessages} disabled={loadingMessages}>{loadingMessages ? 'Actualizando…' : 'Actualizar mensajes'}</button>
          </div>
          {contactMessagesError && <p className="admin-error" role="alert">{contactMessagesError}</p>}
          {loadingMessages && contactMessages.length === 0 && <p role="status">Cargando mensajes…</p>}
          {!loadingMessages && !contactMessagesError && contactMessages.length === 0 && <p>No hay mensajes recibidos.</p>}
          <div className="admin-contact-messages">
            {contactMessages.map((message) => (
              <article className="admin-project admin-contact-message" key={message.id}>
                <div className="admin-project-title"><h3>{message.name}</h3><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time></div>
                <dl>
                  <div><dt>Emprendimiento</dt><dd>{message.business}</dd></div>
                  <div><dt>Correo</dt><dd>{message.email}</dd></div>
                  <div><dt>Tipo de negocio</dt><dd>{message.business_type}</dd></div>
                  <div><dt>Necesidad</dt><dd>{message.need}</dd></div>
                </dl>
                <p className="admin-contact-message-body">{message.message}</p>
              </article>
            ))}
          </div>
        </section>
        <div className="admin-list-heading">
          <h2>Proyectos ({projects.length})</h2>
          <div className="admin-actions">
            <button className="btn primary" type="button" onClick={openCreateForm}>Nuevo proyecto</button>
            <button className="btn outline" type="button" onClick={loadProjects} disabled={loadingProjects}>{loadingProjects ? 'Actualizando…' : 'Actualizar lista'}</button>
          </div>
        </div>
        {formOpen && <form className="admin-project-form" onSubmit={saveProject}>
          <h2>{editingProject ? 'Editar proyecto' : 'Crear proyecto'}</h2>
          <label>Título<input maxLength="160" required value={form.titulo} onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))} /></label>
          <label>Descripción<textarea maxLength="5000" rows="4" required value={form.descripcion} onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))} /></label>
          <label>Categoría<select value={form.categoria} onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))}>
            <option value="publicidad">Publicidad</option><option value="redes">Redes sociales</option><option value="branding">Branding</option><option value="diseno">Diseño</option>
          </select></label>
          <label>{editingProject ? 'Añadir archivo privado' : 'Archivo privado opcional'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFileForProject(event.target.files?.[0] ?? '')} /></label>
          <div className="admin-actions"><button className="btn primary" type="submit" disabled={Boolean(busyId)}>{busyId ? 'Guardando…' : 'Guardar'}</button><button className="btn outline" type="button" onClick={() => setFormOpen(false)}>Cancelar</button></div>
        </form>}
        {loadingProjects && projects.length === 0 && <p role="status">Cargando proyectos…</p>}
        {!loadingProjects && projects.length === 0 && !error && <p>No hay proyectos disponibles para esta cuenta.</p>}
        <div className="admin-projects">
          {projects.map((project) => (
            <article className="admin-project" key={project.id}>
              <div className="admin-project-title"><h3>{project.titulo}</h3><span className={`admin-status ${project.estado}`}>{project.estado}</span></div>
              <dl>{projectFields.map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{field === 'creado_en' ? new Date(project[field]).toLocaleString() : project[field] || '—'}</dd></div>)}</dl>
              <p className="admin-project-id">ID: {project.id}</p>
              <h4>Archivos privados ({project.project_files?.length ?? 0})</h4>
              {project.project_files?.length > 0
                ? <ul>{project.project_files.map((fileRecord) => <li key={fileRecord.archivo_id}><code>{fileRecord.clave_almacenamiento}</code> <button className="admin-inline-action" type="button" disabled={busyId === fileRecord.archivo_id} onClick={() => downloadProjectFile(fileRecord)}>{busyId === fileRecord.archivo_id ? 'Descargando…' : 'Descargar'}</button> <button className="admin-inline-action" type="button" disabled={busyId === fileRecord.archivo_id} onClick={() => removeProjectFile(project, fileRecord)}>Quitar</button></li>)}</ul>
                : <p>Sin archivos relacionados.</p>}
              <div className="admin-actions">
                <button className="btn outline" type="button" onClick={() => openEditForm(project)}>Editar datos / archivos</button>
                <button className="btn primary" type="button" disabled={busyId === project.id} onClick={() => changeStatus(project)}>{project.estado === 'publicado' ? 'Pasar a borrador' : 'Publicar proyecto'}</button>
                <button className="btn outline" type="button" disabled={Boolean(project.project_files?.length) || busyId === project.id} title={project.project_files?.length ? 'Quita primero los archivos relacionados.' : ''} onClick={() => deleteProject(project)}>Eliminar proyecto</button>
              </div>
            </article>
          ))}
        </div>
      </>}
      {!isAdmin && <p>La sesión está activa, pero este panel requiere una cuenta administradora. <Link to="/">Volver al sitio</Link></p>}
    </AdminShell>
  )
}

function AdminShell({ children }) {
  return <section className="section admin-section"><div className="container admin-container">{children}<Link className="admin-back" to="/">← Volver a GAM+</Link></div></section>
}

export default AdminPage
