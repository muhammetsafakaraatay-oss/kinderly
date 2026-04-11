'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { hasSupabaseEnv, supabase } from '@/lib/supabase'

export type Role = 'admin' | 'ogretmen' | 'veli' | null

type OkulInfo = {
  id: number | string
  ad: string
  slug: string
}

type PersonelInfo = {
  id: number
  okul_id: number | string
  ad_soyad?: string | null
  email?: string | null
  rol: string
  sinif?: string | null
  aktif?: boolean | null
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

  async function fetchRole(user: User) {
    setLoading(true)

    try {
      const email = user.email?.trim().toLocaleLowerCase('tr-TR')
      let matchedPersonel: PersonelInfo | null = null

      const { data: activeRows } = await supabase
        .from('personel')
        .select('id, okul_id, ad_soyad, email, rol, sinif, aktif, user_id')
        .eq('user_id', user.id)
        .eq('aktif', true)
        .limit(5)

      matchedPersonel = (activeRows || []).find((row) => row.user_id === user.id) ?? null

      if (!matchedPersonel) {
        const { data: userRows } = await supabase
          .from('personel')
          .select('id, okul_id, ad_soyad, email, rol, sinif, aktif, user_id')
          .eq('user_id', user.id)
          .limit(5)

        matchedPersonel = (userRows || []).find((row) => row.user_id === user.id) ?? null
      }

      if (!matchedPersonel && email) {
        const { data: emailRows } = await supabase
          .from('personel')
          .select('id, okul_id, ad_soyad, email, rol, sinif, aktif, user_id')
          .eq('email', email)
          .limit(5)

        matchedPersonel =
          (emailRows || []).find((row) => row.email?.trim().toLocaleLowerCase('tr-TR') === email) ?? null
      }

      if (matchedPersonel) {
        const normalizedRole = normalizeRole(matchedPersonel.rol)

        if (!normalizedRole) {
          await supabase.auth.signOut()
          setRole(null)
          setOkul(null)
          setPersonel(null)
          setLoading(false)
          return
        }

        const { data: okulData } = await supabase
          .from('okullar')
          .select('id, ad, slug')
          .eq('id', matchedPersonel.okul_id)
          .maybeSingle()

        setRole(normalizedRole)
        setPersonel(matchedPersonel)
        setOkul(okulData ?? null)
        setLoading(false)
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
          .select('id, ad, slug')
          .eq('id', veli.okul_id)
          .maybeSingle()

        setRole('veli')
        setPersonel(null)
        setOkul(okulData ?? null)
        setLoading(false)
        return
      }

      setRole(null)
      setOkul(null)
      setPersonel(null)
      setLoading(false)
    } catch {
      setRole(null)
      setOkul(null)
      setPersonel(null)
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    if (!hasSupabaseEnv) {
      return () => {
        active = false
      }
    }

    async function hydrateSession() {
      const { data } = await supabase.auth.getSession()
      if (!active) return

      setSession(data.session)

      if (data.session?.user) {
        await fetchRole(data.session.user)
      } else {
        setLoading(false)
      }
    }

    hydrateSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return

      setSession(nextSession)

      if (nextSession?.user) {
        await fetchRole(nextSession.user)
      } else {
        setRole(null)
        setOkul(null)
        setPersonel(null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

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
          setRole(null)
          setOkul(null)
          setPersonel(null)
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
