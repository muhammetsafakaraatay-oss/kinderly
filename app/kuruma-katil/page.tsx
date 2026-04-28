'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Instrument_Serif, DM_Sans } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { rolePath } from '@/lib/auth-helpers'
import { useAuth } from '@/lib/auth'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

type JoinMode = 'invite' | 'code'

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? ''
}

export default function KurumaKatilPage() {
  return (
    <Suspense fallback={<KurumaKatilFallback />}>
      <KurumaKatilContent />
    </Suspense>
  )
}

function KurumaKatilFallback() {
  return <main className="min-h-screen bg-[#060a06]" />
}

function KurumaKatilContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, role, okul, loading } = useAuth()
  const [mode, setMode] = useState<JoinMode>('invite')
  const [token, setToken] = useState(searchParams.get('join_token') ?? '')
  const [code, setCode] = useState('')
  const [contactType, setContactType] = useState('parent')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const resolvedRolePath = useMemo(() => rolePath(role), [role])

  useEffect(() => {
    if (loading) return

    if (!session) {
      router.replace('/giris?redirect=%2Fkuruma-katil')
      return
    }

    if (okul?.slug && resolvedRolePath) {
      router.replace(`/${okul.slug}/${resolvedRolePath}`)
    }
  }, [loading, okul?.slug, resolvedRolePath, role, router, session])

  async function handleInviteJoin() {
    const accessToken = await getAccessToken()
    if (!accessToken) {
      setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }

    const res = await fetch('/api/join/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token: token.trim() }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setError(data?.error ?? 'Davet işlenemedi.')
      return
    }

    setMessage('Davet kabul edildi. Panelinize yönlendiriliyorsunuz...')
    window.location.href = '/giris'
  }

  async function handleCodeJoin() {
    const accessToken = await getAccessToken()
    if (!accessToken) {
      setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }

    const res = await fetch('/api/join/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        code: code.trim(),
        contactType,
        fullName: fullName.trim(),
        phone: phone.trim(),
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setError(data?.error ?? 'Kod ile bağlanılamadı.')
      return
    }

    setMessage(data?.message ?? 'Kuruma bağlantı tamamlandı.')
    window.location.href = '/giris'
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'invite') {
        if (!token.trim()) {
          setError('Davet tokenini girin.')
          return
        }
        await handleInviteJoin()
        return
      }

      if (!code.trim()) {
        setError('Bağlantı kodunu girin.')
        return
      }

      await handleCodeJoin()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={`${serif.variable} ${sans.variable} min-h-screen bg-[#060a06] font-sans text-white`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.16),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(74,222,128,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[980px] flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-white/70 hover:text-white">
            ← Ana sayfa
          </Link>
          <Link href="/giris" className="text-sm text-white/70 hover:text-white">
            Giriş ekranı
          </Link>
        </div>

        <div className="mx-auto mt-16 w-full max-w-[720px] rounded-[32px] border border-[rgba(74,222,128,0.14)] bg-[rgba(11,18,11,0.84)] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#86efac]">Kuruma katıl</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
            Hesabınızı bir okul ile eşleştirin.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/62">
            Davet bağlantınız varsa token ile, veli bağlantınız varsa çocuk kodu ile sisteme bağlanabilirsiniz.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('invite')}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                mode === 'invite'
                  ? 'border-[#4ade80] bg-[rgba(74,222,128,0.1)] text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/70 hover:text-white'
              }`}
            >
              <div className="text-sm font-semibold">Davet tokeni</div>
              <div className="mt-1 text-xs">Personel ya da yönetici daveti ile katıl.</div>
            </button>
            <button
              type="button"
              onClick={() => setMode('code')}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                mode === 'code'
                  ? 'border-[#4ade80] bg-[rgba(74,222,128,0.1)] text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/70 hover:text-white'
              }`}
            >
              <div className="text-sm font-semibold">Çocuk / veli kodu</div>
              <div className="mt-1 text-xs">Öğrenci bağlantı kodu ile katıl.</div>
            </button>
          </div>

          <div className="mt-8 space-y-5">
            {mode === 'invite' ? (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Davet tokeni</label>
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Maildeki token veya davet bağlantısı"
                  className="w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-[#4ade80] focus:bg-white/[0.05]"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Bağlantı kodu</label>
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="10 haneli öğrenci kodu"
                    className="w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-[#4ade80] focus:bg-white/[0.05]"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Bağlantı tipi</label>
                    <select
                      value={contactType}
                      onChange={(event) => setContactType(event.target.value)}
                      className="w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-white outline-none focus:border-[#4ade80]"
                    >
                      <option value="parent">Veli</option>
                      <option value="family">Aile yakını</option>
                      <option value="approved_pickup">Teslim yetkilisi</option>
                      <option value="emergency">Acil durum kişisi</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Telefon</label>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="05xx xxx xx xx"
                      className="w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-[#4ade80] focus:bg-white/[0.05]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Ad soyad</label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Gerekirse bağlantı kaydına yazılır"
                    className="w-full rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-[#4ade80] focus:bg-white/[0.05]"
                  />
                </div>
              </>
            )}
          </div>

          {(error || message) && (
            <div
              className={`mt-6 rounded-[20px] border px-4 py-4 text-sm ${
                error
                  ? 'border-red-500/20 bg-red-500/10 text-red-100'
                  : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
              }`}
            >
              {error || message}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-8 w-full rounded-[20px] bg-[#4ade80] px-5 py-4 text-base font-semibold text-[#051005] transition-all hover:translate-y-[-1px] hover:bg-[#7bf0a6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'İşleniyor...' : 'Kuruma bağlan'}
          </button>
        </div>
      </div>
    </main>
  )
}
