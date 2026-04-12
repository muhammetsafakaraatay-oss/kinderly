'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Instrument_Serif, DM_Sans } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { rolePath } from '@/lib/auth-helpers'
import { loadAnnouncementsCompat, normalizeAnnouncement } from '@/lib/supabase-helpers'
import type { Ogrenci, Okul } from '@/lib/types'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

type TeacherProfile = {
  id: number
  ad_soyad?: string | null
  sinif?: string | null
}

type ActivityRow = {
  id: number
  tur: string
  detay?: Record<string, string | number | boolean | null> | null
  kaydeden?: string | null
  created_at?: string | null
  ogrenciler?: { ad_soyad?: string | null } | null
}

type MessageRow = {
  id: number
  gonderen_tip?: string | null
  icerik?: string | null
  mesaj?: string | null
  olusturuldu?: string | null
  created_at?: string | null
}

const activityLabels: Record<string, { label: string; emoji: string }> = {
  food: { label: 'Yemek', emoji: '🍎' },
  nap: { label: 'Uyku', emoji: '😴' },
  potty: { label: 'Tuvalet', emoji: '🚽' },
  kudos: { label: 'Tebrik', emoji: '⭐' },
  meds: { label: 'İlaç', emoji: '💊' },
  incident: { label: 'Kaza', emoji: '🩹' },
  health: { label: 'Sağlık', emoji: '🌡️' },
  note: { label: 'Not', emoji: '📝' },
  photo: { label: 'Fotoğraf', emoji: '📷' },
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function formatTime(value?: string | null) {
  if (!value) return 'Bugün'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Bugün'
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function detailText(row: ActivityRow) {
  const detay = row.detay || {}
  const values = ['not', 'ogun', 'yeme', 'sure', 'ates', 'ilac', 'doz']
    .map((key) => detay[key])
    .filter(Boolean)
    .map((value) => String(value))
  return values[0] || 'Günlük akışa yeni kayıt eklendi.'
}

export default function OgretmenPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { session, role, okul: authOkul, loading, signOut } = useAuth()
  const [slug, setSlug] = useState('')
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [attendance, setAttendance] = useState<Record<number, string>>({})
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [announcements, setAnnouncements] = useState<ReturnType<typeof normalizeAnnouncement>[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [savingAttendance, setSavingAttendance] = useState(false)

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
    if (role !== 'ogretmen') {
      router.replace(`/${authOkul.slug}/${expectedPath ?? 'admin'}`)
      return
    }

    if (authOkul.slug !== slug) {
      router.replace(`/${authOkul.slug}/ogretmen`)
      return
    }

  }, [authOkul, loading, role, router, session, slug])

  useEffect(() => {
    if (!okul || !session) return

    let cancelled = false
    const currentSession = session
    const currentOkul = okul

    async function loadPanel() {
      setPageLoading(true)

      const { data: personel } = await supabase
        .from('personel')
        .select('id, ad_soyad, sinif')
        .eq('user_id', currentSession.user.id)
        .eq('okul_id', currentOkul.id)
        .maybeSingle()

      if (cancelled || !personel?.id) {
        setPageLoading(false)
        return
      }

      setTeacher(personel as TeacherProfile)

      let studentQuery = supabase
        .from('ogrenciler')
        .select('*')
        .eq('okul_id', currentOkul.id)
        .eq('aktif', true)
        .order('ad_soyad')

      if (personel.sinif) {
        studentQuery = studentQuery.eq('sinif', personel.sinif)
      }

      const { data: students } = await studentQuery
      const safeStudents = (students || []) as Ogrenci[]
      const studentIds = safeStudents.map((item) => item.id)

      const [{ data: yoklamaRows }, { data: announcementRows }, { data: teacherMessages }] = await Promise.all([
        supabase.from('yoklama').select('ogrenci_id,durum').eq('okul_id', currentOkul.id).eq('tarih', today()),
        loadAnnouncementsCompat(currentOkul.id, 5),
        supabase
          .from('mesajlar')
          .select('*')
          .eq('okul_id', currentOkul.id)
          .or(`gonderen_id.eq.${personel.id},alici_id.eq.${personel.id}`)
          .order('olusturuldu', { ascending: false })
          .limit(5),
      ])

      let activityRows: ActivityRow[] = []

      if (studentIds.length) {
        const { data } = await supabase
          .from('aktiviteler')
          .select('id,tur,detay,kaydeden,created_at,ogrenciler(ad_soyad)')
          .eq('okul_id', currentOkul.id)
          .eq('tarih', today())
          .in('ogrenci_id', studentIds)
          .order('id', { ascending: false })
          .limit(8)

        activityRows = (data || []) as ActivityRow[]
      }

      if (cancelled) return

      setOgrenciler(safeStudents)
      setActivities(activityRows)
      setAnnouncements(announcementRows || [])
      setMessages((teacherMessages || []) as MessageRow[])

      const nextAttendance: Record<number, string> = {}
      ;(yoklamaRows || []).forEach((row: { ogrenci_id: number; durum: string }) => {
        nextAttendance[row.ogrenci_id] = row.durum
      })
      setAttendance(nextAttendance)
      setPageLoading(false)
    }

    loadPanel()

    return () => {
      cancelled = true
    }
  }, [okul, session])

  const attendanceCount = useMemo(
    () => Object.values(attendance).filter((value) => value === 'geldi').length,
    [attendance]
  )

  const attendanceRate = ogrenciler.length ? Math.round((attendanceCount / ogrenciler.length) * 100) : 0

  async function saveAttendance() {
    if (!okul) return

    setSavingAttendance(true)
    await supabase.from('yoklama').delete().eq('okul_id', okul.id).eq('tarih', today())

    const rows = Object.entries(attendance).map(([ogrenciId, durum]) => ({
      okul_id: okul.id,
      ogrenci_id: Number(ogrenciId),
      tarih: today(),
      durum,
    }))

    if (rows.length) {
      await supabase.from('yoklama').insert(rows)
    }

    setSavingAttendance(false)
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
          --surface-soft: rgba(255, 255, 255, 0.03);
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
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Öğretmen paneli</div>
            <h1 className="serif mt-4 text-[clamp(2.8rem,6vw,5.6rem)] leading-[0.92] tracking-[-0.05em]">
              Sınıf akışını
              <br />
              premium hızda yönetin.
            </h1>
            <p className="mt-4 max-w-[620px] text-base leading-7 text-[var(--muted)]">
              {teacher?.ad_soyad || 'Öğretmen'} için bugünün devamı, aktiviteler, mesajlar ve duyurular tek ekranda.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={`/${okul.slug}/admin`} className="rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--muted)] transition-colors hover:text-white">
              Yönetici paneli
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

        <section className="mt-8 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(74,222,128,0.14),rgba(255,255,255,0.03))] p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm text-[var(--muted)]">Bugünün devam oranı</div>
                <div className="mt-3 serif text-6xl text-[var(--green)]">%{attendanceRate}</div>
              </div>
              <div className="rounded-[24px] border border-[var(--border)] bg-[#081008] px-5 py-4 text-right">
                <div className="text-sm text-[var(--muted)]">Sınıf</div>
                <div className="mt-2 text-2xl font-semibold text-white">{teacher?.sinif || 'Tüm sınıflar'}</div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <MetricCard label="Toplam öğrenci" value={String(ogrenciler.length)} />
              <MetricCard label="Gelen öğrenci" value={String(attendanceCount)} />
              <MetricCard label="Bugünkü aktivite" value={String(activities.length)} />
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(11,18,11,0.88)] p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--green)]">Hızlı yoklama</div>
                <div className="mt-3 text-2xl font-semibold text-white">Bugünü tek akışta işaretleyin</div>
              </div>
              <button
                onClick={saveAttendance}
                disabled={savingAttendance}
                className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-[#061006] disabled:opacity-50"
              >
                {savingAttendance ? 'Kaydediliyor...' : 'Yoklamayı kaydet'}
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {ogrenciler.slice(0, 6).map((ogrenci) => {
                const value = attendance[ogrenci.id] || ''
                return (
                  <div key={ogrenci.id} className="rounded-[22px] border border-[var(--border)] bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">{ogrenci.ad_soyad}</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">{ogrenci.sinif || teacher?.sinif || 'Sınıf bilgisi yok'}</div>
                      </div>
                      <div className="flex gap-2">
                        {[
                          ['geldi', 'Geldi'],
                          ['gelmedi', 'Gelmedi'],
                          ['izinli', 'İzinli'],
                        ].map(([status, label]) => (
                          <button
                            key={status}
                            onClick={() => setAttendance((current) => ({ ...current, [ogrenci.id]: status }))}
                            className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                              value === status ? 'bg-[var(--green)] text-[#061006]' : 'border border-[var(--border)] text-[var(--muted)]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <Panel title="Bugünün aktivite feed'i" subtitle="Sınıfınızdan son kayıtlar">
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
                          <div className="mt-1 text-sm text-[var(--green)]">{activity.ogrenciler?.ad_soyad || 'Öğrenci'}</div>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detailText(activity)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState text="Bugün için henüz aktivite kaydı yok." />
            )}
          </Panel>

          <div className="grid gap-5">
            <Panel title="Mesajlar" subtitle="Son 5 konuşma kaydı">
              {messages.length ? (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-[22px] border border-[var(--border)] bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white">
                          {message.gonderen_tip === 'veli' ? 'Veliden gelen mesaj' : 'Gönderilen mesaj'}
                        </div>
                        <div className="text-xs text-[var(--muted)]">{formatTime(message.olusturuldu || message.created_at)}</div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{message.icerik || message.mesaj || 'İçerik bulunamadı.'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="Henüz mesaj kaydı bulunmuyor." />
              )}
            </Panel>

            <Panel title="Duyurular" subtitle="Okuldan en güncel başlıklar">
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
                <EmptyState text="Paylaşılmış duyuru bulunmuyor." />
              )}
            </Panel>
          </div>
        </section>
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
      <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</div>
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
