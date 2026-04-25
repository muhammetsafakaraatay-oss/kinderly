'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Instrument_Serif, DM_Sans } from 'next/font/google'
import { hasSupabaseEnv, supabase } from '@/lib/supabase'
import { slugifySchoolName } from '@/lib/slug'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

type Step = 1 | 2 | 3

function passwordStrength(password: string) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length

  if (score <= 2) {
    return { label: 'Zayıf', color: 'bg-red-400', width: '33%' }
  }
  if (score <= 4) {
    return { label: 'Orta', color: 'bg-amber-300', width: '66%' }
  }
  return { label: 'Güçlü', color: 'bg-[var(--green)]', width: '100%' }
}

export default function KayitPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [schoolName, setSchoolName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [panelHref, setPanelHref] = useState('/giris')

  const slug = useMemo(() => slugifySchoolName(schoolName), [schoolName])
  const strength = passwordStrength(password)

  const stepCopy = {
    1: {
      eyebrow: 'Adım 1',
      title: 'Okulunuzun adını yazın, geri kalanını biz hazırlayalım.',
      text: 'KinderX paneliniz otomatik olarak oluşur. İlk adımda sadece okul adınızı bilmemiz yeterli.',
    },
    2: {
      eyebrow: 'Adım 2',
      title: schoolName
        ? `Merhaba! ${schoolName} için yönetici hesabını oluşturalım.`
        : 'Merhaba! Yönetici hesabını oluşturalım.',
      text: 'Bu hesap aynı anda okul sahibiniz, yönetim paneliniz ve ilk operasyon merkeziniz olacak.',
    },
    3: {
      eyebrow: 'Hazır',
      title: `${schoolName} için her şey canlı.`,
      text: 'Admin paneliniz açıldı, ekip daveti ve ilk kurulum adımları sizi bekliyor.',
    },
  } as const

  async function handleStepOne() {
    if (!schoolName.trim() || !slug) {
      setError('Devam etmek icin okul adini girin.')
      return
    }

    setError('')
    setStep(2)
  }

  async function handleCreateAccount() {
    if (!schoolName.trim() || !slug || !fullName.trim() || !email.trim() || !password.trim()) {
      setError('Tum alanlari doldurun.')
      return
    }

    if (password.trim().length < 8) {
      setError('Sifre en az 8 karakter olmali.')
      return
    }

    setSubmitting(true)
    setError('')

    let response: Response

    try {
      response = await fetch('/api/kayit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          okulAdi: schoolName,
          slug,
          adSoyad: fullName,
          email,
          sifre: password,
        }),
      })
    } catch {
      setSubmitting(false)
      setError('Kayıt servisine ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.')
      return
    }

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setSubmitting(false)
      setError(typeof result?.error === 'string' ? result.error : 'Kayıt tamamlanamadı.')
      return
    }

    if (!hasSupabaseEnv) {
      setSubmitting(false)
      setError('Kayıt oluştu fakat web oturumu için Supabase ayarları eksik. Lütfen daha sonra giriş yapın.')
      setPanelHref('/giris')
      setStep(3)
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 450))

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: result.email ?? email.trim().toLowerCase(),
      password: password.trim(),
    })

    if (signInError) {
      setSubmitting(false)
      setError('Kayıt tamamlandı fakat otomatik giriş başarısız oldu. Lütfen giriş ekranından devam edin.')
      setPanelHref('/giris')
      setStep(3)
      return
    }

    const destination = `/${result.slug}/admin`
    setPanelHref(destination)
    setSubmitting(false)
    setStep(3)
  }

  function handleContinue() {
    router.push(panelHref)
  }

  return (
    <main className={`${serif.variable} ${sans.variable} min-h-screen bg-[#060a06] font-sans text-white`}>
      <style>{`
        :root {
          --green: #4ade80;
          --green-dim: rgba(74, 222, 128, 0.1);
          --border: rgba(74, 222, 128, 0.14);
          --surface: #0b120b;
          --muted: rgba(255, 255, 255, 0.54);
        }
        .serif {
          font-family: var(--font-serif);
        }
        @keyframes signup-confetti {
          0% {
            transform: translate3d(0, -10px, 0) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translate3d(0, 220px, 0) rotate(460deg);
            opacity: 0;
          }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.14),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(74,222,128,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-50" />
      </div>

      {step === 3 &&
        Array.from({ length: 20 }, (_, index) => (
          <span
            key={index}
            className="pointer-events-none fixed top-0 z-40 h-3 w-2 rounded-full bg-[var(--green)]"
            style={{
              left: `${5 + index * 4.5}%`,
              animation: `signup-confetti ${1.7 + (index % 4) * 0.15}s ease-out ${index * 0.03}s forwards`,
              boxShadow: '0 0 18px rgba(74,222,128,0.35)',
            }}
          />
        ))}

      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col px-[5%] pb-10 pt-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--green)] font-black text-[#060a06]">
              K
            </div>
            <div>
              <div className="text-sm font-semibold text-white">KinderX</div>
              <div className="text-xs text-[var(--muted)]">Kuruluma hoş geldiniz</div>
            </div>
          </Link>
          <Link href="/giris" className="text-sm text-[var(--muted)] transition-colors hover:text-white">
            Zaten hesabın var mı?
          </Link>
        </div>

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            <span>Kurulum akışı</span>
            <span>Adım {step} / 3</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.05]">
            <div
              className="h-2 rounded-full bg-[var(--green)] transition-all duration-500"
              style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
            />
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            {[1, 2, 3].map((value) => (
              <div key={value} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] ${
                    step >= value
                      ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]'
                      : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {value}
                </div>
                {value < 3 && <div className="h-px w-6 bg-[var(--border)]" />}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid flex-1 gap-10 lg:grid-cols-[0.96fr_1.04fr] lg:items-center">
          <section className="max-w-[560px]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">
              {stepCopy[step].eyebrow}
            </div>
            <h1 className="serif mt-5 text-[clamp(3rem,6vw,6rem)] leading-[0.92] tracking-[-0.05em] text-white">
              {step === 1 && (
                <>
                  Okulunuzun
                  <br />
                  yeni nesil
                  <br />
                  operasyon merkezi
                  <br />
                  hazırlanıyor.
                </>
              )}
              {step === 2 && (
                <>
                  Simdi guvenli
                  <br />
                  yönetici hesabını
                  <br />
                  oluşturup
                  <br />
                  acilisi yapalim.
                </>
              )}
              {step === 3 && (
                <>
                  {schoolName}
                  <br />
                  KinderX&apos;e
                  <br />
                  katildi ve
                  <br />
                  canliya gecti.
                </>
              )}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[var(--muted)]">{stepCopy[step].text}</p>

            <div className="mt-10 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Neler hazır olacak?</div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  ['Canli admin paneli', 'Rol bazli yonetim ekranlari'],
                  ['Premium veli deneyimi', 'Mesaj, feed ve galeri akisi'],
                  ['Tahsilat gorunurlugu', 'Aidat ve finans modulleri'],
                  ['Operasyon hızlanması', 'Yoklama ve günlük rapor otomasyonu'],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-[20px] border border-[var(--border)] bg-white/[0.02] p-4">
                    <div className="text-sm font-semibold text-white">{title}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute -left-10 top-10 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.18),transparent_70%)] blur-2xl" />
            <div className="relative rounded-[28px] border border-[var(--border)] bg-[rgba(11,18,11,0.78)] p-6 shadow-[0_36px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8">
              {error && (
                <div className="mb-6 rounded-[18px] border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-8">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                      Adim 1
                    </div>
                    <h2 className="serif mt-3 text-4xl text-white">Okulunuzun adi nedir?</h2>
                  </div>

                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
                    <input
                      value={schoolName}
                      onChange={(event) => setSchoolName(event.target.value)}
                      placeholder="Ornek: Renkli Dusler Anaokulu"
                      className="w-full border-none bg-transparent text-2xl font-medium text-white outline-none placeholder:text-white/26"
                    />
                    <div className="mt-6 border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
                      Paneliniz: <span className="font-semibold text-[var(--green)]">kinderx.app/{slug || 'okulunuz'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStepOne}
                    className="w-full rounded-full bg-[var(--green)] px-6 py-4 text-sm font-bold text-[#060a06] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(74,222,128,0.22)]"
                  >
                    Devam →
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                      Adım 2
                    </div>
                    <h2 className="serif mt-3 text-4xl text-white">
                      Merhaba! {schoolName} için hesap oluşturalım.
                    </h2>
                  </div>

                  <div className="grid gap-4">
                    <label className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Ad Soyad</div>
                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Ayse Yilmaz"
                        className="w-full bg-transparent text-lg text-white outline-none placeholder:text-white/26"
                      />
                    </label>

                    <label className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Email</div>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="yonetici@okulunuz.com"
                        className="w-full bg-transparent text-lg text-white outline-none placeholder:text-white/26"
                      />
                    </label>

                    <label className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Sifre</span>
                        <span className="text-xs font-semibold text-[var(--green)]">{strength.label}</span>
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Güçlü bir şifre belirleyin"
                        className="w-full bg-transparent text-lg text-white outline-none placeholder:text-white/26"
                      />
                      <div className="mt-4 h-2 rounded-full bg-white/[0.05]">
                        <div className={`h-2 rounded-full ${strength.color} transition-all`} style={{ width: strength.width }} />
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="rounded-full border border-[var(--border)] px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-white/5"
                    >
                      Geri
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleCreateAccount}
                      className="flex-1 rounded-full bg-[var(--green)] px-6 py-4 text-sm font-bold text-[#060a06] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(74,222,128,0.22)] disabled:opacity-60"
                    >
                      {submitting ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur →'}
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--green-dim)] text-4xl">
                    🎉
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--green)]">Hazır!</div>
                    <h2 className="serif mt-4 text-5xl text-white">{schoolName} KinderX&apos;e Katıldı!</h2>
                    <p className="mx-auto mt-4 max-w-[520px] text-lg leading-relaxed text-[var(--muted)]">
                      Admin paneliniz oluştu, oturumunuz açıldı ve ilk kurulum adımları sizin için hazır.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-left">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Hazırlanan alan</div>
                    <div className="mt-3 text-xl font-semibold text-white">kinderx.app/{slug}/admin</div>
                    <div className="mt-2 text-sm text-[var(--muted)]">
                      Öğrenciler, sınıflar, aidatlar ve iletişim modülleri kullanıma hazır.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleContinue}
                    className="w-full rounded-full bg-[var(--green)] px-6 py-4 text-sm font-bold text-[#060a06] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(74,222,128,0.22)]"
                  >
                    Admin Paneline Git →
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
