import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey)

const dynamicStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    const remember = window.localStorage.getItem('kinderly.remember') !== '0'
    return (remember ? window.localStorage : window.sessionStorage).getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    const remember = window.localStorage.getItem('kinderly.remember') !== '0'
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
    ;(remember ? window.localStorage : window.sessionStorage).setItem(key, value)
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: dynamicStorageAdapter,
  },
})
