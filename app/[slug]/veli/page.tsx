'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Instrument_Serif, DM_Sans } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { rolePath } from '@/lib/auth-helpers'
import {
  getSupabaseErrorMessage,
  insertMessageCompat,
  loadAnnouncementsCompat,
  loadParentChildren,
  normalizeAnnouncement,
  resolveParentMessageParties,
} from '@/lib/supabase-helpers'
import type { Aidat, Ogrenci, Okul } from '@/lib/types'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

type ActivityRow = {
  id: number
  tur: string
  detay?: Record<string, string | number | boolean | null> | null
  kaydeden?: string | null
  created_at?: string | null
}

const activityLabels: Record<string, { label: string; emoji: string }> = {
  food: { label: 'Yemek', emoji: '🍎' },
  nap: { label: 'Uyku', emoji: '😴' },
  potty: { label: 'Tuvalet', emoji: '🚽' },
  photo: { label: 'Fotoğraf', emoji: '📷' },
  kudos: { label: 'Tebrik', emoji: '⭐' },
  meds: { label: 'İlaç', emoji: '💊' },
  incident: { label: 'Kaza', emoji: '🩹' },
  health: { label: 'Sağlık', emoji: '🌡️' },
  note: { label: 'Not', emoji: '📝' },
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatTime(value?: string | null) {
  if (!value) return 'Bugün'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Bugün'
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function detailText(row: ActivityRow) {
  const detay = row.detay || {}
  const values = ['not', 'ogun', 'yeme', 'sure', 'ates', 'ilac', 'doz']
    .map((key) => detay[key])
    .filter(Boolean)
    .map((value) => String(value))
  return values[0] || 'Öğretmen günlük akışa yeni kayıt ekledi.'
}

export default function VeliPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { session, role, okul: authOkul, loading, signOut } = useAuth()
  const [slug, setSlug] = useState('')
  const [children, setChildren] = useState<Ogrenci[]>([])
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState('')
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [announcements, setAnnouncements] = useState<ReturnType<typeof normalizeAnnouncement>[]>([])
  const [aidatlar, setAidatlar] = useState<Aidat[]>([])
  const [messageText, setMessageText] = useState('')
  const [messageState, setMessageState] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    params.then((value) => setSlug(value.slug))
  }, [params])

  const okul = authOkul as Okul | null

  useEffect(() => {
    if (loading || !slug) return

    if (!session || !authOkul) {
      router.replace('/giris')
      return
    }

    const expectedPath = rolePath(role)
    if (role !== 'veli') {
      router.replace(`/${authOkul.slug}/${expectedPath ?? 'admin'}`)
      return
    }

    if (authOkul.slug !== slug) {
      router.replace(`/${authOkul.slug}/veli`)
      return
    }

  }, [authOkul, loading, role, router, session, slug])

  useEffect(() => {
    if (!okul || !session) return

    let cancelled = false
    const currentSession = session
    const currentOkul = okul

    async function bootstrap() {
      setPageLoading(true)

      const { data, error } = await loadParentChildren(currentSession.user.id, currentOkul.id)

      if (cancelled) return

      if (error) {
        setChildren([])
        setSelectedChildId(null)
        setPageLoading(false)
        return
      }

      const nextChildren = data as Ogrenci[]
      setChildren(nextChildren)
      setSelectedChildId((current) => current ?? nextChildren[0]?.id ?? null)
      setPageLoading(false)
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [okul, session])

  useEffect(() => {
    if (!okul || !selectedChildId) return

    let cancelled = false
    const currentOkul = okul

    async function loadDashboard() {
      setPageLoading(true)

      const [{ data: activityRows }, { data: yoklama }, { data: announcementRows }, { data: feeRows }] = await Promise.all([
        supabase
          .from('aktiviteler')
          .select('id,tur,detay,kaydeden,created_at')
          .eq('okul_id', currentOkul.id)
          .eq('ogrenci_id', selectedChildId)
          .eq('tarih', today())
          .eq('veli_gosterilsin', true)
          .order('id', { ascending: false })
          .limit(8),
        supabase
          .from('yoklama')
          .select('durum')
          .eq('okul_id', currentOkul.id)
          .eq('ogrenci_id', selectedChildId)
          .eq('tarih', today())
          .maybeSingle(),
        loadAnnouncementsCompat(currentOkul.id, 5),
        supabase
          .from('aidatlar')
          .select('*')
          .eq('okul_id', currentOkul.id)
          .eq('ogrenci_id', selectedChildId)
          .order('id', { ascending: false })
          .limit(6),
      ])

      if (cancelled) return

      setActivities((activityRows || []) as ActivityRow[])
      setAttendanceStatus(yoklama?.durum || '')
      setAnnouncements(announcementRows || [])
      setAidatlar((feeRows || []) as Aidat[])
      setPageLoading(false)
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [okul, selectedChildId])

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) || null,
    [children, selectedChildId]
  )

  const unpaidTotal = useMemo(
    () => aidatlar.filter((item) => !item.odendi).reduce((sum, item) => sum + Number(item.tutar || 0), 0),
    [aidatlar]
  )

  async function sendMessage() {
    if (!session || !okul || !selectedChild || !messageText.trim()) return

    setSending(true)
    setMessageState('')

    const { data: parties, error: partyError } = await resolveParentMessageParties(session.user.id, okul.id, selectedChild.id)

    if (partyError || !parties) {
      setMessageState(getSupabaseErrorMessage(partyError, 'Öğretmen eşleşmesi bulunamadı.'))
      setSending(false)
      return
    }

    const { error } = await insertMessageCompat(
      {
        okul_id: okul.id,
        ogrenci_id: selectedChild.id,
        gonderen_id: parties.senderId,
        gonderen_rol: 'veli',
        alici_id: parties.receiverId,
        alici_tip: 'ogretmen',
        okundu: false,
        olusturuldu: new Date().toISOString(),
      },
      messageText.trim()
    )

    if (error) {
      setMessageState(getSupabaseErrorMessage(error, 'Mesaj gönderilemedi.'))
      setSending(false)
      return
    }

    setMessageText('')
    setMessageState('Mesaj öğretmene iletildi.')
    setSending(false)
  }

  if (loading || pageLoading || !session || !okul) {
    return <LoadingScreen />
  }

  return (
    <main className={`${serif.variable} ${sans.variable} min-h-screen bg-[#060a06] font-sans text-white`}>
      <style>{`
        :root {
          --green: #4ade80;
          --green-dim: rgba(74, 222, 128, 0.1);
          --border: rgba(74, 222, 128, 0.14);
          --surface: #0b120b;
          --muted: rgba(255, 255, 255, 0.62);
        }
        .serif {
          font-family: var(--font-serif);
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.15),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(74,222,128,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,0.03)_1px,transparent_1px)] bg-[size:42px_42px] opacity-35" />
      </div>

      <div className="relative mx-auto min-h-screen max-w-[1440px] px-[5%] pb-10 pt-8">
        <header className="flex flex-col gap-6 border-b border-[var(--border)] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Veli paneli</div>
            <h1 className="serif mt-4 text-[clamp(2.8rem,6vw,5.6rem)] leading-[0.92] tracking-[-0.05em]">
              Çocuğunuzun gününü
              <br />
              sakin ve net izleyin.
            </h1>
            <p className="mt-4 max-w-[620px] text-base leading-7 text-[var(--muted)]">
              Yoklama, günlük akış, duyurular ve aidat durumu tek premium ekranda bir araya geliyor.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/giris" className="rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--muted)] transition-colors hover:text-white">
              Giriş sayfası
            </Link>
            <button
              onClick={async () => {
                await signOut()
                router.replace('/giris')
              }}
              className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-[#061006]"
            >
              Çıkış yap
            </button>
          </div>
        </header>

        {children.length > 1 && (
          <div className="mt-8 flex flex-wrap gap-3">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`rounded-full px-4 py-3 text-sm font-semibold transition-colors ${
                  selectedChildId === child.id
                    ? 'bg-[var(--green)] text-[#061006]'
                    : 'border border-[var(--border)] text-[var(--muted)]'
                }`}
              >
                {child.ad_soyad.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        {selectedChild ? (
          <>
            <section className="mt-8 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(74,222,128,0.14),rgba(255,255,255,0.03))] p-7">
                <div className="flex flex-wrap items-center justify-between gap-5">
                  <div>
                    <div className="text-sm text-[var(--muted)]">Bugünkü durum</div>
                    <div className="mt-3 serif text-5xl text-[var(--green)]">
                      {attendanceStatus === 'geldi' ? 'Okulda' : attendanceStatus === 'gelmedi' ? 'Gelmedi' : attendanceStatus === 'izinli' ? 'İzinli' : 'Bekleniyor'}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-[var(--border)] bg-[#081008] px-5 py-4 text-right">
                    <div className="text-sm text-[var(--muted)]">Çocuk</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{selectedChild.ad_soyad}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{selectedChild.sinif || 'Sınıf bilgisi yok'}</div>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <MetricCard label="Bugünkü aktivite" value={String(activities.length)} />
                  <MetricCard label="Bekleyen aidat" value={formatCurrency(unpaidTotal)} />
                  <MetricCard label="Duyuru" value={String(announcements.length)} />
                </div>
              </div>

              <Panel title="Öğretmene mesaj gönder" subtitle="Sınıf öğretmenine hızlıca ulaşın">
                <textarea
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Bugünle ilgili kısa bir not yazın..."
                  className="min-h-[140px] w-full rounded-[22px] border border-[var(--border)] bg-white/[0.03] px-4 py-4 text-sm text-white outline-none placeholder:text-white/25"
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-sm text-[var(--muted)]">Mesaj doğrudan ilişkili öğretmene iletilir.</div>
                  <button
                    onClick={sendMessage}
                    disabled={sending || !messageText.trim()}
                    className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-[#061006] disabled:opacity-50"
                  >
                    {sending ? 'Gönderiliyor...' : 'Mesajı gönder'}
                  </button>
                </div>
                {messageState && <p className="mt-4 text-sm text-[var(--green)]">{messageState}</p>}
              </Panel>
            </section>

            <section className="mt-8 grid gap-5 lg:grid-cols-2">
              <Panel title="Günlük aktivite feed'i" subtitle="Öğretmenin bugün paylaştıkları">
                {activities.length ? (
                  <div className="space-y-3">
                    {activities.map((activity) => {
                      const meta = activityLabels[activity.tur] || { label: activity.tur, emoji: '📋' }
                      return (
                        <div key={activity.id} className="rounded-[22px] border border-[var(--border)] bg-white/[0.02] p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[#081008] text-xl">
                              {meta.emoji}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="font-semibold text-white">{meta.label}</div>
                                <div className="text-xs text-[var(--muted)]">{formatTime(activity.created_at)}</div>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detailText(activity)}</p>
                              {activity.kaydeden && <div className="mt-2 text-xs text-[var(--green)]">{activity.kaydeden}</div>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState text="Bugün paylaşılmış aktivite bulunmuyor." />
                )}
              </Panel>

              <div className="grid gap-5">
                <Panel title="Duyurular" subtitle="Okuldan son paylaşımlar">
                  {announcements.length ? (
                    <div className="space-y-3">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="rounded-[22px] border border-[var(--border)] bg-white/[0.02] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold text-white">{announcement.baslik}</div>
                            <div className="text-xs text-[var(--muted)]">{formatTime(announcement.created_at)}</div>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{announcement.icerik}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="Henüz okul duyurusu paylaşılmadı." />
                  )}
                </Panel>

                <Panel title="Aidat durumu" subtitle="Son kayıtlar ve bekleyen toplam">
                  {aidatlar.length ? (
                    <div className="space-y-3">
                      {aidatlar.map((aidat) => (
                        <div key={aidat.id} className="rounded-[22px] border border-[var(--border)] bg-white/[0.02] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold text-white">{aidat.ay || 'Aidat kaydı'}</div>
                              <div className="mt-1 text-sm text-[var(--muted)]">
                                {aidat.odendi ? 'Ödeme alındı' : 'Ödeme bekleniyor'}
                              </div>
                            </div>
                            <div className={`rounded-full px-3 py-2 text-xs font-semibold ${aidat.odendi ? 'bg-white/10 text-white' : 'bg-[var(--green)] text-[#061006]'}`}>
                              {formatCurrency(Number(aidat.tutar || 0))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="Bu çocuk için aidat kaydı bulunmuyor." />
                  )}
                </Panel>
              </div>
            </section>
          </>
        ) : (
          <div className="mt-8 rounded-[28px] border border-dashed border-[var(--border)] p-8 text-[var(--muted)]">
            Bu veli hesabına bağlı öğrenci bulunamadı.
          </div>
        )}
      </div>
    </main>
  )
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060a06] text-white">
      Panel hazırlanıyor...
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[#081008] p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-[rgba(11,18,11,0.88)] p-7">
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--green)]">{title}</div>
        <div className="mt-2 text-sm text-[var(--muted)]">{subtitle}</div>
      </div>
      {children}
    </section>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[22px] border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)]">{text}</div>
}
