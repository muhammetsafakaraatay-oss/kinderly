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
  loadStudentMessagesCompat,
  markMessagesReadCompat,
  normalizeAnnouncement,
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
  detay?: Record<string, string | number | boolean | null> | null
  kaydeden?: string | null
  created_at?: string | null
}

const tabs: Array<{ id: ParentTab; label: string }> = [
  { id: 'bugun', label: 'Bugün' },
  { id: 'mesajlar', label: 'Mesajlar' },
  { id: 'duyurular', label: 'Duyurular' },
  { id: 'aidatlar', label: 'Aidatlar' },
  { id: 'cocugum', label: 'Çocuğum' },
]

const activityLabels: Record<string, string> = {
  food: 'Yemek',
  nap: 'Uyku',
  potty: 'Tuvalet',
  photo: 'Fotoğraf',
  kudos: 'Tebrik',
  meds: 'İlaç',
  incident: 'Kaza',
  health: 'Sağlık',
  note: 'Not',
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
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

function getActivitySummary(row: ActivityRow) {
  const detay = row.detay || {}
  const firstValue = ['not', 'aciklama', 'durum', 'ogun', 'miktar', 'ilac']
    .map((key) => detay[key])
    .find(Boolean)
  return firstValue ? String(firstValue) : 'Yeni bilgi eklendi.'
}

export default function VeliPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { session, role, okul: authOkul, loading, signOut } = useAuth()
  const [slug, setSlug] = useState('')
  const [activeTab, setActiveTab] = useState<ParentTab>('bugun')
  const [children, setChildren] = useState<Ogrenci[]>([])
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState('')
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [aidatlar, setAidatlar] = useState<Aidat[]>([])
  const [messages, setMessages] = useState<NormalizedMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [messageState, setMessageState] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    void params.then((value) => setSlug(value.slug))
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
    }
  }, [authOkul, loading, role, router, session, slug])

  useEffect(() => {
    if (!okul || !session) return

    let alive = true
    const currentSession = session
    const currentOkul = okul

    async function bootstrap() {
      setPageLoading(true)
      const { data, error } = await loadParentChildren(currentSession.user.id, currentOkul.id)

      if (!alive) return

      if (error) {
        setMessageState(getSupabaseErrorMessage(error, 'Öğrenci bilgileri yüklenemedi.'))
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

    void bootstrap()

    return () => {
      alive = false
    }
  }, [okul, session])

  useEffect(() => {
    if (!okul || !selectedChildId) return

    let alive = true
    const currentOkul = okul
    const currentChildId = selectedChildId

    async function loadDashboard() {
      setPageLoading(true)

      const [activityQuery, yoklamaQuery, announcementQuery, feeQuery, messageQuery] = await Promise.all([
        supabase
          .from('aktiviteler')
          .select('id,tur,detay,kaydeden,created_at')
          .eq('okul_id', currentOkul.id)
          .eq('ogrenci_id', currentChildId)
          .eq('tarih', today())
          .eq('veli_gosterilsin', true)
          .order('id', { ascending: false })
          .limit(20),
        supabase
          .from('yoklama')
          .select('durum')
          .eq('okul_id', currentOkul.id)
          .eq('ogrenci_id', currentChildId)
          .eq('tarih', today())
          .maybeSingle(),
        loadAnnouncementsCompat(currentOkul.id, 20),
        supabase
          .from('aidatlar')
          .select('*')
          .eq('okul_id', currentOkul.id)
          .eq('ogrenci_id', currentChildId)
          .order('id', { ascending: false })
          .limit(12),
        loadStudentMessagesCompat(currentOkul.id, currentChildId, 200),
      ])

      if (!alive) return

      setActivities((activityQuery.data || []) as ActivityRow[])
      setAttendanceStatus(yoklamaQuery.data?.durum || '')
      setAnnouncements(announcementQuery.data || [])
      setAidatlar((feeQuery.data || []) as Aidat[])
      setMessages(messageQuery.data || [])
      setPageLoading(false)
    }

    void loadDashboard()

    const channel = supabase
      .channel(`veli-panel-${currentOkul.id}-${currentChildId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesajlar', filter: `okul_id=eq.${currentOkul.id}` }, () => {
        void loadStudentMessagesCompat(currentOkul.id, currentChildId, 200).then((result) => setMessages(result.data || []))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aktiviteler', filter: `okul_id=eq.${currentOkul.id}` }, () => {
        void supabase
          .from('aktiviteler')
          .select('id,tur,detay,kaydeden,created_at')
          .eq('okul_id', currentOkul.id)
          .eq('ogrenci_id', currentChildId)
          .eq('tarih', today())
          .eq('veli_gosterilsin', true)
          .order('id', { ascending: false })
          .limit(20)
          .then(({ data }) => setActivities((data || []) as ActivityRow[]))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yoklama', filter: `okul_id=eq.${currentOkul.id}` }, () => {
        void supabase
          .from('yoklama')
          .select('durum')
          .eq('okul_id', currentOkul.id)
          .eq('ogrenci_id', currentChildId)
          .eq('tarih', today())
          .maybeSingle()
          .then(({ data }) => setAttendanceStatus(data?.durum || ''))
      })
      .subscribe()

    return () => {
      alive = false
      void supabase.removeChannel(channel)
    }
  }, [okul, selectedChildId])

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) || null,
    [children, selectedChildId]
  )

  const paidFees = useMemo(
    () => aidatlar.filter((item) => item.odendi),
    [aidatlar]
  )

  const unpaidFees = useMemo(
    () => aidatlar.filter((item) => !item.odendi),
    [aidatlar]
  )

  const totalDebt = useMemo(
    () => unpaidFees.reduce((sum, item) => sum + Number(item.tutar || 0), 0),
    [unpaidFees]
  )

  useEffect(() => {
    if (!okul || !selectedChildId || !session) return
    void markMessagesReadCompat(okul.id, selectedChildId)
  }, [okul, selectedChildId, session])

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

    setSending(false)

    if (error) {
      setMessageState(getSupabaseErrorMessage(error, 'Mesaj gönderilemedi.'))
      return
    }

    setMessageText('')
    setMessageState('Mesaj öğretmene iletildi.')
    const result = await loadStudentMessagesCompat(okul.id, selectedChild.id, 200)
    setMessages(result.data || [])
  }

  if (loading || pageLoading || !session || !okul) {
    return <LoadingScreen />
  }

  return (
    <main className={`${serif.variable} ${sans.variable} min-h-screen bg-[#f8fafc] font-sans text-[#0f172a]`}>
      <style>{`
        .input-base {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0.9rem 1rem;
          font-size: 0.95rem;
          color: #0f172a;
          outline: none;
        }
      `}</style>
      <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
        <header className="rounded-[32px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f59e0b]">Veli paneli</div>
              <h1 className="mt-3 text-[clamp(2.4rem,5vw,4.4rem)] font-semibold leading-[0.92] tracking-[-0.05em] [font-family:var(--font-serif)]">
                Günlük akışı sakin ve net takip edin.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                Yoklama, öğretmen mesajları, duyurular, aidatlar ve çocuk özetiniz tek görünümde.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/giris" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#f59e0b] hover:text-[#f59e0b]">
                Giriş sayfası
              </Link>
              <button
                onClick={async () => {
                  await signOut()
                  router.replace('/giris')
                }}
                className="rounded-full bg-[#f59e0b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d97706]"
              >
                Çıkış yap
              </button>
            </div>
          </div>

          {children.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={cx(
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    selectedChildId === child.id ? 'bg-[#f59e0b] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {child.ad_soyad}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cx(
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  activeTab === tab.id ? 'bg-[#f59e0b] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {messageState && (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {messageState}
          </div>
        )}

        {activeTab === 'bugun' && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <PanelCard className="bg-[linear-gradient(135deg,#fff7ed,white)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Bugünkü yoklama durumu</div>
                  <div className="mt-3 inline-flex rounded-full bg-white px-5 py-3 text-2xl font-semibold text-slate-900 shadow-sm">
                    {attendanceStatus || 'Henüz işlenmedi'}
                  </div>
                </div>
                <div className="rounded-[24px] border border-amber-100 bg-white px-5 py-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Seçili çocuk</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">{selectedChild?.ad_soyad || 'Öğrenci seçin'}</div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <StatCard label="Bugünkü aktivite" value={String(activities.length)} />
                <StatCard label="Bekleyen aidat" value={String(unpaidFees.length)} />
                <StatCard label="Toplam borç" value={formatCurrency(totalDebt)} />
              </div>
            </PanelCard>

            <PanelCard>
              <h2 className="text-lg font-semibold text-slate-900">Canlı günlük akış</h2>
              <p className="mt-1 text-sm text-slate-500">Öğretmen yeni aktivite ekledikçe bu alan güncellenir.</p>
              <div className="mt-6 space-y-3">
                {activities.length ? activities.map((activity) => (
                  <div key={activity.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{activityLabels[activity.tur] || activity.tur}</div>
                        <div className="mt-1 text-sm text-slate-600">{getActivitySummary(activity)}</div>
                      </div>
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{formatDateTime(activity.created_at)}</div>
                    </div>
                  </div>
                )) : (
                  <EmptyState title="Henüz aktivite yok" description="Gün içinde paylaşılan kayıtlar burada listelenecek." />
                )}
              </div>
            </PanelCard>
          </section>
        )}

        {activeTab === 'mesajlar' && (
          <section className="mt-6">
            <PanelCard>
              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="rounded-[24px] border border-slate-200">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <div className="font-semibold text-slate-900">Öğretmen ile yazışma</div>
                    <div className="text-sm text-slate-500">{selectedChild?.ad_soyad || 'Öğrenci seçin'}</div>
                  </div>

                  <div className="max-h-[460px] space-y-3 overflow-y-auto px-5 py-5">
                    {messages.length ? messages.map((message) => (
                      <div key={message.id} className={cx('flex', message.gonderen_rol.includes('veli') ? 'justify-end' : 'justify-start')}>
                        <div className={cx(
                          'max-w-[75%] rounded-[22px] px-4 py-3 text-sm shadow-sm',
                          message.gonderen_rol.includes('veli')
                            ? 'bg-[#f59e0b] text-white'
                            : 'bg-slate-100 text-slate-700'
                        )}>
                          <div>{message.content}</div>
                          <div className={cx('mt-2 text-[11px]', message.gonderen_rol.includes('veli') ? 'text-amber-100' : 'text-slate-400')}>
                            {formatDateTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <EmptyState title="Henüz mesaj yok" description="İlk mesajı göndererek yazışmayı başlatabilirsiniz." />
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-lg font-semibold text-slate-900">Mesaj gönder</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Realtime bağlantısı açık; öğretmenin yanıtı bu ekranda anlık görünür.
                  </p>
                  <textarea
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    className="input-base mt-4 min-h-[180px] resize-none bg-white"
                    placeholder="Öğretmene mesajınız..."
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !selectedChild}
                    className="mt-4 w-full rounded-2xl bg-[#f59e0b] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {sending ? 'Gönderiliyor...' : 'Mesajı gönder'}
                  </button>
                </div>
              </div>
            </PanelCard>
          </section>
        )}

        {activeTab === 'duyurular' && (
          <section className="mt-6">
            <PanelCard>
              <h2 className="text-lg font-semibold text-slate-900">Okul duyuruları</h2>
              <div className="mt-6 space-y-3">
                {announcements.length ? announcements.map((announcement) => (
                  <div key={announcement.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <div className="font-semibold text-slate-900">{announcement.baslik}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">{announcement.icerik}</div>
                    <div className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-400">{formatDateTime(announcement.created_at)}</div>
                  </div>
                )) : (
                  <EmptyState title="Duyuru bulunamadı" description="Yeni okul duyuruları burada listelenir." />
                )}
              </div>
            </PanelCard>
          </section>
        )}

        {activeTab === 'aidatlar' && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <PanelCard className="bg-[linear-gradient(135deg,#fff7ed,white)]">
              <h2 className="text-lg font-semibold text-slate-900">Borç özeti</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <StatCard label="Bekleyen" value={String(unpaidFees.length)} />
                <StatCard label="Ödenen" value={String(paidFees.length)} />
                <StatCard label="Toplam borç" value={formatCurrency(totalDebt)} />
              </div>
            </PanelCard>

            <PanelCard>
              <h2 className="text-lg font-semibold text-slate-900">Aidat hareketleri</h2>
              <div className="mt-6 space-y-3">
                {aidatlar.length ? aidatlar.map((aidat) => (
                  <div key={aidat.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4">
                    <div>
                      <div className="font-semibold text-slate-900">{aidat.ay}</div>
                      <div className="text-sm text-slate-500">{aidat.odendi ? 'Ödendi' : 'Bekliyor'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">{formatCurrency(Number(aidat.tutar || 0))}</div>
                      <div className={cx('text-xs font-semibold uppercase tracking-[0.14em]', aidat.odendi ? 'text-emerald-600' : 'text-amber-600')}>
                        {aidat.odendi ? 'Ödenen' : 'Bekleyen'}
                      </div>
                    </div>
                  </div>
                )) : (
                  <EmptyState title="Aidat kaydı yok" description="Okul aidat girişi yaptığında burada görüntülenir." />
                )}
              </div>
            </PanelCard>
          </section>
        )}

        {activeTab === 'cocugum' && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <PanelCard>
              <h2 className="text-lg font-semibold text-slate-900">Çocuğum</h2>
              <div className="mt-6 space-y-4">
                <InfoRow label="Ad soyad" value={selectedChild?.ad_soyad} />
                <InfoRow label="Sınıf" value={selectedChild?.sinif} />
                <InfoRow label="Doğum tarihi" value={selectedChild?.dogum_tarihi} />
                <InfoRow label="Alerji" value={selectedChild?.alerjiler} />
                <InfoRow label="Veli adı" value={selectedChild?.veli_ad} />
              </div>
            </PanelCard>

            <PanelCard>
              <h2 className="text-lg font-semibold text-slate-900">Bugünkü özet</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <SummaryCard title="Yoklama" value={attendanceStatus || 'Henüz işlenmedi'} />
                <SummaryCard title="Aktivite" value={`${activities.length} kayıt`} />
                <SummaryCard title="Bekleyen aidat" value={`${unpaidFees.length} kalem`} />
                <SummaryCard title="Son güncelleme" value={activities[0]?.created_at ? formatDateTime(activities[0].created_at) : 'Bugün'} />
              </div>
            </PanelCard>
          </section>
        )}
      </div>
    </main>
  )
}

function PanelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={cx('rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm', className)}>{children}</section>
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900">{value}</div>
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-2 text-base font-medium text-slate-900">{value || 'Bilgi girilmedi'}</div>
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

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-500">
      Panel hazırlanıyor...
    </div>
  )
}
