'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { hasSupabaseEnv, supabase } from '@/lib/supabase'

export type Role = 'admin' | 'ogretmen' | 'veli' | null

type OkulInfo = {
  id: number | string
  ad: string
  slug: string
  logo_url?: string | null
}

type PersonelInfo = {
  id: number
  okul_id: number | string
  ad_soyad?: string | null
  email?: string | null
  rol: string
  sinif?: string | null
  aktif?: boolean | null
  user_id?: string | null
}

type AuthSnapshot = {
  session: Session | null
  role: Role
  okul: OkulInfo | null
  personel: PersonelInfo | null
  remember: boolean
  expiresAt?: number | null
}

type AuthContextValue = {
  session: Session | null
  role: Role
  okul: OkulInfo | null
  personel: PersonelInfo | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const AUTH_QUERY_TIMEOUT_MS = 20000
const AUTH_REMEMBER_KEY = 'kinderly.remember'
const AUTH_CACHE_KEY = 'kinderly.auth.cache'
const AUTH_SESSION_MARKER = 'kinderly.auth.browser'
const AUTH_COOKIE_NAME = 'kinderly_has_session'
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30

function getStorageTarget(remember: boolean) {
  if (typeof window === 'undefined') return null
  return remember ? window.localStorage : window.sessionStorage
}

function setSessionCookie(remember: boolean) {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_COOKIE_NAME}=1; path=/; SameSite=Lax${remember ? `; max-age=${THIRTY_DAYS_IN_SECONDS}` : ''}`
}

function clearSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}

export function setAuthRememberPreference(remember: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUTH_REMEMBER_KEY, remember ? '1' : '0')
  if (!remember) {
    window.sessionStorage.setItem(AUTH_SESSION_MARKER, '1')
  }
}

function getRememberPreference() {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(AUTH_REMEMBER_KEY) !== '0'
}

function clearCachedAuth() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_CACHE_KEY)
  window.sessionStorage.removeItem(AUTH_CACHE_KEY)
  window.sessionStorage.removeItem(AUTH_SESSION_MARKER)
  clearSessionCookie()
}

function persistSnapshot(snapshot: AuthSnapshot) {
  if (typeof window === 'undefined') return

  const remember = snapshot.remember
  const storage = getStorageTarget(remember)
  if (!storage) return

  window.localStorage.removeItem(AUTH_CACHE_KEY)
  window.sessionStorage.removeItem(AUTH_CACHE_KEY)
  storage.setItem(AUTH_CACHE_KEY, JSON.stringify(snapshot))
  setAuthRememberPreference(remember)
  setSessionCookie(remember)
}

function readCachedSnapshot() {
  if (typeof window === 'undefined') return null

  const remember = getRememberPreference()
  const storage = getStorageTarget(remember)
  const raw = storage?.getItem(AUTH_CACHE_KEY) ?? null
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as AuthSnapshot
    if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
      clearCachedAuth()
      return null
    }
    return parsed
  } catch {
    clearCachedAuth()
    return null
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = AUTH_QUERY_TIMEOUT_MS): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Auth query timeout')), timeoutMs)
    }),
  ])
}

// Timeout olursa 800ms bekleyip 1 kez daha dener.
async function withRetryTimeout<T>(
  factory: () => PromiseLike<T>,
  timeoutMs = AUTH_QUERY_TIMEOUT_MS
): Promise<T> {
  try {
    return await withTimeout(factory(), timeoutMs)
  } catch (err) {
    if (err instanceof Error && err.message === 'Auth query timeout') {
      await new Promise<void>(r => setTimeout(r, 800))
      return await withTimeout(factory(), timeoutMs)
    }
    throw err
  }
}

function normalizeRole(value: string | null | undefined): Role {
  if (!value) return null

  const normalized = value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ö/g, 'o')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')

  if (
    normalized === 'admin' ||
    normalized.includes('admin') ||
    normalized.includes('yonet') ||
    normalized.includes('mudur') ||
    normalized.includes('owner') ||
    normalized.includes('kurucu')
  ) return 'admin'

  if (normalized.includes('ogretmen') || normalized.includes('teacher')) return 'ogretmen'
  if (normalized.includes('veli') || normalized.includes('parent')) return 'veli'

  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [okul, setOkul] = useState<OkulInfo | null>(null)
  const [personel, setPersonel] = useState<PersonelInfo | null>(null)
  const [loading, setLoading] = useState(hasSupabaseEnv)

  const commitSnapshot = useCallback((nextSnapshot: AuthSnapshot) => {
    setSession(nextSnapshot.session)
    setRole(nextSnapshot.role)
    setOkul(nextSnapshot.okul)
    setPersonel(nextSnapshot.personel)
    setLoading(false)

    if (nextSnapshot.session?.user) {
      persistSnapshot({
        ...nextSnapshot,
        expiresAt: nextSnapshot.remember ? Date.now() + (THIRTY_DAYS_IN_SECONDS * 1000) : null,
      })
    } else {
      clearCachedAuth()
    }
  }, [])

  const fetchRole = useCallback(async (user: User, remembered = getRememberPreference(), nextSession: Session | null = null) => {
    setLoading(true)

    try {
      const email = user.email?.trim().toLocaleLowerCase('tr-TR')
      let matchedPersonel: PersonelInfo | null = null

      const { data: activeRows } = (await withRetryTimeout(() =>
        supabase
          .from('personel')
          .select('id, okul_id, ad_soyad, email, rol, sinif, aktif, user_id')
          .eq('user_id', user.id)
          .eq('aktif', true)
          .limit(5)
      )) as { data: PersonelInfo[] | null }

      matchedPersonel = (activeRows || []).find((row) => row.user_id === user.id) ?? null

      if (!matchedPersonel) {
        const { data: userRows } = (await withRetryTimeout(() =>
          supabase
            .from('personel')
            .select('id, okul_id, ad_soyad, email, rol, sinif, aktif, user_id')
            .eq('user_id', user.id)
            .limit(5)
        )) as { data: PersonelInfo[] | null }

        matchedPersonel = (userRows || []).find((row) => row.user_id === user.id) ?? null
      }

      if (!matchedPersonel && email) {
        const { data: emailRows } = (await withRetryTimeout(() =>
          supabase
            .from('personel')
            .select('id, okul_id, ad_soyad, email, rol, sinif, aktif, user_id')
            .eq('email', email)
            .limit(5)
        )) as { data: PersonelInfo[] | null }

        matchedPersonel =
          (emailRows || []).find((row) => row.email?.trim().toLocaleLowerCase('tr-TR') === email) ?? null
      }

      if (matchedPersonel) {
        const normalizedRole = normalizeRole(matchedPersonel.rol)
        if (!normalizedRole) {
          await supabase.auth.signOut()
          commitSnapshot({ session: null, role: null, okul: null, personel: null, remember: remembered })
          return
        }

        const { data: okulData } = (await withRetryTimeout(() =>
          supabase
            .from('okullar')
            .select('id, ad, slug, logo_url')
            .eq('id', matchedPersonel.okul_id)
            .maybeSingle()
        )) as { data: OkulInfo | null }

        commitSnapshot({
          session: nextSession,
          role: normalizedRole,
          okul: okulData ?? null,
          personel: matchedPersonel,
          remember: remembered,
        })
        return
      }

      const { data: veli } = (await withRetryTimeout(() =>
        supabase
          .from('veliler')
          .select('okul_id')
          .eq('user_id', user.id)
          .eq('aktif', true)
          .maybeSingle()
      )) as { data: { okul_id: number | string } | null }

      if (veli) {
        const { data: okulData } = (await withRetryTimeout(() =>
          supabase
            .from('okullar')
            .select('id, ad, slug, logo_url')
            .eq('id', veli.okul_id)
            .maybeSingle()
        )) as { data: OkulInfo | null }

        commitSnapshot({
          session: nextSession,
          role: 'veli',
          okul: okulData ?? null,
          personel: null,
          remember: remembered,
        })
        return
      }

      commitSnapshot({ session: null, role: null, okul: null, personel: null, remember: remembered })
    } catch (error) {
      console.error('Auth fetchRole hatası', error)
      commitSnapshot({ session: null, role: null, okul: null, personel: null, remember: remembered })
    }
  }, [commitSnapshot])

  useEffect(() => {
    let active = true
    let restoreTimeout: number | null = null
    if (!hasSupabaseEnv) {
      return () => {
        active = false
      }
    }

    const remember = getRememberPreference()
    const browserSessionActive = typeof window !== 'undefined' && window.sessionStorage.getItem(AUTH_SESSION_MARKER) === '1'

    if (!remember && !browserSessionActive) {
      clearCachedAuth()
      void supabase.auth.signOut()
    } else {
      const cachedSnapshot = readCachedSnapshot()
      if (cachedSnapshot) {
        restoreTimeout = window.setTimeout(() => {
          if (!active) return
          commitSnapshot(cachedSnapshot)
        }, 0)
      }
    }

    async function hydrateSession() {
      try {
        const { data } = await withRetryTimeout(() => supabase.auth.getSession())
        if (!active) return

        const nextSession = data.session
        setSession(nextSession)

        if (nextSession?.user) {
          await fetchRole(nextSession.user, remember, nextSession)
        } else {
          commitSnapshot({ session: null, role: null, okul: null, personel: null, remember })
        }
      } catch (error) {
        console.error('Auth hydrate hatası', error)
        if (!active) return
        commitSnapshot({ session: null, role: null, okul: null, personel: null, remember })
      }
    }

    void hydrateSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return

      const rememberCurrent = getRememberPreference()
      setSession(nextSession)

      if (nextSession?.user) {
        if (!rememberCurrent && typeof window !== 'undefined') {
          window.sessionStorage.setItem(AUTH_SESSION_MARKER, '1')
        }
        await fetchRole(nextSession.user, rememberCurrent, nextSession)
      } else {
        commitSnapshot({ session: null, role: null, okul: null, personel: null, remember: rememberCurrent })
      }
    })

    return () => {
      active = false
      if (restoreTimeout) {
        window.clearTimeout(restoreTimeout)
      }
      subscription.unsubscribe()
    }
  }, [commitSnapshot, fetchRole])

  return (
    <AuthContext.Provider
      value={{
        session,
        role,
        okul,
        personel,
        loading,
        signOut: async () => {
          if (!hasSupabaseEnv) return
          await supabase.auth.signOut()
          commitSnapshot({ session: null, role: null, okul: null, personel: null, remember: getRememberPreference() })
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
