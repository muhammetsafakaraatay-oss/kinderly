'use client'

import Link from 'next/link'
import { useState } from 'react'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import { hasSupabaseEnv, supabase } from '@/lib/supabase'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!hasSupabaseEnv) {
      setError('Supabase ayarları eksik. Lütfen daha sonra tekrar deneyin.')
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('E-posta adresinizi girin.')
      return
    }

    setSubmitting(true)
    setError('')
    setStatus('')

    const redirectTo = `${window.location.origin}/sifre-sifirla`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })

    if (resetError) {
      setError(resetError.message || 'Şifre sıfırlama e-postası gönderilemedi.')
      setSubmitting(false)
      return
    }

    setStatus('Şifre sıfırlama bağlantısı gönderildi. E-postanızı kontrol edin.')
    setSubmitting(false)
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
            Şifre sıfırlama
          </div>
          <h1 className="mt-6 font-serif text-5xl leading-[0.95] tracking-[-0.05em] text-white">
            Hesabınıza yeniden
            <br />
            erişim sağlayın.
          </h1>
          <p className="mt-4 max-w-[560px] text-base leading-7 text-white/62">
            KinderX hesabınızın e-posta adresini girin. Size şifre yenileme bağlantısı gönderelim.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/45">E-posta</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && !submitting && handleSubmit()}
                placeholder="ornek@okulunuz.com"
                autoComplete="email"
                className="w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-[#4ade80] focus:bg-white/[0.05]"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-[20px] bg-[#4ade80] px-5 py-4 text-base font-semibold text-[#051005] transition-all hover:translate-y-[-1px] hover:bg-[#7bf0a6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Bağlantı gönderiliyor...' : 'Şifre yenileme bağlantısı gönder'}
            </button>

            {error && <p className="text-sm leading-6 text-[#fda4af]">{error}</p>}
            {status && <p className="text-sm leading-6 text-[#bbf7d0]">{status}</p>}
          </div>
        </div>
      </div>
    </main>
  )
}
