'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Instrument_Serif, DM_Sans } from 'next/font/google'
import { hasSupabaseEnv, supabase } from '@/lib/supabase'
import { getUserFacingErrorMessage } from '@/lib/supabase-helpers'
import { setAuthRememberPreference, useAuth } from '@/lib/auth'
import { rolePath } from '@/lib/auth-helpers'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

const trustStats = [
  ['512+', 'aktif okul'],
  ['%98', 'yenileme orani'],
  ['23 saat', 'aylik zaman kazanci'],
] as const

const supportPoints = [
  'Yöneticiler, öğretmenler ve veliler tek hesap altyapısında buluşur.',
  'Bildirim, aidat ve günlük akışlara aynı oturumdan erişirsiniz.',
  'Yeni premium onboarding ile açılan okul paneli burada devam eder.',
] as const

const REDIRECT_RESOLUTION_TIMEOUT_MS = 3000
const AUTH_LOADING_HINT_TIMEOUT_MS = 15000
const SIGNIN_SLOW_HINT_MS = 4000
const SIGNIN_TIMEOUT_MS = 12000
const PREPARE_OVERLAY_MAX_MS = 30000

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? ''
}

export default function GirisPage() {
  return (
    <Suspense fallback={<GirisFallback />}>
      <GirisContent />
    </Suspense>
  )
}

function GirisFallback() {
  return <main className="min-h-screen bg-[#060a06]" />
}

function GirisContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading: authLoading, session, role, okul, hasValidSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [redirectIssue, setRedirectIssue] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [authDelayHint, setAuthDelayHint] = useState('')
  const [signinSlowHint, setSigninSlowHint] = useState(false)
  const [loadingStage, setLoadingStage] = useState(0)
  const [prepareOverlayTimedOut, setPrepareOverlayTimedOut] = useState(false)
  const redirectTarget = searchParams.get('redirect') || ''
  const joinToken = searchParams.get('join_token') || ''
  const [joinProcessing, setJoinProcessing] = useState(false)

  const normalizedEmail = email.trim().toLowerCase()
  const canSubmit = normalizedEmail.length > 0 && password.trim().length > 0 && !submitting && !(authLoading && !!session && !hasValidSession)
  const redirectPath = rolePath(role)
  const roleResolutionError =
    redirectIssue ||
    (( !authLoading || hasValidSession) && session && !redirectPath
      ? 'Giriş tamamlandı fakat bu hesap henüz bir kuruma bağlanmamış görünüyor.'
      : '')

  const buttonLabel =
    submitting
      ? 'Giriş yapılıyor...'
      : authLoading && session && !hasValidSession
        ? 'Panel hazırlanıyor...'
        : 'Panele giriş yap'
  const isPreparingPanel = authLoading && !!session && !hasValidSession
  const isBusy = !!session && (submitting || (isPreparingPanel && !prepareOverlayTimedOut))
  const loadingMessages = [
    'Kimlik doğrulanıyor...',
    'Rol ve okul bilgisi hazırlanıyor...',
    'Panele yönlendiriliyorsunuz...',
  ] as const

  useEffect(() => {
    if (authLoading && !hasValidSession) return

    if (session && okul?.slug && redirectPath) {
      router.replace(redirectTarget || `/${okul.slug}/${redirectPath}`)
    }
  }, [authLoading, hasValidSession, okul?.slug, redirectPath, redirectTarget, router, session])

  useEffect(() => {
    if (authLoading || !session || !joinToken || joinProcessing || okul?.slug) return

    let cancelled = false

    async function acceptJoinInvite() {
      setJoinProcessing(true)
      setError('')
      setRedirectIssue('')

      const accessToken = await getAccessToken()
      if (!accessToken || cancelled) {
        setJoinProcessing(false)
        return
      }

      const res = await fetch('/api/join/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token: joinToken }),
      })

      const data = await res.json().catch(() => null)
      if (cancelled) return

      if (!res.ok) {
        setError(data?.error ?? 'Davet kabul edilemedi.')
        setJoinProcessing(false)
        router.replace('/kuruma-katil')
        return
      }

      window.location.href = '/giris'
    }

    void acceptJoinInvite()

    return () => {
      cancelled = true
    }
  }, [authLoading, joinProcessing, joinToken, okul?.slug, router, session])

  useEffect(() => {
    if (!session || joinProcessing || authLoading) return

    if (okul?.slug && redirectPath) {
      return
    }

    if (!hasValidSession) {
      return
    }

    const timeout = window.setTimeout(() => {
      const details = {
        userId: session.user.id,
        role,
        slug: okul?.slug ?? null,
      }
      console.error('Giriş yönlendirmesi çözülemedi.', details)
      setRedirectIssue('Hesap bulundu ama henüz bir kuruma bağlanmadı. Kuruma katıl ekranına yönlendiriliyorsunuz.')
      router.replace('/kuruma-katil')
    }, REDIRECT_RESOLUTION_TIMEOUT_MS)

    return () => window.clearTimeout(timeout)
  }, [authLoading, hasValidSession, joinProcessing, okul?.slug, redirectPath, role, router, session])

  useEffect(() => {
    if (!session || !authLoading || hasValidSession) {
      const resetTimer = window.setTimeout(() => {
        setAuthDelayHint('')
        setPrepareOverlayTimedOut(false)
      }, 0)
      return () => window.clearTimeout(resetTimer)
    }

    const timeout = window.setTimeout(() => {
      console.warn('Auth loading beklenenden uzun sürdü.', { userId: session.user.id })
      setAuthDelayHint('Oturum doğrulaması beklenenden uzun sürüyor, yönlendirme devam ediyor.')
    }, AUTH_LOADING_HINT_TIMEOUT_MS)

    return () => window.clearTimeout(timeout)
  }, [authLoading, hasValidSession, session])

  useEffect(() => {
    if (!isPreparingPanel) {
      const resetTimer = window.setTimeout(() => {
        setPrepareOverlayTimedOut(false)
      }, 0)
      return () => window.clearTimeout(resetTimer)
    }

    const timeout = window.setTimeout(() => {
      setPrepareOverlayTimedOut(true)
      setAuthDelayHint('Yönlendirme beklenenden uzun sürdü. Lütfen tekrar giriş yapın.')
    }, PREPARE_OVERLAY_MAX_MS)

    return () => window.clearTimeout(timeout)
  }, [isPreparingPanel])

  useEffect(() => {
    if (!isBusy) {
      const resetTimer = window.setTimeout(() => {
        setLoadingStage(0)
      }, 0)
      return () => window.clearTimeout(resetTimer)
    }

    const timer = window.setInterval(() => {
      setLoadingStage((prev) => Math.min(prev + 1, loadingMessages.length - 1))
    }, 1300)
    return () => window.clearInterval(timer)
  }, [isBusy, loadingMessages.length])

  async function handleLogin() {
    if (!hasSupabaseEnv) {
      setError('Supabase ayarlari Vercel ortaminda eksik. NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY eklenmeli.')
      return
    }

    const normalizedPassword = password.trim()

    if (!normalizedEmail || !normalizedPassword) {
      setError('Email ve şifre zorunlu.')
      return
    }

    setSubmitting(true)
    setError('')
    setRedirectIssue('')
    setAuthDelayHint('')
    setSigninSlowHint(false)
    setPrepareOverlayTimedOut(false)
    setAuthRememberPreference(rememberMe)

    // Show a "bağlantı yavaş" hint after SIGNIN_SLOW_HINT_MS without cancelling the request
    const slowHintTimer = window.setTimeout(() => setSigninSlowHint(true), SIGNIN_SLOW_HINT_MS)

    const signInResult = await Promise.race([
      supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      }),
      new Promise<{ error: { message: string } }>((resolve) => {
        window.setTimeout(
          () => resolve({ error: { message: 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.' } }),
          SIGNIN_TIMEOUT_MS
        )
      }),
    ])

    window.clearTimeout(slowHintTimer)
    setSigninSlowHint(false)

    const signInError = signInResult.error

    if (signInError) {
      console.error('Giriş hatası', signInError)
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Email veya şifre hatalı.'
          : signInError.message || getUserFacingErrorMessage(signInError, 'Giriş şu anda tamamlanamadı. Lütfen tekrar deneyin.')
      )
    }

    setSubmitting(false)
  }

  return (
    <main className={`${serif.variable} ${sans.variable} min-h-screen overflow-hidden bg-[#060a06] font-sans text-white`}>
      <style>{`
        :root {
          --green: #4ade80;
          --green-strong: #86efac;
          --green-dim: rgba(74, 222, 128, 0.1);
          --border: rgba(74, 222, 128, 0.14);
          --surface: #0b120b;
          --surface-soft: rgba(255, 255, 255, 0.03);
          --muted: rgba(255, 255, 255, 0.62);
        }
        .serif {
          font-family: var(--font-serif);
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.16),transparent_45%)]" />
        <div className="absolute left-1/2 top-[-18%] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(134,239,172,0.22),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(74,222,128,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col px-[5%] pb-10 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--green)] font-black text-[#061006]">
              K
            </div>
            <div>
              <div className="text-sm font-semibold text-white">KinderX</div>
              <div className="text-xs text-[var(--muted)]">Premium okul operasyonu</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/kayit"
              className="hidden rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] transition-colors hover:text-white sm:inline-flex"
            >
              Yeni okul oluştur
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[var(--border)] bg-white/[0.03] px-4 py-2 text-sm text-white transition-colors hover:bg-white/[0.06]"
            >
              Ana sayfa
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <section className="max-w-[640px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--green-dim)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--green-strong)]">
              Tek giriş, tüm okul akışı
            </div>

            <h1 className="serif mt-6 text-[clamp(3.1rem,6.8vw,6.4rem)] leading-[0.92] tracking-[-0.06em] text-white">
              Ekip, veli ve yönetim
              <br />
              aynı premium sistemde
              <br />
              bulusuyor.
            </h1>

            <p className="mt-6 max-w-[560px] text-lg leading-8 text-[var(--muted)]">
              Yeni landing ve onboarding deneyiminin devamında, oturum açan her kullanıcı kendi rolü için hazırlanan panele
              otomatik yönlenir. Daha az karmaşa, daha hızlı operasyon, daha sakin bir okul günü.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {trustStats.map(([value, label]) => (
                <div key={label} className="rounded-[24px] border border-[var(--border)] bg-white/[0.03] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div>
                  <div className="mt-2 text-sm text-[var(--muted)]">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(74,222,128,0.12),rgba(255,255,255,0.03))] p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[var(--border)] bg-[#0b140c] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--green-strong)]">
                  Login flow
                </span>
                <span className="text-sm text-[var(--muted)]">Yönetici, öğretmen ve veli rollerini aynı oturum altyapısında çözer.</span>
              </div>

              <div className="mt-5 space-y-4">
                {supportPoints.map((item, index) => (
                  <div key={item} className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[#081008] text-sm font-semibold text-[var(--green)]">
                      0{index + 1}
                    </div>
                    <p className="pt-1 text-sm leading-7 text-[var(--muted)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute inset-x-6 top-4 h-24 rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.28),transparent_72%)] blur-3xl" />

            <div className="relative rounded-[32px] border border-[var(--border)] bg-[rgba(11,18,11,0.88)] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--green-strong)]">Panel girişi</div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Hesabınızla devam edin</h2>
                </div>
                <div className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--muted)]">
                  Mobil ile aynı hesap
                </div>
              </div>

              <p className="mt-3 max-w-[460px] text-sm leading-7 text-[var(--muted)]">
                Oturum açtığınız anda hesabınızın rolünü algılar, sizi okul slug&apos;iniz altındaki doğru panele yönlendiririz.
              </p>

              {!hasSupabaseEnv && (
                <div className="mt-6 rounded-[22px] border border-amber-300/20 bg-amber-400/10 px-4 py-4 text-sm leading-6 text-amber-100">
                  Vercel ortam değişkenleri eksik. `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY`
                  tanımlanmadan web girişi çalışmaz.
                </div>
              )}

              <div className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleLogin()}
                    placeholder="ornek@okulunuz.com"
                    autoComplete="email"
                    className="w-full rounded-[20px] border border-[var(--border)] bg-white/[0.03] px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-[var(--green)] focus:bg-white/[0.05]"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Şifre</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition-colors hover:text-white"
                    >
                      {showPassword ? 'Gizle' : 'Göster'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleLogin()}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-[20px] border border-[var(--border)] bg-white/[0.03] px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-[var(--green)] focus:bg-white/[0.05]"
                  />
                  <div className="mt-3 flex justify-end">
                    <Link href="/sifremi-unuttum" className="text-xs font-semibold text-[var(--green-strong)] transition-colors hover:text-white">
                      Şifremi unuttum
                    </Link>
                  </div>
                </div>
              </div>

              <label className="mt-5 flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 accent-[var(--green)]"
                />
                Beni hatırla
                <span className="ml-auto text-xs text-white/40">{rememberMe ? '30 gün' : 'Tarayıcı oturumu'}</span>
              </label>

              <button
                onClick={handleLogin}
                disabled={!canSubmit}
                className="mt-7 w-full rounded-[20px] bg-[var(--green)] px-5 py-4 text-base font-semibold text-[#051005] transition-all hover:translate-y-[-1px] hover:bg-[#7bf0a6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {buttonLabel}
              </button>

              {(error || roleResolutionError) && (
                <p className="mt-4 text-sm leading-6 text-[#fda4af]">{error || roleResolutionError}</p>
              )}
              {!error && !roleResolutionError && (authDelayHint || signinSlowHint) && (
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                  {authDelayHint || 'Sunucuya bağlanılıyor, lütfen bekleyin...'}
                </p>
              )}
              {prepareOverlayTimedOut && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 text-sm font-semibold text-[var(--green-strong)] underline underline-offset-4"
                >
                  Sayfayı yenile ve tekrar dene
                </button>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-[var(--border)] bg-white/[0.02] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--green-strong)]">Yeni okul</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">3 adımlı premium onboarding ile dakikalar içinde kuruluma başlayın.</p>
                  <Link href="/kayit" className="mt-4 inline-flex text-sm font-semibold text-white transition-colors hover:text-[var(--green-strong)]">
                    Kayıt sayfasına git
                  </Link>
                </div>

                <div className="rounded-[20px] border border-[var(--border)] bg-white/[0.02] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--green-strong)]">Destek</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Kurulum, erişim veya davet sorunlarında ekip hızlıca yardımcı olur.</p>
                  <a
                    href="mailto:support@kinderx.app"
                    className="mt-4 inline-flex text-sm font-semibold text-white transition-colors hover:text-[var(--green-strong)]"
                  >
                    support@kinderx.app
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      {isBusy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[#0b120b] p-5 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-[var(--green)]" />
            <p className="text-sm font-semibold text-white">Panel hazırlanıyor</p>
            <p className="mt-2 text-xs text-[var(--muted)]">{loadingMessages[loadingStage]}</p>
          </div>
        </div>
      )}
    </main>
  )
}
