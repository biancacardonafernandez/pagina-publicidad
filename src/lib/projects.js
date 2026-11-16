import { supabase } from './supabase.js'

export const projectSelect = 'id, titulo, descripcion, categoria, imagen, fecha, creado_en, estado, project_files(archivo_id, clave_almacenamiento)'

export function getPublishedProjects() {
  return supabase
    .from('advertising_projects')
    .select(projectSelect)
    .eq('estado', 'publicado')
    .order('creado_en', { ascending: false })
}

export function getAdminProjects() {
  return supabase
    .from('advertising_projects')
    .select(projectSelect)
    .order('creado_en', { ascending: false })
}

export function checkProjectAdmin() {
  return supabase.rpc('is_project_admin')
}

export function createProject(project) {
  return supabase.from('advertising_projects').insert({ ...project, estado: 'borrador' }).select('id').single()
}

export function updateProject(projectId, project) {
  return supabase.from('advertising_projects').update(project).eq('id', projectId).select('id').maybeSingle()
}

export function updateProjectStatus(projectId, estado) {
  return supabase
    .from('advertising_projects')
    .update({ estado })
    .eq('id', projectId)
    .select('id, titulo, estado')
    .maybeSingle()
}

export function deleteProjectRecord(projectId) {
  return supabase.from('advertising_projects').delete().eq('id', projectId).select('id').maybeSingle()
}

export function uploadProjectFile(projectId, file, storagePath) {
  return supabase.storage.from('project-private-images').upload(storagePath, file, { contentType: file.type, upsert: false })
}

export function addProjectFileRecord(projectId, storagePath) {
  return supabase.from('project_files').insert({ proyecto_id: projectId, clave_almacenamiento: storagePath }).select('archivo_id').single()
}

export function deleteProjectFileRecord(fileId) {
  return supabase.from('project_files').delete().eq('archivo_id', fileId).select('archivo_id').maybeSingle()
}

export function deleteProjectFileObject(storagePath) {
  return supabase.storage.from('project-private-images').remove([storagePath])
}
