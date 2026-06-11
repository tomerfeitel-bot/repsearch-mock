import { createClient } from '@supabase/supabase-js'

// supabase-js expects the bare project URL; a /rest/v1 suffix breaks auth endpoints
const url = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '') || null
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey
  ? createClient(url, anonKey)
  : null
