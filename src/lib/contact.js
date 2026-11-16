import { supabase } from './supabase.js'

export function submitContactMessage(values) {
  return supabase.rpc('submit_contact_message', {
    p_name: values.name,
    p_business: values.business,
    p_email: values.email,
    p_business_type: values.type,
    p_need: values.need,
    p_message: values.message,
  })
}

export function getAdminContactMessages() {
  return supabase.rpc('admin_list_contact_messages')
}
