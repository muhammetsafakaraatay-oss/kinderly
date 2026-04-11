'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { rolePath } from '@/lib/auth-helpers'

export default function GirisPage() {
  const router = useRouter()
  const { loading: authLoading, session, role, okul } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return

    const path = rolePath(role)
    if (session && okul?.slug && path) {
      router.replace(`/${okul.slug}/${path}`)
    }
  }, [authLoading, okul?.slug, role, router, session])

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()

    if (!normalizedEmail || !normalizedPassword) {
      setError('Email ve sifre zorunlu')
      return
    }

    setSubmitting(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    })

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Email veya sifre hatali'
          : signInError.message
      )
    }

    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#0f1a14] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#0d5c3a] rounded-2xl flex items-center justify-center text-2xl">🌱</div>
            <span className="text-2xl font-black text-white tracking-tight">Kinderly</span>
          </Link>
          <p className="text-white/40 text-sm">Anaokulu Yönetim Platformu</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-[0_40px_120px_rgba(0,0,0,0.4)]">
          <h2 className="text-lg font-bold text-[#0f1a14] mb-2 text-center">Panele Giris</h2>
          <p className="text-sm text-[#5a7265] text-center mb-6">
            Mobil uygulamadaki hesabinizla giris yapin.
          </p>

          <div className="mb-4">
            <label className="block text-xs font-bold text-[#5a7265] mb-2 uppercase tracking-wide">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="ornek@email.com"
              autoComplete="email"
              className="w-full border-2 border-[#e2e8f0] rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[#0d5c3a] transition-colors text-[#0f1a14]"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-[#5a7265] mb-2 uppercase tracking-wide">Sifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••"
              autoComplete="current-password"
              className="w-full border-2 border-[#e2e8f0] rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[#0d5c3a] transition-colors text-[#0f1a14]"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={submitting || authLoading}
            className="w-full bg-[#0d5c3a] text-white rounded-xl py-4 font-bold text-base hover:bg-[#1a7a50] transition-colors disabled:opacity-60"
          >
            {submitting || authLoading ? 'Giris yapiliyor...' : 'Giris Yap'}
          </button>

          {error && <p className="text-red-500 text-sm text-center mt-3">{error}</p>}
        </div>

        <div className="text-center mt-8 text-white/30 text-sm">
          <p>Yeni okul kaydi icin</p>
          <a href="mailto:info@kinderly.app" className="text-white/60 font-semibold hover:text-white transition-colors">
            info@kinderly.app
          </a>
        </div>
      </div>
    </div>
  )
}
