'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import { hasSupabaseEnv, supabase } from '@/lib/supabase'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

type RecoveryState = 'checking' | 'ready' | 'done' | 'error'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<RecoveryState>('checking')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => password.trim().length >= 8 && confirmPassword.trim().length >= 8 && !submitting && status === 'ready',
    [confirmPassword, password, status, submitting]
  )

  useEffect(() => {
    let cancelled = false

    async function prepareRecovery() {
      if (!hasSupabaseEnv) {
        if (!cancelled) {
          setStatus('error')
          setError('Supabase ayarları eksik. Lütfen daha sonra tekrar deneyin.')
        }
        return
      }

      const search = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const tokenHash = search.get('token_hash')
      const type = search.get('type')
      const code = search.get('code')
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const hashType = hash.get('type')

      let recoveryError: string | null = null

      if (tokenHash && type === 'recovery') {
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        recoveryError = verifyError?.message || null
      } else if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        recoveryError = exchangeError?.message || null
      } else if (accessToken && refreshToken && hashType === 'recovery') {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        recoveryError = sessionError?.message || null
      } else {
        recoveryError = 'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.'
      }

      if (cancelled) return

      if (recoveryError) {
        setStatus('error')
        setError(recoveryError)
        return
      }

      window.history.replaceState({}, '', '/sifre-sifirla')
      setStatus('ready')
      setError('')
    }

    void prepareRecovery()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit() {
    const nextPassword = password.trim()
    const nextConfirm = confirmPassword.trim()

    if (nextPassword.length < 8) {
      setError('Yeni şifre en az 8 karakter olmalı.')
      return
    }

    if (nextPassword !== nextConfirm) {
      setError('Şifre tekrar alanı eşleşmiyor.')
      return
    }

    setSubmitting(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password: nextPassword })

    if (updateError) {
      setError(updateError.message || 'Şifre güncellenemedi.')
      setSubmitting(false)
      return
    }

    await supabase.auth.signOut()
    setSubmitting(false)
    setStatus('done')
  }

  return (
    <main className={`${serif.variable} ${sans.variable} min-h-screen bg-[#060a06] font-sans text-white`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.16),transparent_45%)]" />
        <div className="absolute left-1/2 top-[-18%] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(134,239,172,0.22),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[720px] flex-col justify-center px-6 py-16">
        <Link href="/giris" className="mb-8 text-sm text-white/70 transition-colors hover:text-white">
          ← Girişe dön
        </Link>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 shadow-[0_36px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#86efac]">
            Yeni şifre oluştur
          </div>
          <h1 className="mt-6 font-serif text-5xl leading-[0.95] tracking-[-0.05em] text-white">
            KinderX hesabınız için
            <br />
            yeni şifre belirleyin.
          </h1>

          {status === 'checking' && (
            <p className="mt-6 text-base leading-7 text-white/62">Bağlantı doğrulanıyor, lütfen bekleyin...</p>
          )}

          {status === 'error' && (
            <div className="mt-6 rounded-[20px] border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm leading-6 text-red-100">
              {error}
            </div>
          )}

          {status === 'ready' && (
            <div className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Yeni şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="En az 8 karakter"
                  autoComplete="new-password"
                  className="w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-[#4ade80] focus:bg-white/[0.05]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Yeni şifre tekrar</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Şifrenizi tekrar yazın"
                  autoComplete="new-password"
                  className="w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-[#4ade80] focus:bg-white/[0.05]"
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full rounded-[20px] bg-[#4ade80] px-5 py-4 text-base font-semibold text-[#051005] transition-all hover:translate-y-[-1px] hover:bg-[#7bf0a6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Şifre güncelleniyor...' : 'Şifreyi güncelle'}
              </button>

              {error && <p className="text-sm leading-6 text-[#fda4af]">{error}</p>}
            </div>
          )}

          {status === 'done' && (
            <div className="mt-8 rounded-[20px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm leading-6 text-emerald-100">
              Şifreniz başarıyla güncellendi. Yeni şifrenizle tekrar giriş yapabilirsiniz.
              <div className="mt-4">
                <Link href="/giris" className="font-semibold text-white underline underline-offset-4">
                  Giriş ekranına git
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
