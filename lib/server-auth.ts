import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Sunucu Supabase ayarlari eksik.')
  }

  return { supabaseUrl, serviceRoleKey }
}

export function createAdminClient() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function getBearerToken(request: Request) {
  return request.headers.get('Authorization')?.replace('Bearer ', '').trim() ?? ''
}

export async function authenticateRequest(request: Request): Promise<{ user: User; token: string }> {
  const token = getBearerToken(request)

  if (!token) {
    throw new Error('Yetkilendirme gerekli.')
  }

  const admin = createAdminClient()
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token)

  if (error || !user) {
    throw new Error('Geçersiz oturum.')
  }

  return { user, token }
}
