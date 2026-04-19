'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Instrument_Serif, DM_Sans } from 'next/font/google'
import { ThemeToggle } from '@/components/theme-toggle'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { rolePath } from '@/lib/auth-helpers'
import {
  getSupabaseErrorMessage,
  getUserFacingErrorMessage,
  insertMessageCompat,
  loadAnnouncementsCompat,
  loadParentChildren,
  loadStudentMessagesCompat,
  markMessagesReadCompat,
  resolveParentMessageParties,
  type AnnouncementItem,
  type NormalizedMessage,
} from '@/lib/supabase-helpers'
import type { Aidat, Ogrenci, Okul } from '@/lib/types'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

type ParentTab = 'bugun' | 'mesajlar' | 'duyurular' | 'aidatlar' | 'cocugum'

type ActivityRow = {
  id: number
  tur: string
  detay?: Record<string, unknown> | null
  kaydeden?: string | null
  created_at?: string | null
  olusturuldu?: string | null
}

type ChildDetails = Ogrenci & {
  notlar?: string | null
  alerji?: string | null
}

const tabs: Array<{ id: ParentTab; label: string; icon: string }> = [
  { id: 'bugun', label: 'Bugün', icon: '🏠' },
  { id: 'mesajlar', label: 'Mesajlar', icon: '💬' },
  { id: 'duyurular', label: 'Duyurular', icon: '📢' },
  { id: 'aidatlar', label: 'Aidatlar', icon: '💳' },
  { id: 'cocugum', label: 'Çocuğum', icon: '🌸' },
]

