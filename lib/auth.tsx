'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
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
  hasValidSession: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const AUTH_REMEMBER_KEY = 'kinderly.remember'
const AUTH_CACHE_KEY = 'kinderly.auth.cache'
const AUTH_SESSION_MARKER = 'kinderly.auth.browser'
const AUTH_COOKIE_NAME = 'kinderly_has_session'
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30

// Module-level in-memory cache — survives browser tab switches within the same session.
// Prevents redundant Supabase round-trips when TOKEN_REFRESHED or INITIAL_SESSION fires.
type MemCache = { snapshot: AuthSnapshot; userId: string; ts: number }
let _memCache: MemCache | null = null
const MEM_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

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
  window.localStorage.setItem(AUTH_REMEMBER_KEY, '0')
  window.sessionStorage.removeItem(AUTH_SESSION_MARKER)
}

function getRememberPreference() {
  return false
}

function clearCachedAuth() {
  if (typeof window === 'undefined') return
  _memCache = null
  window.localStorage.removeItem(AUTH_CACHE_KEY)
  window.sessionStorage.removeItem(AUTH_CACHE_KEY)
  window.sessionStorage.removeItem(AUTH_SESSION_MARKER)
  clearSessionCookie()
}

function persistSnapshot(snapshot: AuthSnapshot) {
  void snapshot
}

