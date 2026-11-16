import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublicKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublicKey)

// Both the legacy anon key and the newer publishable key are public browser keys.
// Keep the app runnable before the project credentials are added locally.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublicKey)
  : null