const activityTypes: Record<string, { emoji: string; label: string; color: string }> = {
  food: { emoji: '🍎', label: 'Yemek', color: '#00b884' },
  nap: { emoji: '😴', label: 'Uyku', color: '#3d4eb8' },
  potty: { emoji: '🚽', label: 'Tuvalet', color: '#00b8d4' },
  photo: { emoji: '📷', label: 'Fotoğraf', color: '#e91e8c' },
  kudos: { emoji: '⭐', label: 'Tebrik', color: '#9c27b0' },
  meds: { emoji: '💊', label: 'İlaç', color: '#f5a623' },
  incident: { emoji: '🩹', label: 'Kaza', color: '#f44336' },
  health: { emoji: '🌡️', label: 'Sağlık', color: '#7c4dff' },
  note: { emoji: '📝', label: 'Not', color: '#00897b' },
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function initials(name?: string | null) {
  return (name || 'Kinderly')
    .split(' ')
    .filter(Boolean)
    .map((item) => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Bugün'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Bugün'
  return date.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateLabel(value?: string | null) {
  if (!value) return 'Bilgi girilmedi'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Bilgi girilmedi'
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function activitySummary(row: ActivityRow) {
  const detay = row.detay || {}
  const values = [
    detay.not,
    detay.aciklama,
    detay.ogun ? `${String(detay.ogun)}${detay.yeme ? ` · ${String(detay.yeme)}` : ''}` : null,
    detay.sure,
    detay.ates ? `${String(detay.ates)}°C` : null,
    detay.ilac ? `${String(detay.ilac)}${detay.doz ? ` · ${String(detay.doz)}` : ''}` : null,
  ].filter(Boolean)

  return values[0] ? String(values[0]) : 'Detay eklenmedi'
}

function ageFromBirthDate(value?: string | null) {
  if (!value) return null
  const birthDate = new Date(value)
  if (Number.isNaN(birthDate.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const monthDiff = now.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) age -= 1
  return age
}

function isSameDay(a: string, b?: string) {
  if (!b) return false
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export default function VeliPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const { session, role, okul: authOkul, loading, hasValidSession, signOut } = useAuth()
  const [slug, setSlug] = useState('')
  const [activeTab, setActiveTab] = useState<ParentTab>('bugun')
  const [children, setChildren] = useState<ChildDetails[]>([])
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState('')
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [fees, setFees] = useState<Aidat[]>([])
  const [messages, setMessages] = useState<NormalizedMessage[]>([])
  const [messageDraft, setMessageDraft] = useState('')
  const [messageState, setMessageState] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [feeFilter, setFeeFilter] = useState<'hepsi' | 'bekleyen' | 'odendi'>('hepsi')
  const [authTimeout, setAuthTimeout] = useState(false)
  const dark = resolvedTheme === 'dark'
  // Prevents re-fetching children list when auth fires TOKEN_REFRESHED for the same user/school
  const childrenLoadedRef = useRef<string | null>(null)
  // Tracks whether we have data for the selected child (prevents full loading on child switch)
  const hasData = activities.length > 0 || announcements.length > 0 || fees.length > 0

  useEffect(() => {
    void params.then((value) => setSlug(value.slug))
  }, [params])

  const okul = authOkul as Okul | null

  useEffect(() => {
    if ((loading && !hasValidSession) || !slug) return

    if (!session || !authOkul) {
      if (hasValidSession) return
      // Reset loadedRef so the next login (same account) triggers a fresh data load.
      childrenLoadedRef.current = null
      router.replace(`/giris?redirect=${encodeURIComponent(`/${slug}/veli`)}`)
      return
    }

    const expectedPath = rolePath(role)
    if (role !== 'veli') {
      router.replace(`/${authOkul.slug}/${expectedPath ?? 'admin'}`)
      return
    }

    if (authOkul.slug !== slug) {
      router.replace(`/${authOkul.slug}/veli`)
    }
  }, [authOkul, hasValidSession, loading, role, router, session, slug])

  useEffect(() => {
    if (!loading || hasValidSession) {
      if (!authTimeout) return
      const resetTimeout = window.setTimeout(() => setAuthTimeout(false), 0)
      return () => window.clearTimeout(resetTimeout)
    }
    const timeout = window.setTimeout(() => setAuthTimeout(true), 10000)
    return () => window.clearTimeout(timeout)
  }, [authTimeout, hasValidSession, loading])

  useEffect(() => {
    if (!authTimeout || session || hasValidSession) return
    router.replace(`/giris?redirect=${encodeURIComponent(`/${slug}/veli`)}`)
  }, [authTimeout, hasValidSession, router, session, slug])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session && okul) {
        setPageLoading(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session, okul])

  useEffect(() => {
    if (!okul || !session) return

    // Guard: skip children re-fetch for the same school+user
    const loadKey = `${okul.id}-${session.user.id}`
    if (childrenLoadedRef.current === loadKey) {
      // Effect re-ran but data is already loaded — ensure loading is cleared.
      setPageLoading(false)
      return
    }
    childrenLoadedRef.current = loadKey

    let alive = true
    const currentOkul = okul
    const currentSession = session

    async function loadChildren() {
      setPageLoading(true)
      try {
        const { data, error } = await loadParentChildren(currentSession.user.id, currentOkul.id)

        if (!alive) return

        if (error) {
          setMessageState(getSupabaseErrorMessage(error, 'Çocuk bilgileri yüklenemedi.'))
        }

        const childIds = data.map((item) => item.id)
        let detailedChildren = data as ChildDetails[]

        if (childIds.length) {
          const { data: detailRows } = await supabase
            .from('ogrenciler')
            .select('*')
            .in('id', childIds)
          detailedChildren = (detailRows || []) as ChildDetails[]
        }

        setChildren(detailedChildren)
        setSelectedChildId((current) => current ?? detailedChildren[0]?.id ?? null)
      } catch (error) {
        if (!alive) return
        setMessageState(getSupabaseErrorMessage(error as { message?: string }, 'Çocuk bilgileri yüklenemedi.'))
      } finally {
        // Always clear loading — even if effect re-ran (alive=false) we must not stay stuck.
        setPageLoading(false)
      }
    }

    void loadChildren()

    return () => {
      alive = false
    }
  }, [okul, session])

  useEffect(() => {
    if (!okul || !selectedChildId) return

    let alive = true
    const currentOkul = okul
    const currentChildId = selectedChildId
    // Only show full-page loading on first load; keep old data visible when switching children
    const isFirstLoad = !hasData

    async function loadData() {
      if (isFirstLoad) setPageLoading(true)
      try {
        const [activityQuery, attendanceQuery, announcementQuery, feeQuery, messageQuery] = await Promise.all([
          supabase
            .from('aktiviteler')
            .select('id,tur,detay,kaydeden,created_at,olusturuldu')
            .eq('okul_id', currentOkul.id)
            .eq('ogrenci_id', currentChildId)
            .eq('tarih', today())
            .eq('veli_gosterilsin', true)
            .order('id', { ascending: false })
            .limit(60),
          supabase
            .from('yoklama')
            .select('durum')
            .eq('okul_id', currentOkul.id)
            .eq('ogrenci_id', currentChildId)
            .eq('tarih', today())
            .maybeSingle(),
          loadAnnouncementsCompat(currentOkul.id, 30),
          supabase
            .from('aidatlar')
            .select('id,okul_id,ogrenci_id,donem,ay,tutar,odendi,son_odeme,odeme_tarihi')
            .eq('okul_id', currentOkul.id)
            .eq('ogrenci_id', currentChildId)
            .order('son_odeme', { ascending: true }),
          loadStudentMessagesCompat(currentOkul.id, currentChildId, 200),
        ])

        if (!alive) return

        setActivities((activityQuery.data || []) as ActivityRow[])
        setAttendanceStatus(attendanceQuery.data?.durum || '')
        setAnnouncements(announcementQuery.data || [])
        setFees((feeQuery.data || []) as Aidat[])
        setMessages(messageQuery.data || [])
      } catch (error) {
        if (!alive) return
      setMessageState(getUserFacingErrorMessage(error as { message?: string }, 'Çocuk verileri yüklenemedi.'))
      } finally {
        // Always clear loading when this was a first-load — even if effect re-ran (alive=false).
        if (isFirstLoad) setPageLoading(false)
      }
    }

    void loadData()

    const channel = supabase
      .channel(`veli-web-${currentOkul.id}-${currentChildId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesajlar', filter: `okul_id=eq.${currentOkul.id}` }, async () => {
        const result = await loadStudentMessagesCompat(currentOkul.id, currentChildId, 200)
        setMessages(result.data || [])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aktiviteler', filter: `okul_id=eq.${currentOkul.id}` }, async () => {
        const { data } = await supabase
          .from('aktiviteler')
          .select('id,tur,detay,kaydeden,created_at,olusturuldu')
          .eq('okul_id', currentOkul.id)
          .eq('ogrenci_id', currentChildId)
          .eq('tarih', today())
          .eq('veli_gosterilsin', true)
          .order('id', { ascending: false })
          .limit(60)
        setActivities((data || []) as ActivityRow[])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yoklama', filter: `okul_id=eq.${currentOkul.id}` }, async () => {
        const { data } = await supabase
          .from('yoklama')
          .select('durum')
          .eq('okul_id', currentOkul.id)
          .eq('ogrenci_id', currentChildId)
          .eq('tarih', today())
          .maybeSingle()
        setAttendanceStatus(data?.durum || '')
      })
      .subscribe()

    return () => {
      alive = false
      void supabase.removeChannel(channel)
    }
  }, [okul, selectedChildId])

  useEffect(() => {
    if (!okul || !selectedChildId) return
    void markMessagesReadCompat(okul.id, selectedChildId)
  }, [okul, selectedChildId])

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) || null,
    [children, selectedChildId]
  )

  const filteredFees = useMemo(() => {
    if (feeFilter === 'bekleyen') return fees.filter((item) => !item.odendi)
    if (feeFilter === 'odendi') return fees.filter((item) => item.odendi)
    return fees
  }, [feeFilter, fees])

  const totalPending = useMemo(
    () => fees.filter((item) => !item.odendi).reduce((sum, item) => sum + Number(item.tutar || 0), 0),
    [fees]
  )

  async function sendMessage() {
    if (!session || !okul || !selectedChild || !messageDraft.trim()) return

    setSending(true)
    setMessageState('')
    const { data: parties, error: partyError } = await resolveParentMessageParties(session.user.id, okul.id, selectedChild.id)

    if (partyError || !parties) {
      setSending(false)
      setMessageState(getUserFacingErrorMessage(partyError, 'Öğretmen eşleşmesi bulunamadı.'))
      return
    }

    const { error } = await insertMessageCompat({
      okul_id: okul.id,
      ogrenci_id: selectedChild.id,
      gonderen_id: parties.senderId,
      gonderen_rol: 'veli',
      gonderen_ad: 'Veli',
      alici_id: parties.receiverId,
      alici_tip: 'ogretmen',
      okundu: false,
      created_at: new Date().toISOString(),
    }, messageDraft.trim())

    setSending(false)

    if (error) {
      setMessageState(getUserFacingErrorMessage(error, 'Mesaj gönderilemedi.'))
      return
    }

    setMessageDraft('')
    setMessageState('Mesaj öğretmene iletildi.')
  }

  if ((loading && !hasValidSession) || pageLoading || !session || !okul) {
    if (authTimeout && !hasValidSession) return <LoadingScreen message="Oturum doğrulanamadı, giriş ekranına yönlendiriliyor..." />
    return <ParentPanelSkeleton dark={dark} />
  }

  const childAge = ageFromBirthDate(selectedChild?.dogum_tarihi)

  return (
    <main className={`${serif.variable} ${sans.variable} ${dark ? 'panel-skin-dark' : ''} min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]`}>
      <style>{`
        .panel-input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 0.85rem 1rem;
          background: #fff;
          color: #0f172a;
          outline: none;
        }
        .panel-skin-dark {
          --bg: #090b10;
          --card: #111317;
          --border-subtle: #252a33;
          --text: #f3f4f6;
          --muted-text: #9ca3af;
        }
        .panel-skin-dark .panel-input {
          background: #1a1d23;
          border-color: #343a45;
          color: #f3f4f6;
        }
        .panel-skin-dark .text-slate-900 { color: #f3f4f6 !important; }
        .panel-skin-dark .text-slate-700 { color: #e2e8f0 !important; }
        .panel-skin-dark .text-slate-600 { color: #d1d5db !important; }
        .panel-skin-dark .text-slate-500 { color: #9ca3af !important; }
        .panel-skin-dark .text-slate-400 { color: #94a3b8 !important; }
        .panel-skin-dark .bg-slate-50 { background: #111317 !important; }
        .panel-skin-dark .bg-white { background: #111317 !important; }
        .panel-skin-dark .border-slate-200 { border-color: #252a33 !important; }
        .panel-skin-dark .ring-slate-200 { --tw-ring-color: #252a33 !important; }
        .panel-skin-dark .hover\\:bg-slate-100:hover { background: #1a1d23 !important; }
      `}</style>

      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-[var(--border-subtle)] bg-[var(--card)] shadow-sm lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:flex-none lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col px-5 py-6">
            <div className="flex items-center gap-3">
              {okul.logo_url ? (
                <img src={okul.logo_url} alt={okul.ad} className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f59e0b] text-lg font-bold text-white">
                  {initials(okul.ad)}
                </div>
              )}
              <div>
                <div className="text-base font-semibold text-slate-900">{okul.ad}</div>
                <div className="text-sm text-slate-500">Veli Paneli</div>
              </div>
            </div>

            {children.length > 1 && (
              <div className="mt-8">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Çocuk seç</div>
                <div className="mt-3 space-y-2">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChildId(child.id)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition',
                        selectedChildId === child.id ? 'bg-amber-50 text-[#f59e0b]' : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <div className={cx('flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold', selectedChildId === child.id ? 'bg-[#f59e0b] text-white' : 'bg-amber-100 text-amber-700')}>
                        {initials(child.ad_soyad)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{child.ad_soyad}</div>
                        <div className="text-xs text-slate-500">{child.sinif || 'Sınıf bilgisi'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <nav className="mt-8 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition',
                    activeTab === tab.id ? 'bg-amber-50 text-[#f59e0b]' : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">{selectedChild?.ad_soyad || 'Veli hesabı'}</div>
              <div className="mt-1 text-xs text-slate-500">{selectedChild?.sinif || 'Çocuk bilgisi'}</div>
              <div className="mt-4 flex gap-2">
                <Link href="/giris" className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-600">
                  Giriş
                </Link>
                <button
                  onClick={async () => {
                    await signOut()
                    window.location.href = '/giris'
                  }}
                  className="flex-1 rounded-2xl bg-[#f59e0b] px-4 py-3 text-sm font-semibold text-white"
                >
                  Çıkış
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 px-4 py-5 lg:px-8 lg:py-7">
          <header className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f59e0b]">{tabs.find((tab) => tab.id === activeTab)?.label}</div>
                <h1 className="mt-2 text-[clamp(2rem,4vw,3.8rem)] leading-[0.95] tracking-[-0.05em] text-slate-900 [font-family:var(--font-serif)]">
                  Günlük akışı webden takip edin.
                </h1>
                <p className="mt-3 text-sm leading-7 text-slate-500">{selectedChild?.ad_soyad || 'Çocuk seçin'} · {selectedChild?.sinif || 'Sınıf bilgisi'}</p>
              </div>
              <ThemeToggle />
            </div>
          </header>

          {messageState && (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {messageState}
            </div>
          )}

          {activeTab === 'bugun' && (
            <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <PanelCard className="bg-[linear-gradient(135deg,#fff7ed,white)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedChild?.ad_soyad || 'Çocuk seçin'}</h2>
                    <p className="mt-1 text-sm text-slate-500">{selectedChild?.sinif || 'Sınıf bilgisi'}</p>
                  </div>
                  <span className={cx(
                    'rounded-full px-4 py-2 text-sm font-semibold',
                    attendanceStatus === 'geldi' ? 'bg-emerald-50 text-emerald-700' :
                      attendanceStatus === 'gelmedi' ? 'bg-rose-50 text-rose-700' :
                        attendanceStatus === 'izinli' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                  )}>
                    {attendanceStatus === 'geldi' ? '✅ Geldi' : attendanceStatus === 'gelmedi' ? '❌ Gelmedi' : attendanceStatus === 'izinli' ? '🏖️ İzinli' : '⏳ Bekleniyor'}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <MetricCard label="Aktivite" value={String(activities.length)} />
                  <MetricCard label="Bekleyen aidat" value={String(fees.filter((item) => !item.odendi).length)} />
                  <MetricCard label="Toplam borç" value={formatCurrency(totalPending)} />
                </div>
              </PanelCard>

              <PanelCard>
                <h2 className="text-lg font-semibold text-slate-900">Aktivite feed</h2>
                <p className="mt-1 text-sm text-slate-500">Supabase realtime ile anlık güncellenir.</p>
                <div className="mt-6 space-y-3">
                  {activities.length ? activities.map((activity) => {
                    const meta = activityTypes[activity.tur] || { emoji: '📋', label: activity.tur, color: '#64748b' }
                    return (
                      <div key={activity.id} className="flex items-start gap-4 rounded-[22px] border border-slate-200 px-4 py-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl text-white" style={{ backgroundColor: meta.color }}>
                          {meta.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-900">{meta.label}</div>
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{formatDateTime(activity.created_at || activity.olusturuldu)}</div>
                          </div>
                          <div className="mt-2 text-sm text-slate-600">{activitySummary(activity)}</div>
                        </div>
                      </div>
                    )
                  }) : (
                    <EmptyState title="Henüz aktivite yok" description="Öğretmen kayıt eklediğinde burada görünür." />
                  )}
                </div>
              </PanelCard>
            </section>
          )}

          {activeTab === 'mesajlar' && (
            <section className="mt-6">
              <PanelCard>
                <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
                  <div className="rounded-[24px] border border-slate-200">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <div className="text-lg font-semibold text-slate-900">Öğretmen ile sohbet</div>
                      <div className="mt-1 text-sm text-slate-500">{selectedChild?.ad_soyad || 'Çocuk seçin'}</div>
                    </div>
                    <div className="max-h-[520px] space-y-3 overflow-y-auto px-5 py-5">
                      {messages.map((message, index) => {
                        const isMine = message.gonderen_rol.includes('veli')
                        const showDate = index === 0 || !isSameDay(message.created_at, messages[index - 1]?.created_at)
                        return (
                          <div key={message.id}>
                            {showDate && (
                              <div className="my-4 flex items-center gap-3">
                                <div className="h-px flex-1 bg-slate-200" />
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                  {new Date(message.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                                </div>
                                <div className="h-px flex-1 bg-slate-200" />
                              </div>
                            )}
                            <div className={cx('flex', isMine ? 'justify-end' : 'justify-start')}>
                              <div className={cx(
                                'max-w-[75%] rounded-[22px] px-4 py-3 text-sm shadow-sm',
                                isMine ? 'bg-[#f59e0b] text-white' : 'bg-slate-100 text-slate-700'
                              )}>
                                <div>{message.content}</div>
                                <div className={cx('mt-2 text-[11px]', isMine ? 'text-amber-100' : 'text-slate-400')}>{formatDateTime(message.created_at)}</div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <h2 className="text-lg font-semibold text-slate-900">Mesaj gönder</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Öğretmenin yanıtı aynı ekranda anlık olarak görünecek.</p>
                    <textarea className="panel-input mt-4 min-h-[220px] resize-none bg-white" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Mesaj yazın..." />
                    <button onClick={sendMessage} disabled={sending || !selectedChild} className="mt-4 w-full rounded-2xl bg-[#f59e0b] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                      {sending ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                  </div>
                </div>
              </PanelCard>
            </section>
          )}

          {activeTab === 'duyurular' && (
            <section className="mt-6">
              <PanelCard>
                <h2 className="text-lg font-semibold text-slate-900">Duyuru listesi</h2>
                <div className="mt-6 space-y-3">
                  {announcements.length ? announcements.map((announcement) => (
                    <div key={announcement.id} className="rounded-[22px] border border-slate-200 px-4 py-4">
                      <div className="text-base font-semibold text-slate-900">{announcement.baslik}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{formatDateTime(announcement.created_at)}</div>
                      <div className="mt-3 text-sm leading-7 text-slate-600">{announcement.icerik}</div>
                    </div>
                  )) : (
                    <EmptyState title="Henüz duyuru yok" description="Okul yeni duyuru paylaştığında burada görünecek." />
                  )}
                </div>
              </PanelCard>
            </section>
          )}

          {activeTab === 'aidatlar' && (
            <section className="mt-6 space-y-6">
              <PanelCard className="bg-[linear-gradient(135deg,#fff7ed,white)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Toplam bekleyen tutar</h2>
                    <div className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[#f59e0b]">{formatCurrency(totalPending)}</div>
                  </div>
                  <div className="flex gap-2">
                    <FilterChip active={feeFilter === 'hepsi'} onClick={() => setFeeFilter('hepsi')}>Hepsi</FilterChip>
                    <FilterChip active={feeFilter === 'bekleyen'} onClick={() => setFeeFilter('bekleyen')}>Bekleyen</FilterChip>
                    <FilterChip active={feeFilter === 'odendi'} onClick={() => setFeeFilter('odendi')}>Ödendi</FilterChip>
                  </div>
                </div>
              </PanelCard>

              <PanelCard>
                <div className="space-y-3">
                  {filteredFees.length ? filteredFees.map((fee) => (
                    <div key={fee.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-slate-200 px-4 py-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{fee.donem || fee.ay}</div>
                        <div className="mt-1 text-xs text-slate-500">Son ödeme: {formatDateLabel(fee.son_odeme || fee.odeme_tarihi)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-semibold text-slate-900">{formatCurrency(Number(fee.tutar || 0))}</div>
                        <span className={cx(
                          'mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                          fee.odendi ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        )}>
                          {fee.odendi ? 'Ödendi' : 'Bekleyen'}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <EmptyState title="Kayıt bulunamadı" description="Bu filtreye uygun aidat kaydı yok." />
                  )}
                </div>
              </PanelCard>
            </section>
          )}

          {activeTab === 'cocugum' && (
            <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <PanelCard>
                <h2 className="text-lg font-semibold text-slate-900">Çocuk bilgileri</h2>
                <div className="mt-6 space-y-3">
                  <InfoRow label="Ad soyad" value={selectedChild?.ad_soyad} />
                  <InfoRow label="Sınıf" value={selectedChild?.sinif} />
                  <InfoRow label="Yaş" value={childAge !== null ? `${childAge} yaş` : null} />
                  <InfoRow label="Doğum tarihi" value={formatDateLabel(selectedChild?.dogum_tarihi)} />
                  <InfoRow label="Alerji / özel durum" value={selectedChild?.alerji || selectedChild?.alerjiler || selectedChild?.notlar} />
                </div>
              </PanelCard>

              <PanelCard>
                <h2 className="text-lg font-semibold text-slate-900">Bugünkü özet</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <SummaryCard title="Bugünkü aktivite" value={`${activities.length} kayıt`} />
                  <SummaryCard title="Yoklama" value={attendanceStatus || 'Bekleniyor'} />
                  <SummaryCard title="Bekleyen aidat" value={`${fees.filter((item) => !item.odendi).length} kalem`} />
                  <SummaryCard title="Son güncelleme" value={activities[0] ? formatDateTime(activities[0].created_at || activities[0].olusturuldu) : 'Bugün'} />
                </div>
              </PanelCard>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}

function PanelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={cx('rounded-[24px] border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-sm', className)}>{children}</section>
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--card)] px-4 py-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-900">{value}</div>
    </div>
  )
}

function FilterChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cx('rounded-full px-4 py-2 text-sm font-semibold transition', active ? 'bg-[#f59e0b] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
      {children}
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-[20px] border border-[var(--border-subtle)] px-4 py-4">
      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value || 'Bilgi girilmedi'}</div>
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border-subtle)] bg-slate-50 px-4 py-4 dark:bg-slate-800/60">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm text-slate-500">{description}</div>
    </div>
  )
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--muted-text)]">
      {message}
    </div>
  )
}

function ParentPanelSkeleton({ dark }: { dark: boolean }) {
  const skBase = dark ? 'bg-[#1a1d23]' : 'bg-slate-200'
  const cardBase = dark ? 'bg-[#111317] border-[#252a33]' : 'bg-white border-slate-200'
  return (
    <div className={`flex min-h-screen flex-col lg:flex-row ${dark ? 'bg-[#090b10]' : 'bg-slate-50'}`}>
      <aside className={`w-full border-b lg:w-[260px] lg:border-b-0 lg:border-r ${dark ? 'bg-[#111317] border-[#252a33]' : 'bg-white border-slate-200'} px-5 py-6`}>
        <div className="flex items-center gap-3">
          <div className={`h-14 w-14 rounded-2xl animate-pulse ${skBase}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-3 w-28 rounded animate-pulse ${skBase}`} />
            <div className={`h-2 w-20 rounded animate-pulse ${skBase}`} />
          </div>
        </div>
        <div className="mt-8 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`h-11 rounded-2xl animate-pulse ${skBase}`} style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </aside>
      <div className="flex-1 px-4 py-5 lg:px-8 lg:py-7 space-y-6">
        <div className={`rounded-[24px] border p-5 animate-pulse ${cardBase}`}>
          <div className={`h-3 w-24 rounded ${skBase}`} />
          <div className={`mt-3 h-12 w-3/4 rounded-xl ${skBase}`} />
          <div className={`mt-3 h-3 w-40 rounded ${skBase}`} />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className={`rounded-[24px] border p-5 animate-pulse h-56 ${cardBase}`} />
          <div className={`rounded-[24px] border p-5 animate-pulse h-56 ${cardBase}`} />
        </div>
        <div className={`rounded-[24px] border p-5 animate-pulse h-40 ${cardBase}`} />
      </div>
    </div>
  )
}