function readCachedSnapshot() {
  return null
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
  const [hasValidSession, setHasValidSession] = useState(false)
  const lastValidSnapshotRef = useRef<AuthSnapshot | null>(null)

  const commitSnapshot = useCallback((nextSnapshot: AuthSnapshot) => {
    if (!nextSnapshot.session?.user) {
      // Signed-out path: set everything to null directly so React
      // always propagates the cleared state to consumers.
      setSession(null)
      setRole(null)
      setOkul(null)
      setPersonel(null)
      setLoading(false)
      setHasValidSession(false)
      lastValidSnapshotRef.current = null
      _memCache = null
      clearCachedAuth()
      return
    }

    // Signed-in path: use functional setters with reference equality.
    // If nothing meaningful changed, the same object reference is returned so
    // React skips re-rendering that state. This prevents panel useEffects from
    // re-firing when auth emits TOKEN_REFRESHED with the same user/token
    // (which would cause alive=false → setPageLoading stuck on true).
    setSession((prev) => {
      if (
        prev?.user?.id === nextSnapshot.session?.user?.id &&
        prev?.access_token === nextSnapshot.session?.access_token
      ) return prev
      return nextSnapshot.session
    })
    setRole((prev) => (prev === nextSnapshot.role ? prev : nextSnapshot.role))
    setOkul((prev) => (prev?.id === nextSnapshot.okul?.id ? prev : nextSnapshot.okul))
    setPersonel((prev) => (prev?.id === nextSnapshot.personel?.id ? prev : nextSnapshot.personel))
    setLoading(false)
    const isValid = !!(nextSnapshot.session && nextSnapshot.okul)
    setHasValidSession(isValid)
    if (isValid) {
      lastValidSnapshotRef.current = { ...nextSnapshot }
    }

    _memCache = { snapshot: { ...nextSnapshot }, userId: nextSnapshot.session.user.id, ts: Date.now() }
    persistSnapshot({
      ...nextSnapshot,
      expiresAt: nextSnapshot.remember ? Date.now() + (THIRTY_DAYS_IN_SECONDS * 1000) : null,
    })
  }, [])

  const restoreExistingSnapshot = useCallback((user: User, remembered: boolean, nextSession: Session | null) => {
    const cachedSnapshot =
      (lastValidSnapshotRef.current?.session?.user?.id === user.id ? lastValidSnapshotRef.current : null) ??
      (_memCache?.userId === user.id ? _memCache.snapshot : null) ??
      readCachedSnapshot()

    if (!cachedSnapshot?.session?.user || cachedSnapshot.session.user.id !== user.id || !cachedSnapshot.okul) {
      return false
    }
    commitSnapshot({
      ...cachedSnapshot,
      session: nextSession ?? cachedSnapshot.session,
      remember: remembered,
    })
    return true
  }, [commitSnapshot])

  const clearSnapshot = useCallback((remembered: boolean) => {
    commitSnapshot({ session: null, role: null, okul: null, personel: null, remember: remembered })
  }, [commitSnapshot])

  const handleSignedOutLikeState = useCallback((event: AuthChangeEvent, rememberCurrent: boolean) => {
    if (event === 'SIGNED_OUT') {
      clearSnapshot(rememberCurrent)
      return
    }

    // Ignore transient null-session auth events when we still have a previously
    // validated school/session snapshot; token refresh recovery can briefly enter
    // this branch and we do not want to force users back to /giris.
    const preservedSnapshot = lastValidSnapshotRef.current ?? _memCache?.snapshot ?? readCachedSnapshot()
    if (preservedSnapshot?.session?.user && preservedSnapshot.okul) {
      commitSnapshot({
        ...preservedSnapshot,
        remember: rememberCurrent,
      })
      return
    }

    clearSnapshot(rememberCurrent)
  }, [clearSnapshot, commitSnapshot])

  const fetchRole = useCallback(async (user: User, remembered = getRememberPreference(), nextSession: Session | null = null) => {
    // Use in-memory cache if same user and fresh enough — skips all Supabase queries.
    if (_memCache && _memCache.userId === user.id && Date.now() - _memCache.ts < MEM_CACHE_TTL) {
      commitSnapshot({
        ..._memCache.snapshot,
        session: nextSession ?? _memCache.snapshot.session,
        remember: remembered,
      })
      return
    }

    setLoading(true)

    try {
      const email = user.email?.trim().toLocaleLowerCase('tr-TR')
      let matchedPersonel: PersonelInfo | null = null

      const { data: userRows } = await supabase
          .from('personel')
          .select('id, okul_id, ad_soyad, email, rol, sinif, aktif, user_id')
          .eq('user_id', user.id)
          .limit(5)
      

      const matchedByUser = (userRows || []).find((row) => row.user_id === user.id && row.aktif) ??
        (userRows || []).find((row) => row.user_id === user.id) ??
        null

      matchedPersonel = matchedByUser

      if (!matchedPersonel && email) {
        const { data: emailRows } = await supabase
            .from('personel')
            .select('id, okul_id, ad_soyad, email, rol, sinif, aktif, user_id')
            .eq('email', email)
            .limit(5)
        

        matchedPersonel =
          (emailRows || []).find((row) => row.email?.trim().toLocaleLowerCase('tr-TR') === email && row.aktif) ??
          (emailRows || []).find((row) => row.email?.trim().toLocaleLowerCase('tr-TR') === email) ??
          null
      }

      if (matchedPersonel) {
        const normalizedRole = normalizeRole(matchedPersonel.rol)
        if (!normalizedRole) {
          await supabase.auth.signOut()
          clearSnapshot(remembered)
          return
        }

        const { data: okulData } = await supabase
            .from('okullar')
            .select('id, ad, slug, logo_url')
            .eq('id', matchedPersonel.okul_id)
            .maybeSingle()
        

        commitSnapshot({
          session: nextSession,
          role: normalizedRole,
          okul: okulData ?? null,
          personel: matchedPersonel,
          remember: remembered,
        })
        return
      }

      const { data: veli } = await supabase
          .from('veliler')
          .select('okul_id')
          .eq('user_id', user.id)
          .eq('aktif', true)
          .maybeSingle()
      

      if (veli) {
        const { data: okulData } = await supabase
            .from('okullar')
            .select('id, ad, slug, logo_url')
            .eq('id', veli.okul_id)
            .maybeSingle()
        

        commitSnapshot({
          session: nextSession,
          role: 'veli',
          okul: okulData ?? null,
          personel: null,
          remember: remembered,
        })
        return
      }

      if (restoreExistingSnapshot(user, remembered, nextSession)) {
        return
      }
      clearSnapshot(remembered)
    } catch (error) {
      console.error('Auth fetchRole hatası', error)
      if (restoreExistingSnapshot(user, remembered, nextSession)) {
        setLoading(false)
        return
      }
      clearSnapshot(remembered)
    }
  }, [clearSnapshot, commitSnapshot, restoreExistingSnapshot])

  useEffect(() => {
    let active = true
    let restoreTimeout: number | null = null
    if (!hasSupabaseEnv) {
      return () => {
        active = false
      }
    }

    const remember = false

    async function hydrateSession() {
      try {
        const { data } = await supabase.auth.getSession()
        if (!active) return

        const nextSession = data.session
        setSession(nextSession)

        if (nextSession?.user) {
          await fetchRole(nextSession.user, remember, nextSession)
        } else {
          handleSignedOutLikeState('INITIAL_SESSION', remember)
        }
      } catch (error) {
        console.error('Auth hydrate hatası', error)
        if (!active) return
        const preservedSnapshot = lastValidSnapshotRef.current ?? _memCache?.snapshot ?? readCachedSnapshot()
        if (preservedSnapshot?.session?.user && preservedSnapshot.okul) {
          commitSnapshot({
            ...preservedSnapshot,
            remember,
          })
          return
        }
        setLoading(false)
      }
    }

    void hydrateSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return

      const rememberCurrent = getRememberPreference()
      // Do NOT call setSession directly here — commitSnapshot (called below by fetchRole
      // or the else branch) handles session state with reference equality checks,
      // preventing spurious TOKEN_REFRESHED re-renders in panel pages.

      if (nextSession?.user) {
        if (!rememberCurrent && typeof window !== 'undefined') {
          window.sessionStorage.setItem(AUTH_SESSION_MARKER, '1')
        }
        await fetchRole(nextSession.user, rememberCurrent, nextSession)
      } else {
        handleSignedOutLikeState(event, rememberCurrent)
      }
    })

    return () => {
      active = false
      if (restoreTimeout) {
        window.clearTimeout(restoreTimeout)
      }
      subscription.unsubscribe()
    }
  }, [commitSnapshot, fetchRole, handleSignedOutLikeState])

  return (
    <AuthContext.Provider
      value={{
        session,
        role,
        okul,
        personel,
        loading,
        hasValidSession,
        signOut: async () => {
          if (!hasSupabaseEnv) return
          // Clear in-memory and persisted caches first so that any
          // onAuthStateChange event that fires during signOut cannot
          // repopulate the cache with stale data.
          _memCache = null
          clearCachedAuth()
          clearSnapshot(getRememberPreference())
          await supabase.auth.signOut()
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
