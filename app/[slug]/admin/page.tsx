'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard,
  Users,
  School,
  ClipboardCheck,
  Sparkles,
  FileText,
  LineChart,
  Image as ImageIcon,
  Wallet,
  UtensilsCrossed,
  UserCog,
  Bus,
  MessagesSquare,
  Megaphone,
  CalendarDays,
  Settings,
} from 'lucide-react'
import { SiniflarPanel } from '@/components/admin/siniflar-panel'
import { supabase } from '@/lib/supabase'
import { getPhotoStoragePath, withSignedPhotoUrls } from '@/lib/supabase-helpers'
import { useAuth } from '@/lib/auth'
import { rolePath } from '@/lib/auth-helpers'
import { Ogrenci, Sinif, Okul } from '@/lib/types'

export default function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { session, role, okul: authOkul, loading, hasValidSession, signOut } = useAuth()
  const [slug, setSlug] = useState('')
  const [okul, setOkul] = useState<Okul | null>(null)
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [siniflar, setSiniflar] = useState<Sinif[]>([])
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authTimeout, setAuthTimeout] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const dark = true
  // Prevents re-loading when auth fires TOKEN_REFRESHED for the same user/school
  const loadedRef = useRef<string | null>(null)
  const activeOkul = okul ?? (authOkul as Okul | null)

  async function loadAll(okulId: number) {
    const [{ data: ogr }, { data: sinif }, { data: okulData }] = await Promise.all([
      supabase
        .from('ogrenciler')
        .select('id,ad_soyad,sinif,okul_id,aktif,dogum_tarihi,alerjiler,veli_ad,veli_telefon,veli2_ad,veli2_telefon,aidat_tutari,kan_grubu,ilac,adres,aciklama,kayit_tarihi')
        .eq('okul_id', okulId)
        .eq('aktif', true)
        .order('ad_soyad')
        .limit(500),
      supabase.from('siniflar').select('id,ad,okul_id').eq('okul_id', okulId).order('ad'),
      supabase.from('okullar').select('id,ad,slug,logo_url,telefon,adres').eq('id', okulId).maybeSingle(),
    ])
    if (ogr) setOgrenciler(ogr)
    if (sinif) setSiniflar(sinif)
    if (okulData) setOkul(okulData as Okul)
  }

  useEffect(() => { params.then(p => setSlug(p.slug)) }, [params])

  useEffect(() => {
    if (!loading || hasValidSession) {
      setAuthTimeout(false)
      return
    }
    const timeout = window.setTimeout(() => setAuthTimeout(true), 10000)
    return () => window.clearTimeout(timeout)
  }, [hasValidSession, loading])

  useEffect(() => {
    if (!authTimeout || session || hasValidSession) return
    router.replace(`/giris?redirect=${encodeURIComponent(`/${slug}/admin`)}`)
  }, [authTimeout, hasValidSession, router, session, slug])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session && activeOkul) {
        setPageLoading(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [activeOkul, session])

  useEffect(() => {
    if ((loading && !hasValidSession) || !slug) return

    if (!session || !authOkul) {
      if (hasValidSession) return
      setPageLoading(false)
      router.replace(`/giris?redirect=${encodeURIComponent(`/${slug}/admin`)}`)
      return
    }

    const expectedPath = rolePath(role)
    if (role !== 'admin') {
      router.replace(`/${authOkul.slug}/${expectedPath ?? 'admin'}`)
      return
    }

    if (authOkul.slug !== slug) {
      router.replace(`/${authOkul.slug}/admin`)
      return
    }

    // Guard: skip if we already loaded data for this exact school+user combo.
    // Prevents duplicate loadAll when auth fires TOKEN_REFRESHED or INITIAL_SESSION.
    const loadKey = `${authOkul.id}-${session.user.id}`
    if (loadedRef.current !== loadKey) {
      loadedRef.current = loadKey
      setOkul(authOkul as Okul)
      setPageLoading(true)
      void loadAll(Number(authOkul.id)).finally(() => setPageLoading(false))
    } else {
      setOkul(prev => prev ?? (authOkul as Okul))
      setPageLoading(false)
    }
  }, [authOkul, hasValidSession, loading, role, router, session, slug])

  if ((loading && !hasValidSession) || !session || !activeOkul) {
    if (authTimeout && !hasValidSession) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#060a06] text-gray-400">
          Oturum doğrulanamadı, giriş ekranına yönlendiriliyor...
        </div>
      )
    }
    return <AdminSkeleton />
  }

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Ana Panel' },
    { id: 'ogrenciler', icon: Users, label: 'Öğrenciler' },
    { id: 'siniflar', icon: School, label: 'Sınıflar' },
    { id: 'yoklama', icon: ClipboardCheck, label: 'Yoklama' },
    { id: 'aktivite', icon: Sparkles, label: 'Aktiviteler' },
    { id: 'gunluk', icon: FileText, label: 'Günlük Rapor' },
    { id: 'gelisim', icon: LineChart, label: 'Gelişim' },
    { id: 'fotograflar', icon: ImageIcon, label: 'Fotoğraflar' },
    { id: 'aidat', icon: Wallet, label: 'Aidat' },
    { id: 'yemek', icon: UtensilsCrossed, label: 'Yemek Listesi' },
    { id: 'personel', icon: UserCog, label: 'Personel' },
    { id: 'servis', icon: Bus, label: 'Servis' },
    { id: 'mesajlar', icon: MessagesSquare, label: 'Mesajlar' },
    { id: 'duyurular', icon: Megaphone, label: 'Duyurular' },
    { id: 'etkinlikler', icon: CalendarDays, label: 'Etkinlikler' },
    { id: 'ayarlar', icon: Settings, label: 'Okul Ayarları' },
  ]

  return (
    <div className="flex min-h-screen bg-[#060a06] text-white">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed top-0 left-0 h-full w-60 z-50 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 border-r border-[rgba(74,222,128,0.14)] bg-[#060a06]`}>
        <div className="p-4 border-b border-[rgba(74,222,128,0.14)] flex items-center gap-3">
          {okul?.logo_url ? (
            <img src={activeOkul.logo_url} alt={activeOkul.ad} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="w-9 h-9 bg-[#4ade80] rounded-lg flex items-center justify-center text-sm font-bold text-black">
              {(activeOkul?.ad || 'Kinderly').split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-white">{activeOkul?.ad || 'Kinderly'}</div>
            <div className="text-xs text-[rgba(255,255,255,0.54)]">Yönetim Paneli</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setActivePage(item.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all border-l-2 ${activePage === item.id
                ? 'bg-[rgba(74,222,128,0.08)] text-[#4ade80] border-l-[#4ade80]'
                : 'border-l-transparent text-[rgba(255,255,255,0.7)] hover:bg-[#0b120b] hover:text-white'}`}>
              <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md ${activePage === item.id ? 'bg-[rgba(74,222,128,0.12)] text-[#4ade80]' : 'bg-[#0b120b] text-[rgba(255,255,255,0.54)]'}`}>
                <item.icon size={14} strokeWidth={2} />
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[rgba(74,222,128,0.14)]">
          <button onClick={async () => { await signOut(); window.location.href = '/giris' }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-[rgba(255,255,255,0.54)] hover:bg-[#0b120b] hover:text-white transition-colors">
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <header className="px-4 h-14 flex items-center justify-between sticky top-0 z-30 border-b border-[rgba(74,222,128,0.14)] bg-[#060a06]">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[rgba(255,255,255,0.54)] text-xl">☰</button>
            <h1 className="text-base font-semibold text-white">{navItems.find(n => n.id === activePage)?.label}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActivePage('yoklama')} className="bg-[#4ade80] text-black text-xs font-semibold px-3 py-1.5 rounded-lg">Yoklama Al</button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {activePage === 'dashboard' && <Dashboard okul={activeOkul} ogrenciler={ogrenciler} dark={dark} setActivePage={setActivePage} />}
          {activePage === 'ogrenciler' && <Ogrenciler ogrenciler={ogrenciler} siniflar={siniflar} okul={activeOkul} dark={dark} reload={() => loadAll(Number(activeOkul.id))} />}
          {activePage === 'siniflar' && <SiniflarPanel siniflar={siniflar} ogrenciler={ogrenciler} okul={activeOkul} dark={dark} reload={() => loadAll(Number(activeOkul.id))} />}
          {activePage === 'yoklama' && <Yoklama ogrenciler={ogrenciler} siniflar={siniflar} okul={activeOkul} dark={dark} />}
          {activePage === 'aktivite' && <AktivitePage ogrenciler={ogrenciler} okul={activeOkul} dark={dark} />}
          {activePage === 'gunluk' && <GunlukRaporPage ogrenciler={ogrenciler} siniflar={siniflar} okul={activeOkul} dark={dark} />}
          {activePage === 'gelisim' && <GelisimPage ogrenciler={ogrenciler} okul={activeOkul} dark={dark} />}
          {activePage === 'fotograflar' && <Fotograflar ogrenciler={ogrenciler} siniflar={siniflar} okul={activeOkul} dark={dark} />}
          {activePage === 'aidat' && <AidatPage ogrenciler={ogrenciler} okul={activeOkul} dark={dark} />}
          {activePage === 'yemek' && <YemekListesi okul={activeOkul} dark={dark} />}
          {activePage === 'personel' && <Personel siniflar={siniflar} okul={activeOkul} dark={dark} />}
          {activePage === 'servis' && <ServisPage ogrenciler={ogrenciler} siniflar={siniflar} okul={activeOkul} dark={dark} />}
          {activePage === 'mesajlar' && <MesajlarPage ogrenciler={ogrenciler} okul={activeOkul} dark={dark} />}
          {activePage === 'duyurular' && <Duyurular okul={activeOkul} dark={dark} />}
          {activePage === 'etkinlikler' && <Etkinlikler siniflar={siniflar} okul={activeOkul} dark={dark} />}
          {activePage === 'ayarlar' && <OkulAyarlari okul={activeOkul} dark={dark} setOkul={setOkul} />}
        </main>
      </div>
    </div>
  )
}

function AdminSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#060a06]">
      <aside className="hidden lg:flex w-60 flex-col border-r border-[rgba(74,222,128,0.14)] bg-[#060a06]">
        <div className="p-4 border-b border-[rgba(74,222,128,0.14)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0b120b] animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 rounded bg-[#0b120b] animate-pulse w-24" />
            <div className="h-2 rounded bg-[#0b120b] animate-pulse w-16" />
          </div>
        </div>
        <div className="flex-1 py-2 space-y-1 px-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-[#0b120b] animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-[rgba(74,222,128,0.14)] bg-[#060a06] flex items-center px-4 gap-3">
          <div className="h-4 w-32 rounded bg-[#0b120b] animate-pulse" />
        </header>
        <main className="flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-[#0b120b] animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-[#0b120b] animate-pulse" />
          <div className="h-48 rounded-xl bg-[#0b120b] animate-pulse" />
        </main>
      </div>
    </div>
  )
}

// ── YARDIMCI ──
function Card({ children, dark: _dark, className = '' }: any) {
  return <div className={`rounded-xl border shadow-sm overflow-hidden border-[rgba(74,222,128,0.14)] bg-[#0b120b] ${className}`}>{children}</div>
}

function Modal({ open, onClose, title, children, dark: _dark }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="rounded-xl w-full max-w-lg max-h-screen overflow-y-auto border shadow-2xl bg-[#0b120b] border-[rgba(74,222,128,0.14)]">
        <div className="px-5 py-4 border-b border-[rgba(74,222,128,0.14)] flex items-center justify-between">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-[rgba(255,255,255,0.54)] text-xl hover:text-white transition-colors">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const AKT_TYPES = [
  { id: 'food', label: 'Yemek', emoji: '🍎', color: '#00b884' },
  { id: 'nap', label: 'Uyku', emoji: '😴', color: '#3d4eb8' },
  { id: 'potty', label: 'Tuvalet', emoji: '🚽', color: '#00b8d4' },
  { id: 'photo', label: 'Fotoğraf', emoji: '📷', color: '#e91e8c' },
  { id: 'kudos', label: 'Tebrik', emoji: '⭐', color: '#9c27b0' },
  { id: 'meds', label: 'İlaç', emoji: '💊', color: '#f5a623' },
  { id: 'incident', label: 'Kaza', emoji: '🩹', color: '#f44336' },
  { id: 'health', label: 'Sağlık', emoji: '🌡️', color: '#7c4dff' },
  { id: 'note', label: 'Not', emoji: '📝', color: '#00897b' },
  { id: 'absence', label: 'Devamsızlık', emoji: '📅', color: '#9e9e9e' },
]

function today() { return new Date().toISOString().split('T')[0] }
function fmtM(n: number) { return '₺' + (Number(n) || 0).toLocaleString('tr-TR') }

function activityPhotoUrl(row: any) {
  return row?.tur === 'photo' && typeof row.detay?.url === 'string' ? row.detay.url : null
}

function photoContentType(file: File) {
  if (file.type) return file.type
  const name = file.name.toLocaleLowerCase('tr-TR')
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.heic')) return 'image/heic'
  if (name.endsWith('.heif')) return 'image/heif'
  return 'image/jpeg'
}

function photoStoragePath(okulId: string | number, ogrenciId: string | number, file: File) {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase('tr-TR')
  const safeExtension = extension && ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extension) ? extension : 'jpg'
  return `${okulId}/${ogrenciId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExtension}`
}

// ── DASHBOARD ──
function Dashboard({ okul, ogrenciler, dark, setActivePage }: any) {
  const [stats, setStats] = useState({ geldi: 0, aidatKisi: 0, aidatTutar: 0, etkinlik: 0 })
  const [events, setEvents] = useState<any[]>([])
  const [debts, setDebts] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) loadDash() }, [okul])

  async function loadDash() {
    const [yok, aidat, etk, debtsData, aktData] = await Promise.all([
      supabase.from('yoklama').select('durum').eq('okul_id', okul.id).eq('tarih', today()),
      supabase.from('aidatlar').select('tutar,ogrenci_id').eq('okul_id', okul.id).eq('odendi', false),
      supabase.from('etkinlikler').select('*').eq('okul_id', okul.id).gte('tarih', today()).order('tarih').limit(3),
      supabase.from('aidatlar').select('tutar,ogrenciler(ad_soyad)').eq('okul_id', okul.id).eq('odendi', false).limit(5),
      supabase.from('aktiviteler').select('tur,tarih,ogrenciler(ad_soyad)').eq('okul_id', okul.id).order('id', { ascending: false }).limit(5)
    ])
    setStats({
      geldi: yok.data?.filter(y => y.durum === 'geldi').length || 0,
      aidatTutar: aidat.data?.reduce((s, a) => s + Number(a.tutar), 0) || 0,
      aidatKisi: new Set(aidat.data?.map(a => a.ogrenci_id)).size,
      etkinlik: etk.data?.length || 0
    })
    setEvents(etk.data || [])
    setDebts(debtsData.data || [])
    setActivities(aktData.data || [])
  }

  const alerjili = ogrenciler.filter((o: Ogrenci) => o.alerjiler)
  const AKT_E: Record<string, string> = { food: '🍎', nap: '😴', potty: '🚽', meds: '💊', incident: '🩹', health: '🌡️', kudos: '⭐', note: '📝', photo: '📷', absence: '📅' }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Hoş Geldiniz</h2>
          <p className="text-sm text-[rgba(255,255,255,0.54)]">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {alerjili.length > 0 && (
        <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-lg p-3 mb-4 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-sm text-red-400">Alerjisi Olan Öğrenciler ({alerjili.length})</p>
            <p className="text-xs text-[rgba(255,255,255,0.54)]">{alerjili.map((o: Ogrenci) => o.ad_soyad.split(' ')[0] + ': ' + o.alerjiler).join(' · ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { icon: 'Ö', label: 'Toplam Öğrenci', value: ogrenciler.length, page: 'ogrenciler' },
          { icon: 'Y', label: 'Bugün Geldi', value: stats.geldi, page: 'yoklama' },
          { icon: 'A', label: 'Geciken Aidat', value: stats.aidatKisi + ' kişi', page: 'aidat' },
          { icon: 'E', label: 'Yaklaşan Etkinlik', value: stats.etkinlik, page: 'etkinlikler' },
        ].map(w => (
          <div key={w.label} onClick={() => setActivePage(w.page)}
            className="rounded-xl p-4 border border-[rgba(74,222,128,0.14)] bg-[#0b120b] cursor-pointer hover:border-[rgba(74,222,128,0.3)] hover:bg-[#0d160d] transition-all">
            <div className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-[rgba(74,222,128,0.12)] px-2 text-xs font-semibold text-[#4ade80] mb-2">{w.icon}</div>
            <div className="text-xs text-[rgba(255,255,255,0.54)] font-medium mb-1">{w.label}</div>
            <div className="text-2xl font-bold text-[#4ade80]">{w.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card dark={dark}>
          <div className="px-4 py-3 border-b border-[rgba(74,222,128,0.14)] flex items-center justify-between">
            <h3 className="font-semibold text-sm text-white">Yaklaşan Etkinlikler</h3>
            <button onClick={() => setActivePage('etkinlikler')} className="text-xs text-[#4ade80] font-medium">Tümü</button>
          </div>
          <div className="p-4">
            {events.length ? events.map(e => {
              const d = new Date(e.tarih)
              return <div key={e.id} className="flex items-center gap-3 py-2 border-b last:border-0 border-[rgba(74,222,128,0.08)]">
                <div className="bg-[#4ade80] text-black rounded-lg px-2 py-1 text-center min-w-10 flex-shrink-0">
                  <div className="text-base font-bold leading-none">{d.getDate()}</div>
                  <div className="text-xs opacity-70">{d.toLocaleDateString('tr-TR', { month: 'short' })}</div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{e.baslik}</p>
                  <p className="text-xs text-[rgba(255,255,255,0.54)]">{e.hedef_kitle || ''}</p>
                </div>
              </div>
            }) : <p className="text-sm text-[rgba(255,255,255,0.54)]">Yaklaşan etkinlik yok</p>}
          </div>
        </Card>

        <Card dark={dark}>
          <div className="px-4 py-3 border-b border-[rgba(74,222,128,0.14)] flex items-center justify-between">
            <h3 className="font-semibold text-sm text-white">Geciken Aidatlar</h3>
            <button onClick={() => setActivePage('aidat')} className="text-xs text-[#4ade80] font-medium">Tümü</button>
          </div>
          <div className="p-4">
            {debts.length ? debts.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 text-sm border-[rgba(74,222,128,0.08)]">
                <span className="font-medium text-white">{(a.ogrenciler as any)?.ad_soyad || '—'}</span>
                <span className="text-red-400 font-semibold">{fmtM(a.tutar)}</span>
              </div>
            )) : <p className="text-sm text-[#4ade80] font-semibold">✅ Tüm aidatlar ödendi!</p>}
          </div>
        </Card>

        <Card dark={dark}>
          <div className="px-4 py-3 border-b border-[rgba(74,222,128,0.14)]">
            <h3 className="font-semibold text-sm text-white">⚡ Son Aktiviteler</h3>
          </div>
          <div className="p-4">
            {activities.length ? activities.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0 text-sm border-[rgba(74,222,128,0.08)]">
                <span>{AKT_E[a.tur] || '📋'}</span>
                <span className="flex-1 font-medium text-white">{(a.ogrenciler as any)?.ad_soyad || '—'}</span>
                <span className="text-[rgba(255,255,255,0.54)] text-xs">{a.tarih}</span>
              </div>
            )) : <p className="text-sm text-[rgba(255,255,255,0.54)]">Aktivite yok</p>}
          </div>
        </Card>

        <Card dark={dark}>
          <div className="px-4 py-3 border-b border-[rgba(74,222,128,0.14)]">
            <h3 className="font-semibold text-sm text-white">🎂 Bu Hafta Doğum Günleri</h3>
          </div>
          <div className="p-4">
            {ogrenciler.filter((o: Ogrenci) => {
              if (!o.dogum_tarihi) return false
              const bd = new Date(o.dogum_tarihi)
              const now = new Date()
              const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate())
              const diff = Math.round((thisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              return diff >= 0 && diff <= 7
            }).map((o: Ogrenci) => {
              const bd = new Date(o.dogum_tarihi!)
              const now = new Date()
              const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate())
              const diff = Math.round((thisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              return (
                <div key={o.id} className="flex items-center gap-3 py-2 border-b last:border-0 border-[rgba(74,222,128,0.08)]">
                  <span className="text-xl">🎂</span>
                  <span className="flex-1 text-sm font-medium text-white">{o.ad_soyad}</span>
                  <span className="text-xs text-orange-400 font-semibold">{diff === 0 ? '🎉 Bugün!' : diff + ' gün'}</span>
                </div>
              )
            })}
            {!ogrenciler.some((o: Ogrenci) => {
              if (!o.dogum_tarihi) return false
              const bd = new Date(o.dogum_tarihi)
              const now = new Date()
              const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate())
              const diff = Math.round((thisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              return diff >= 0 && diff <= 7
            }) && <p className="text-sm text-[rgba(255,255,255,0.54)]">Bu hafta doğum günü yok</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── ÖĞRENCİLER ──
function Ogrenciler({ ogrenciler, siniflar, okul, dark, reload }: any) {
  const [search, setSearch] = useState('')
  const [sinifFilter, setSinifFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Ogrenci | null>(null)
  const [form, setForm] = useState<any>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = ogrenciler.filter((o: Ogrenci) =>
    o.ad_soyad.toLowerCase().includes(search.toLowerCase()) &&
    (!sinifFilter || o.sinif === sinifFilter)
  )

  function openAdd() { setEditing(null); setForm({ aidat_tutari: 3000 }); setSaveError(null); setModal(true) }
  function openEdit(o: Ogrenci) { setEditing(o); setForm({ ...o }); setSaveError(null); setModal(true) }

  async function save() {
    if (!form.ad_soyad || !form.veli_ad || !form.veli_telefon) { setSaveError('Ad, veli ve telefon zorunlu!'); return }
    setSaving(true)
    setSaveError(null)
    try {
      const data = {
        ad_soyad: form.ad_soyad?.trim(),
        dogum_tarihi: form.dogum_tarihi || null,
        sinif: form.sinif || null,
        veli_ad: form.veli_ad?.trim() || null,
        veli_telefon: form.veli_telefon?.trim() || null,
        veli2_ad: form.veli2_ad?.trim() || null,
        veli2_telefon: form.veli2_telefon?.trim() || null,
        alerjiler: form.alerjiler?.trim() || null,
        ilac: form.ilac?.trim() || null,
        adres: form.adres?.trim() || null,
        aciklama: form.aciklama?.trim() || null,
        aidat_tutari: form.aidat_tutari ? Number(form.aidat_tutari) : null,
        kan_grubu: form.kan_grubu || null,
        okul_id: okul.id,
        aktif: true,
      }
      if (editing) {
        const { error } = await supabase.from('ogrenciler').update(data).eq('id', editing.id)
        if (error) throw error
      } else {
        const { data: res, error } = await supabase
          .from('ogrenciler')
          .insert({ ...data, kayit_tarihi: today() })
          .select()
        if (error) throw error
        if (res?.[0]) {
          const ay = today().slice(0, 7)
          const { error: aidatError } = await supabase.from('aidatlar').insert({
            okul_id: okul.id,
            ogrenci_id: res[0].id,
            ay,
            tutar: form.aidat_tutari || 3000,
            odendi: false,
          })
          if (aidatError) console.warn('Aidat kaydı oluşturulamadı:', aidatError.message)
        }
      }
      setModal(false)
      reload()
    } catch (err: any) {
      const msg = err?.message || 'Bilinmeyen hata'
      const detail = err?.code === '42501'
        ? 'Yetki hatası (RLS): Bu işlem için yetkiniz bulunmuyor.'
        : err?.code === '23505'
          ? 'Bu öğrenci zaten kayıtlı.'
          : `Kayıt hatası: ${msg}`
      setSaveError(detail)
    } finally {
      setSaving(false)
    }
  }

  async function deleteOgr(id: number) {
    if (!confirm('Silmek istediğinizden emin misiniz?')) return
    await supabase.from('ogrenciler').update({ aktif: false }).eq('id', id)
    reload()
  }

  function exportCSV() {
    const rows = [['Ad Soyad', 'Sınıf', 'Veli', 'Telefon', 'Alerjiler', 'Aidat']]
    ogrenciler.forEach((o: Ogrenci) => rows.push([o.ad_soyad, o.sinif || '', o.veli_ad || '', o.veli_telefon || '', o.alerjiler || '', String(o.aidat_tutari || '')]))
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv); a.download = 'ogrenciler.csv'; a.click()
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Öğrenci ara..."
          className="flex-1 min-w-48 border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80] transition-colors" />
        <select value={sinifFilter} onChange={e => setSinifFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80] transition-colors">
          <option value="">Tüm Sınıflar</option>
          {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
        </select>
        <button onClick={exportCSV} className="border border-[rgba(74,222,128,0.3)] px-4 py-2 rounded-lg text-sm font-semibold text-[rgba(255,255,255,0.7)] hover:text-white hover:border-[#4ade80] transition-colors">📥 CSV</button>
        <button onClick={openAdd} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">+ Ekle</button>
      </div>

      <Card dark={dark}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0d160d]">
                {['Öğrenci', 'Sınıf', 'Veli', 'Telefon', 'Alerji', 'İşlem'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase text-[rgba(255,255,255,0.54)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o: Ogrenci) => (
                <tr key={o.id} className="border-t border-[rgba(74,222,128,0.08)] hover:bg-[#0d160d] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-sm text-white">{o.ad_soyad}</div>
                    {o.alerjiler && <div className="text-xs text-red-400 font-semibold">🚨 {o.alerjiler}</div>}
                  </td>
                  <td className="px-4 py-3"><span className="bg-[rgba(74,222,128,0.12)] text-[#4ade80] text-xs font-semibold px-2 py-1 rounded-full">{o.sinif || '—'}</span></td>
                  <td className="px-4 py-3 text-sm text-[rgba(255,255,255,0.7)]">{o.veli_ad || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[rgba(255,255,255,0.7)]">{o.veli_telefon || '—'}</td>
                  <td className="px-4 py-3">{o.alerjiler ? <span className="bg-[rgba(239,68,68,0.12)] text-red-400 text-xs font-semibold px-2 py-1 rounded-full">⚠️ Var</span> : <span className="text-[rgba(255,255,255,0.35)] text-xs">Yok</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(o)} className="text-xs border border-[rgba(74,222,128,0.2)] px-2 py-1 rounded text-[rgba(255,255,255,0.7)] hover:border-[#4ade80] hover:text-[#4ade80] transition-colors">✏️</button>
                      <button onClick={() => deleteOgr(o.id)} className="text-xs bg-[rgba(239,68,68,0.1)] text-red-400 border border-[rgba(239,68,68,0.2)] px-2 py-1 rounded">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={6} className="text-center py-8 text-[rgba(255,255,255,0.35)] text-sm">Öğrenci bulunamadı</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Öğrenci Düzenle' : 'Öğrenci Ekle'} dark={dark}>
        <div className="p-5 grid grid-cols-2 gap-3">
          {[
            { label: 'Ad Soyad *', key: 'ad_soyad', full: true },
            { label: 'Doğum Tarihi', key: 'dogum_tarihi', type: 'date' },
            { label: 'Aylık Aidat (₺)', key: 'aidat_tutari', type: 'number' },
            { label: 'Veli Adı *', key: 'veli_ad' },
            { label: 'Veli Telefon *', key: 'veli_telefon' },
            { label: '2. Veli', key: 'veli2_ad' },
            { label: '2. Veli Tel', key: 'veli2_telefon' },
            { label: 'Alerjiler', key: 'alerjiler', full: true },
            { label: 'Sürekli İlaç', key: 'ilac', full: true },
            { label: 'Adres', key: 'adres', full: true },
            { label: 'Notlar', key: 'aciklama', full: true },
          ].map(f => (
            <div key={f.key} className={f.full ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">{f.label}</label>
              <input type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Sınıf</label>
            <select value={form.sinif || ''} onChange={e => setForm({ ...form, sinif: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80]`}>
              <option value="">— Seçin —</option>
              {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Kan Grubu</label>
            <select value={form.kan_grubu || ''} onChange={e => setForm({ ...form, kan_grubu: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80]`}>
              {['—', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        {saveError && (
          <div className="px-5 pb-3">
            <p className="text-sm text-red-400 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-lg px-3 py-2">{saveError}</p>
          </div>
        )}
        <div className={`px-5 py-4 border-t flex justify-end gap-2 border-[rgba(74,222,128,0.14)]`}>
          <button onClick={() => setModal(false)} disabled={saving} className="border border-[rgba(74,222,128,0.2)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.6)] hover:border-[rgba(74,222,128,0.4)] transition-colors disabled:opacity-50">İptal</button>
          <button onClick={save} disabled={saving} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 min-w-[80px]">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── YOKLAMA ──
function Yoklama({ ogrenciler, siniflar, okul, dark }: any) {
  const [tarih, setTarih] = useState(today())
  const [sinifFilter, setSinifFilter] = useState('')
  const [state, setState] = useState<Record<number, string>>({})

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) load() }, [tarih, okul])

  async function load() {
    const { data } = await supabase.from('yoklama').select('ogrenci_id,durum').eq('okul_id', okul.id).eq('tarih', tarih)
    const s: Record<number, string> = {}
    data?.forEach(y => s[y.ogrenci_id] = y.durum)
    setState(s)
  }

  async function save() {
    await supabase.from('yoklama').delete().eq('okul_id', okul.id).eq('tarih', tarih)
    const rows = Object.entries(state).map(([id, durum]) => ({ okul_id: okul.id, ogrenci_id: parseInt(id), tarih, durum }))
    if (rows.length) await supabase.from('yoklama').insert(rows)
    alert('Yoklama kaydedildi ✓')
  }

  function sendWA() {
    const geldi = ogrenciler.filter((o: Ogrenci) => state[o.id] === 'geldi').map((o: Ogrenci) => o.ad_soyad.split(' ')[0])
    const gelmedi = ogrenciler.filter((o: Ogrenci) => state[o.id] === 'gelmedi').map((o: Ogrenci) => o.ad_soyad.split(' ')[0])
    const msg = `🌱 *Kinderly Yoklama — ${tarih}*\n\n✅ Gelen (${geldi.length}): ${geldi.join(', ') || '—'}\n❌ Gelmeyen (${gelmedi.length}): ${gelmedi.join(', ') || '—'}`
    window.open('https://wa.me/?text=' + encodeURIComponent(msg))
  }

  const filtered = sinifFilter ? ogrenciler.filter((o: Ogrenci) => o.sinif === sinifFilter) : ogrenciler
  const counts = { geldi: Object.values(state).filter(v => v === 'geldi').length, gelmedi: Object.values(state).filter(v => v === 'gelmedi').length, izinli: Object.values(state).filter(v => v === 'izinli').length }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
        <select value={sinifFilter} onChange={e => setSinifFilter(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80]`}>
          <option value="">Tüm Sınıflar</option>
          {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
        </select>
        <button onClick={sendWA} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">📱 WhatsApp</button>
        <button onClick={save} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">💾 Kaydet</button>
        <div className="ml-auto flex gap-4 text-sm font-semibold">
          <span className="text-[#4ade80]">✅ {counts.geldi}</span>
          <span className="text-red-400">❌ {counts.gelmedi}</span>
          <span className="text-orange-500">🏖️ {counts.izinli}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((o: Ogrenci) => {
          const d = state[o.id] || ''
          return (
            <div key={o.id} className={`border-2 rounded-xl p-3 text-center transition-all ${d === 'geldi' ? 'border-[rgba(74,222,128,0.5)] bg-[rgba(74,222,128,0.08)]' : d === 'gelmedi' ? 'border-[rgba(239,68,68,0.5)] bg-[rgba(239,68,68,0.08)]' : d === 'izinli' ? 'border-orange-400/50 bg-orange-400/10' : 'border-[rgba(74,222,128,0.14)] bg-[#0b120b]'}`}>
              <div className="text-2xl mb-1">🌸</div>
              <div className="text-xs font-semibold mb-2 text-white">{o.ad_soyad.split(' ')[0]}</div>
              <div className="flex gap-1 justify-center">
                {[['geldi','✓','bg-[#4ade80] text-black'],['gelmedi','✗','bg-red-500 text-white'],['izinli','İ','bg-orange-400 text-white']].map(([val,label,color]) => (
                  <button key={val} onClick={() => setState(s => ({ ...s, [o.id]: val }))}
                    className={`text-xs px-2 py-1 rounded font-bold transition-all ${d === val ? color : 'bg-[#0d160d] text-[rgba(255,255,255,0.54)]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── AKTİVİTE ──
function AktivitePage({ ogrenciler, okul, dark }: any) {
  const [selected, setSelected] = useState<Ogrenci | null>(null)
  const [tarih, setTarih] = useState(today())
  const [feed, setFeed] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [aktType, setAktType] = useState('')
  const [form, setForm] = useState<any>({})
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (selected && okul) loadFeed() }, [selected, tarih])

  async function loadFeed() {
    const { data } = await supabase.from('aktiviteler').select('*').eq('okul_id', okul.id).eq('ogrenci_id', selected!.id).eq('tarih', tarih).order('id', { ascending: false })
    const signedRows = await withSignedPhotoUrls(data || [])
    setFeed(signedRows)
  }

  async function saveAkt() {
    if (!selected || !aktType) return
    if (aktType === 'photo' && !photoFile) {
      alert('Fotoğraf seçin.')
      return
    }

    setSaving(true)
    let uploadedStoragePath: string | null = null
    const detay = { ...form }

    try {
      if (aktType === 'photo' && photoFile) {
        uploadedStoragePath = photoStoragePath(okul.id, selected.id, photoFile)
        const { error: uploadError } = await supabase.storage.from('photos').upload(uploadedStoragePath, photoFile, {
          contentType: photoContentType(photoFile),
          cacheControl: '3600',
          upsert: true,
        })

        if (uploadError) throw uploadError
        detay.storagePath = uploadedStoragePath
        detay.url = null
      }

      const { error } = await supabase.from('aktiviteler').insert({ okul_id: okul.id, ogrenci_id: selected.id, tarih, tur: aktType, detay, kaydeden: 'Yönetici', veli_gosterilsin: true })

      if (error) throw error

      await supabase.from('bildirimler').insert({ okul_id: okul.id, ogrenci_id: selected.id, baslik: AKT_TYPES.find(t => t.id === aktType)?.label || aktType, mesaj: selected.ad_soyad.split(' ')[0] + ' için kayıt eklendi.', tur: aktType, okundu: false })
      setModal(false)
      setPhotoFile(null)
      setForm({})
      await loadFeed()
    } catch (error: any) {
      if (uploadedStoragePath) await supabase.storage.from('photos').remove([uploadedStoragePath])
      alert(error?.message || 'Aktivite kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = ogrenciler.filter((o: Ogrenci) => o.ad_soyad.toLowerCase().includes(search.toLowerCase()))
  const t = AKT_TYPES.find(x => x.id === aktType)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card dark={dark}>
        <div className={`px-4 py-3 border-b font-semibold text-sm border-[rgba(74,222,128,0.14)] text-white`}>👦 Öğrenci Seç</div>
        <div className="p-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Ara..."
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none mb-2 bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
          <div className="max-h-80 overflow-y-auto">
            {filtered.map((o: Ogrenci) => (
              <div key={o.id} onClick={() => setSelected(o)}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${selected?.id === o.id ? 'bg-[rgba(74,222,128,0.1)]' : 'hover:bg-[#0d160d]'}`}>
                <span className="text-lg">🌸</span>
                <div>
                  <div className={`text-sm font-medium text-white`}>{o.ad_soyad}</div>
                  <div className="text-xs text-[rgba(255,255,255,0.54)]">{o.sinif || ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <Card dark={dark}>
          <div className={`px-4 py-3 border-b font-semibold text-sm border-[rgba(74,222,128,0.14)] text-white`}>
            {selected ? selected.ad_soyad : 'Öğrenci seçin'}
          </div>
          <div className="p-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
            {AKT_TYPES.map(t => (
              <button key={t.id} onClick={() => { if (!selected) { alert('Önce öğrenci seçin!'); return }; setAktType(t.id); setForm({}); setPhotoFile(null); setModal(true) }}
                className="rounded-xl p-3 flex flex-col items-center gap-1 text-white text-xs font-semibold transition-transform hover:-translate-y-0.5"
                style={{ background: t.color }}>
                <span className="text-2xl">{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card dark={dark}>
          <div className={`px-4 py-3 border-b flex items-center justify-between border-[rgba(74,222,128,0.14)]`}>
            <span className={`font-semibold text-sm text-white`}>📋 Aktivite Geçmişi</span>
            <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
              className={`border rounded-lg px-2 py-1 text-xs outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
          </div>
          <div>
            {feed.length ? feed.map(a => {
              const tp = AKT_TYPES.find(x => x.id === a.tur)
              const photoUrl = activityPhotoUrl(a)
              return <div key={a.id} className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 ${dark ? 'border-[rgba(74,222,128,0.14)]' : 'border-gray-50'}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: tp?.color || '#9e9e9e' }}>{tp?.emoji || '📋'}</div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium text-white`}>{tp?.label || a.tur}{a.detay?.not ? ' · ' + a.detay.not : ''}</div>
                  <div className="text-xs text-[rgba(255,255,255,0.54)]">{a.kaydeden}</div>
                  {photoUrl ? (
                    <button type="button" onClick={() => window.open(photoUrl, '_blank')} className="mt-3 block w-full overflow-hidden rounded-xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d]">
                      <img src={photoUrl} alt="Aktivite fotoğrafı" className="h-48 w-full object-cover" />
                    </button>
                  ) : null}
                  {a.tur === 'photo' && !photoUrl ? (
                    <div className="mt-3 rounded-lg bg-[#0d160d] px-3 py-2 text-xs text-[rgba(255,255,255,0.54)]">
                      Fotoğraf yükleniyor veya erişim izni bekleniyor.
                    </div>
                  ) : null}
                </div>
              </div>
            }) : <div className="text-center py-8 text-[rgba(255,255,255,0.35)] text-sm">Aktivite yok</div>}
          </div>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={`${t?.emoji} ${t?.label}`} dark={dark}>
        <div className="p-5 space-y-3">
          {aktType === 'food' && <>
            <div>
              <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-2">ÖĞÜN</label>
              <div className="flex gap-2 flex-wrap">
                {['Kahvaltı','Kuşluk','Öğle','İkindi'].map(v => (
                  <button key={v} onClick={() => setForm({...form, ogun: v})}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${form.ogun === v ? 'bg-[#4ade80] text-black border-[#4ade80]' : 'border-[rgba(74,222,128,0.2)] text-[rgba(255,255,255,0.7)]'}`}>{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-2">NE KADAR YEDİ?</label>
              <div className="flex gap-2 flex-wrap">
                {['Hepsini','Çoğunu','Birazını','Hiç'].map(v => (
                  <button key={v} onClick={() => setForm({...form, yeme: v})}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${form.yeme === v ? 'bg-[#4ade80] text-black border-[#4ade80]' : 'border-[rgba(74,222,128,0.2)] text-[rgba(255,255,255,0.7)]'}`}>{v}</button>
                ))}
              </div>
            </div>
          </>}
          {aktType === 'health' && <div>
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Ateş (°C)</label>
            <input type="number" step="0.1" value={form.ates || ''} onChange={e => setForm({...form, ates: e.target.value})}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
          </div>}
          {aktType === 'meds' && <>
            <div>
              <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">İlaç Adı *</label>
              <input value={form.ilac || ''} onChange={e => setForm({...form, ilac: e.target.value})}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Doz</label>
              <input value={form.doz || ''} onChange={e => setForm({...form, doz: e.target.value})}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
            </div>
          </>}
          {aktType === 'photo' && <div>
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Fotoğraf</label>
            <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] ?? null)}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white file:mr-3 file:rounded-lg file:border-0 file:bg-[#4ade80] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-black focus:border-[#4ade80]`} />
            {photoFile && <div className="mt-2 text-xs text-[rgba(255,255,255,0.54)]">{photoFile.name}</div>}
          </div>}
          <div>
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Not</label>
            <textarea value={form.not || ''} onChange={e => setForm({...form, not: e.target.value}) }
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} rows={3} />
          </div>
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 border-[rgba(74,222,128,0.14)]`}>
          <button onClick={() => setModal(false)} className="border border-[rgba(74,222,128,0.2)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.6)] hover:border-[rgba(74,222,128,0.4)] transition-colors">İptal</button>
          <button onClick={saveAkt} disabled={saving} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </div>
      </Modal>
    </div>
  )
}

// ── GÜNLÜK RAPOR ──
function GunlukRaporPage({ ogrenciler, siniflar, okul, dark }: any) {
  const [tarih, setTarih] = useState(today())
  const [sinifFilter, setSinifFilter] = useState('')
  const [raporlar, setRaporlar] = useState<Record<number, any>>({})

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) load() }, [tarih, okul])

  async function load() {
    const { data } = await supabase.from('gunluk_rapor').select('*').eq('okul_id', okul.id).eq('tarih', tarih)
    const r: Record<number, any> = {}
    data?.forEach(d => r[d.ogrenci_id] = d)
    setRaporlar(r)
  }

  async function saveRapor(ogrId: number, rapor: any) {
    const existing = raporlar[ogrId]
    if (existing) {
      await supabase.from('gunluk_rapor').update({ ...rapor, kaydeden: 'Yönetici' }).eq('id', existing.id)
    } else {
      await supabase.from('gunluk_rapor').insert({ okul_id: okul.id, ogrenci_id: ogrId, tarih, ...rapor, kaydeden: 'Yönetici' })
    }
    load()
  }

  const filtered = sinifFilter ? ogrenciler.filter((o: Ogrenci) => o.sinif === sinifFilter) : ogrenciler

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
        <select value={sinifFilter} onChange={e => setSinifFilter(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80]`}>
          <option value="">Tüm Sınıflar</option>
          {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
        </select>
      </div>
      <div className="space-y-3">
        {filtered.map((o: Ogrenci) => {
          const r = raporlar[o.id] || {}
          return (
            <Card key={o.id} dark={dark}>
              <div className={`px-4 py-3 border-b flex items-center gap-3 border-[rgba(74,222,128,0.14)]`}>
                <span className="text-xl">🌸</span>
                <span className={`font-semibold text-sm text-white`}>{o.ad_soyad}</span>
                <span className="text-xs text-[rgba(255,255,255,0.54)]">{o.sinif}</span>
              </div>
              <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: '🍳 Kahvaltı', key: 'kahvalti', placeholder: 'Ne yedi?' },
                  { label: '🍽️ Öğle', key: 'ogle', placeholder: 'Ne yedi?' },
                  { label: '😴 Uyku', key: 'uyku_suresi', placeholder: 'Ne kadar?' },
                  { label: '😊 Ruh Hali', key: 'ruh_hali', placeholder: 'Nasıldı?' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">{f.label}</label>
                    <input
                      defaultValue={r[f.key] || ''}
                      placeholder={f.placeholder}
                      onBlur={e => saveRapor(o.id, { ...r, [f.key]: e.target.value })}
                      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`}
                    />
                  </div>
                ))}
                <div className="col-span-2 lg:col-span-4">
                  <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">📝 Açıklama</label>
                  <input
                    defaultValue={r.aciklama || ''}
                    placeholder="Günle ilgili not..."
                    onBlur={e => saveRapor(o.id, { ...r, aciklama: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`}
                  />
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ── GELİŞİM ──
const GEL_CATS = [
  { id: 'dil', ad: '💬 Dil & İletişim' },
  { id: 'sosyal', ad: '🤝 Sosyal Beceriler' },
  { id: 'motor', ad: '🏃 Motor Gelişim' },
  { id: 'bilissel', ad: '🧠 Bilişsel Gelişim' },
  { id: 'ozbakım', ad: '🌟 Öz Bakım' },
  { id: 'yaratici', ad: '🎨 Yaratıcılık' },
  { id: 'matematik', ad: '🔢 Matematik' },
  { id: 'muzik', ad: '🎵 Müzik & Ritim' },
]

function GelisimPage({ ogrenciler, okul, dark }: any) {
  const [selectedOgr, setSelectedOgr] = useState<number | ''>('')
  const [donem, setDonem] = useState('2025-2026 1. Dönem')
  const [data, setData] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [puanlar, setPuanlar] = useState<Record<string, number>>({})
  const [genelNot, setGenelNot] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (selectedOgr && okul) load() }, [selectedOgr, donem])

  async function load() {
    const { data: d } = await supabase.from('gelisim').select('*').eq('okul_id', okul.id).eq('ogrenci_id', selectedOgr).eq('donem', donem)
    setData(d || [])
  }

  async function save() {
    await supabase.from('gelisim').delete().eq('okul_id', okul.id).eq('ogrenci_id', selectedOgr).eq('donem', donem)
    for (const k of GEL_CATS) {
      await supabase.from('gelisim').insert({ okul_id: okul.id, ogrenci_id: selectedOgr, donem, kategori: k.id, puan: puanlar[k.id] || 0, tarih: today() })
    }
    if (genelNot) await supabase.from('gelisim').insert({ okul_id: okul.id, ogrenci_id: selectedOgr, donem, kategori: 'genel', puan: 0, not_text: genelNot, tarih: today() })
    setModal(false); load()
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <select value={selectedOgr} onChange={e => setSelectedOgr(Number(e.target.value))}
          className={`border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80]`}>
          <option value="">— Öğrenci Seç —</option>
          {ogrenciler.map((o: Ogrenci) => <option key={o.id} value={o.id}>{o.ad_soyad}</option>)}
        </select>
        <select value={donem} onChange={e => setDonem(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80]`}>
          <option>2025-2026 1. Dönem</option>
          <option>2025-2026 2. Dönem</option>
        </select>
        {selectedOgr && <button onClick={() => { setPuanlar({}); setGenelNot(''); setModal(true) }} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">+ Rapor Ekle</button>}
      </div>

      {data.length > 0 && (
        <Card dark={dark}>
          <div className={`px-4 py-3 border-b border-[rgba(74,222,128,0.14)]`}>
            <h3 className={`font-semibold text-white`}>{donem}</h3>
          </div>
          <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {GEL_CATS.map(k => {
              const d = data.find(x => x.kategori === k.id)
              return (
                <div key={k.id} className="rounded-lg p-3 bg-[#0d160d]">
                  <div className="text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">{k.ad}</div>
                  <div className="text-lg">{'⭐'.repeat(d?.puan || 0)}{'☆'.repeat(5 - (d?.puan || 0))}</div>
                </div>
              )
            })}
          </div>
          {data.find(x => x.kategori === 'genel')?.not_text && (
            <div className="mx-4 mb-4 p-3 rounded-lg border-l-4 border-[#4ade80] bg-[#0d160d]">
              <p className={`text-sm text-white`}>📝 {data.find(x => x.kategori === 'genel')?.not_text}</p>
            </div>
          )}
        </Card>
      )}

      {!selectedOgr && <div className="text-center py-16 text-[rgba(255,255,255,0.35)]">📈 Öğrenci seçin</div>}
      {selectedOgr && !data.length && <div className="text-center py-16 text-[rgba(255,255,255,0.35)]">📈 Bu dönem için rapor yok</div>}

      <Modal open={modal} onClose={() => setModal(false)} title="Gelişim Raporu Ekle" dark={dark}>
        <div className="p-5 space-y-3">
          {GEL_CATS.map(k => (
            <div key={k.id} className="flex items-center gap-3">
              <span className={`flex-1 text-sm font-medium text-white`}>{k.ad}</span>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setPuanlar(p => ({ ...p, [k.id]: i }))}
                    className="text-xl transition-transform hover:scale-110">
                    {(puanlar[k.id] || 0) >= i ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Genel Değerlendirme</label>
            <textarea value={genelNot} onChange={e => setGenelNot(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} rows={3} />
          </div>
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 border-[rgba(74,222,128,0.14)]`}>
          <button onClick={() => setModal(false)} className="border border-[rgba(74,222,128,0.2)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.6)] hover:border-[rgba(74,222,128,0.4)] transition-colors">İptal</button>
          <button onClick={save} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">Kaydet</button>
        </div>
      </Modal>
    </div>
  )
}

// ── FOTOĞRAFLAR ──
function Fotograflar({ ogrenciler, siniflar, okul, dark }: any) {
  const [fotos, setFotos] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [form, setForm] = useState<any>({})
  const [uploading, setUploading] = useState(false)
  const [viewer, setViewer] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) load() }, [okul])

  async function load() {
    const { data } = await supabase
      .from('aktiviteler')
      .select('id,ogrenci_id,tur,detay,kaydeden,tarih,olusturuldu,ogrenciler(ad_soyad,sinif)')
      .eq('okul_id', okul.id)
      .eq('tur', 'photo')
      .order('id', { ascending: false })
      .limit(80)
    const rows = await withSignedPhotoUrls(data || [])
    setFotos(rows)
  }

  const selectableStudents = ogrenciler.filter((ogrenci: Ogrenci) => !form.sinif || ogrenci.sinif === form.sinif)

  async function upload() {
    const ogrenciId = Number(form.ogrenci_id)
    if (!files.length || !Number.isFinite(ogrenciId)) return
    setUploading(true)
    try {
      for (const f of files) {
        const storagePath = photoStoragePath(okul.id, ogrenciId, f)
        const { error } = await supabase.storage.from('photos').upload(storagePath, f, {
          contentType: photoContentType(f),
          cacheControl: '3600',
          upsert: true,
        })
        if (error) throw error

        const insert = await supabase
          .from('aktiviteler')
          .insert({
            okul_id: okul.id,
            ogrenci_id: ogrenciId,
            tur: 'photo',
            tarih: today(),
            detay: { storagePath, url: null, not: form.aciklama || '', aciklama: form.aciklama || '' },
            kaydeden: 'Yönetim',
            veli_gosterilsin: true,
          })

        if (insert.error) {
          await supabase.storage.from('photos').remove([storagePath])
          throw insert.error
        }
      }
      setModal(false)
      setFiles([])
      setForm({})
      await load()
    } catch (error: any) {
      alert(error?.message || 'Fotoğraf yüklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  async function deleteFoto(id: number, storagePath?: string | null) {
    if (!confirm('Sil?')) return
    if (storagePath) {
      await supabase.storage.from('photos').remove([storagePath])
    }
    await supabase.from('aktiviteler').delete().eq('id', id)
    load()
  }

  return (
    <div>
      {viewer && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4" onClick={() => setViewer(null)}>
          {/* Fullscreen preview stays as img because it uses an arbitrary runtime URL and viewport-constrained sizing. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewer} alt="Buyuk fotograf onizleme" className="max-w-full max-h-[80vh] rounded-lg" />
          <button className="mt-4 bg-white/20 text-white px-6 py-2 rounded-lg font-semibold" onClick={() => setViewer(null)}>Kapat</button>
        </div>
      )}
      <div className="flex justify-end mb-4">
        <button onClick={() => { setFiles([]); setForm({}); setModal(true) }} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">+ Fotoğraf Ekle</button>
      </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {fotos.map(f => {
            const src = activityPhotoUrl(f)
            const student = Array.isArray(f.ogrenciler) ? f.ogrenciler[0] : f.ogrenciler
            return (
              <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer bg-[#0d160d]" onClick={() => src && setViewer(src)}>
                {src ? (
                  <Image
                    src={src}
                    alt={f.detay?.not || student?.ad_soyad || 'Okul fotoğrafı'}
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">📷</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs font-semibold">{student?.ad_soyad || 'Öğrenci'}</p>
                  <p className="text-white/80 text-xs">{f.detay?.not || f.detay?.aciklama || ''}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteFoto(f.id, getPhotoStoragePath(f.detay)) }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
              </div>
            )
          })}
        {!fotos.length && <div className="col-span-4 text-center py-16 text-[rgba(255,255,255,0.35)]">📷 Fotoğraf yok</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Fotoğraf Ekle" dark={dark}>
        <div className="p-5 space-y-3">
          <div onClick={() => document.getElementById('foto-input')?.click()}
            className="border-2 border-dashed border-[rgba(74,222,128,0.3)] rounded-xl p-6 text-center cursor-pointer hover:border-[#4ade80] transition-colors">
            <div className="text-3xl mb-2">📷</div>
            <p className="text-sm font-medium">{files.length ? files.length + ' dosya seçildi' : 'Fotoğraf Seç'}</p>
            <input id="foto-input" type="file" accept="image/*" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files || []))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Açıklama</label>
            <input value={form.aciklama || ''} onChange={e => setForm({ ...form, aciklama: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Sınıf</label>
            <select value={form.sinif || ''} onChange={e => setForm({ ...form, sinif: e.target.value, ogrenci_id: '' })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80]`}>
              <option value="">Tüm okul</option>
              {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Öğrenci</label>
            <select value={form.ogrenci_id || ''} onChange={e => setForm({ ...form, ogrenci_id: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80]`}>
              <option value="">Öğrenci seçin</option>
              {selectableStudents.map((o: Ogrenci) => <option key={o.id} value={o.id}>{o.ad_soyad}</option>)}
            </select>
          </div>
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 border-[rgba(74,222,128,0.14)]`}>
          <button onClick={() => setModal(false)} className="border border-[rgba(74,222,128,0.2)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.6)] hover:border-[rgba(74,222,128,0.4)] transition-colors">İptal</button>
          <button onClick={upload} disabled={uploading || !files.length || !form.ogrenci_id} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
            {uploading ? '⏳ Yükleniyor...' : '💾 Yükle'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── AİDAT ──
function AidatPage({ ogrenciler, okul, dark }: any) {
  const [ay, setAy] = useState(today().slice(0, 7))
  const [data, setData] = useState<any[]>([])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) load() }, [ay, okul])

  async function load() {
    const { data: d } = await supabase.from('aidatlar').select('*,ogrenciler(ad_soyad,veli_ad,veli_telefon)').eq('okul_id', okul.id).eq('ay', ay)
    setData(d || [])
  }

  async function generate() {
    const { data: mevcut } = await supabase.from('aidatlar').select('ogrenci_id').eq('okul_id', okul.id).eq('ay', ay)
    const mevcutIds = mevcut?.map(a => a.ogrenci_id) || []
    const yeni = ogrenciler.filter((o: Ogrenci) => !mevcutIds.includes(o.id))
    if (!yeni.length) { alert('Bu ay zaten oluşturulmuş!'); return }
    await supabase.from('aidatlar').insert(yeni.map((o: Ogrenci) => ({ okul_id: okul.id, ogrenci_id: o.id, ay, tutar: o.aidat_tutari || 3000, odendi: false })))
    load()
  }

  async function markOdendi(id: number, tutar: number) {
    const miktar = prompt('Ödeme miktarı (₺):', String(tutar))
    if (!miktar) return
    await supabase.from('aidatlar').update({ odendi: true, odeme_tarihi: today(), odenen_miktar: parseFloat(miktar) }).eq('id', id)
    load()
  }

  async function sendWA() {
    const bekleyenler = data.filter(a => !a.odendi)
    if (!bekleyenler.length) { alert('Tüm aidatlar ödendi!'); return }
    const msg = '🌱 *Kinderly Aidat Hatırlatması*\n\n' + bekleyenler.map(a => (a.ogrenciler as any)?.ad_soyad + ': ' + fmtM(a.tutar)).join('\n') + '\n\nLütfen ödemenizi yapınız.'
    window.open('https://wa.me/?text=' + encodeURIComponent(msg))
  }

  const toplam = data.reduce((s, a) => s + Number(a.tutar), 0)
  const odenen = data.filter(a => a.odendi).reduce((s, a) => s + Number(a.tutar), 0)

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input type="month" value={ay} onChange={e => setAy(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
        <button onClick={generate} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">📋 Ay Oluştur</button>
        <button onClick={sendWA} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">📱 WA Hatırlatma</button>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[['TOPLAM', toplam, 'text-[#4ade80]'], ['ÖDENEN', odenen, 'text-[#4ade80]'], ['BEKLEYEN', toplam - odenen, 'text-red-400']].map(([l, v, c]) => (
          <Card key={l as string} dark={dark} className="p-4 text-center">
            <div className="text-xs text-[rgba(255,255,255,0.54)] font-semibold mb-1">{l}</div>
            <div className={`text-xl font-bold ${c}`}>{fmtM(Number(v))}</div>
          </Card>
        ))}
      </div>
      <Card dark={dark}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0d160d]">
                {['Öğrenci', 'Veli', 'Tutar', 'Durum', 'Tarih', 'İşlem'].map(h => (
                  <th key={h} className={`text-left px-4 py-3 text-xs font-semibold uppercase text-[rgba(255,255,255,0.54)]`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(a => (
                <tr key={a.id} className={`border-t border-[rgba(74,222,128,0.14)]`}>
                  <td className={`px-4 py-3 text-sm font-semibold text-white`}>{(a.ogrenciler as any)?.ad_soyad || '—'}</td>
                  <td className={`px-4 py-3 text-sm text-[rgba(255,255,255,0.7)]`}>{(a.ogrenciler as any)?.veli_ad || '—'}</td>
                  <td className={`px-4 py-3 text-sm font-semibold text-white`}>{fmtM(a.tutar)}</td>
                  <td className="px-4 py-3">{a.odendi ? <span className="bg-[rgba(74,222,128,0.12)] text-[#4ade80] text-xs font-semibold px-2 py-1 rounded-full">✅ Ödendi</span> : <span className="bg-[rgba(239,68,68,0.12)] text-red-400 text-xs font-semibold px-2 py-1 rounded-full">⏳ Bekliyor</span>}</td>
                  <td className={`px-4 py-3 text-xs text-[rgba(255,255,255,0.54)]`}>{a.odeme_tarihi || '—'}</td>
                  <td className="px-4 py-3">
                    {!a.odendi
                      ? <button onClick={() => markOdendi(a.id, a.tutar)} className="bg-[#4ade80] text-black text-xs px-3 py-1.5 rounded-lg font-semibold">✓ Ödendi</button>
                      : <button onClick={async () => { await supabase.from('aidatlar').update({ odendi: false, odeme_tarihi: null }).eq('id', a.id); load() }} className="bg-[rgba(239,68,68,0.1)] text-red-400 border border-[rgba(239,68,68,0.2)] text-xs px-3 py-1.5 rounded-lg">✗ İptal</button>
                    }
                  </td>
                </tr>
              ))}
              {!data.length && <tr><td colSpan={6} className="text-center py-8 text-[rgba(255,255,255,0.35)] text-sm">Bu ay için aidat oluşturulmamış</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ── YEMEK LİSTESİ ──
function YemekListesi({ okul, dark }: any) {
  const [data, setData] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({})

  function getHaftaBasi() {
    const d = new Date(); const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff)).toISOString().split('T')[0]
  }

  const [hafta, setHafta] = useState(getHaftaBasi())

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) load() }, [hafta, okul])

  async function load() {
    const bitis = new Date(hafta); bitis.setDate(bitis.getDate() + 6)
    const { data: d } = await supabase.from('yemek_listesi').select('*').eq('okul_id', okul.id).gte('tarih', hafta).lte('tarih', bitis.toISOString().split('T')[0]).order('tarih')
    setData(d || [])
  }

  async function save() {
    if (!form.tarih) { alert('Tarih seçin!'); return }
    await supabase.from('yemek_listesi').delete().eq('okul_id', okul.id).eq('tarih', form.tarih)
    await supabase.from('yemek_listesi').insert({ okul_id: okul.id, ...form })
    setModal(false); load()
  }

  async function sendWA() {
    const gunler = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']
    let msg = '🌱 *Kinderly — Haftalık Yemek Listesi*\n\n'
    data.forEach((y, i) => { msg += `*${gunler[i] || ''} - ${y.tarih}*\n🍳 ${y.kahvalti || '—'}\n🍽️ ${y.ogle || '—'}\n🍪 ${y.ikindi || '—'}\n\n` })
    window.open('https://wa.me/?text=' + encodeURIComponent(msg))
  }

  const gunler = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']
  const rows = gunler.map((g, i) => {
    const d = new Date(hafta); d.setDate(d.getDate() + i)
    const str = d.toISOString().split('T')[0]
    return { gun: g, tarih: str, yemek: data.find(y => y.tarih === str) || {} }
  })

  return (
    <div>
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <button onClick={() => { const d = new Date(hafta); d.setDate(d.getDate() - 7); setHafta(d.toISOString().split('T')[0]) }}
          className={`border px-3 py-2 rounded-lg text-sm border-[rgba(74,222,128,0.2)] text-[rgba(255,255,255,0.7)]`}>‹</button>
        <span className={`text-sm font-medium flex-1 text-center text-white`}>{new Date(hafta).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} haftası</span>
        <button onClick={() => { const d = new Date(hafta); d.setDate(d.getDate() + 7); setHafta(d.toISOString().split('T')[0]) }}
          className={`border px-3 py-2 rounded-lg text-sm border-[rgba(74,222,128,0.2)] text-[rgba(255,255,255,0.7)]`}>›</button>
        <button onClick={sendWA} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">📱 WA</button>
      </div>
      <Card dark={dark}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0d160d]">
                {['Gün', 'Kahvaltı', 'Öğle', 'İkindi', ''].map(h => (
                  <th key={h} className={`text-left px-4 py-3 text-xs font-semibold text-[rgba(255,255,255,0.54)]`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.tarih} className={`border-t border-[rgba(74,222,128,0.14)]`}>
                  <td className="px-4 py-3">
                    <div className={`font-semibold text-sm text-white`}>{r.gun}</div>
                    <div className="text-xs text-[rgba(255,255,255,0.54)]">{r.tarih}</div>
                  </td>
                  <td className={`px-4 py-3 text-sm text-[rgba(255,255,255,0.7)]`}>{r.yemek.kahvalti || <span className="text-[rgba(255,255,255,0.35)]">—</span>}</td>
                  <td className={`px-4 py-3 text-sm text-[rgba(255,255,255,0.7)]`}>{r.yemek.ogle || <span className="text-[rgba(255,255,255,0.35)]">—</span>}</td>
                  <td className={`px-4 py-3 text-sm text-[rgba(255,255,255,0.7)]`}>{r.yemek.ikindi || <span className="text-[rgba(255,255,255,0.35)]">—</span>}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setForm({ tarih: r.tarih, kahvalti: r.yemek.kahvalti || '', ogle: r.yemek.ogle || '', ikindi: r.yemek.ikindi || '' }); setModal(true) }}
                      className="text-xs border border-[rgba(74,222,128,0.2)] px-2 py-1 rounded text-[rgba(255,255,255,0.7)] hover:border-[#4ade80] hover:text-[#4ade80] transition-colors">✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={`Yemek — ${form.tarih}`} dark={dark}>
        <div className="p-5 space-y-3">
          {[['kahvalti','🍳 Kahvaltı'],['ogle','🍽️ Öğle'],['ikindi','🍪 İkindi']].map(([k,l]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">{l}</label>
              <input value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
            </div>
          ))}
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 border-[rgba(74,222,128,0.14)]`}>
          <button onClick={() => setModal(false)} className="border border-[rgba(74,222,128,0.2)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.6)] hover:border-[rgba(74,222,128,0.4)] transition-colors">İptal</button>
          <button onClick={save} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">Kaydet</button>
        </div>
      </Modal>
    </div>
  )
}

// ── PERSONEL ──
function Personel({ siniflar, okul, dark }: any) {
  const [data, setData] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ rol: 'ogretmen' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) load() }, [okul])
  async function load() { const { data: d } = await supabase.from('personel').select('*').eq('okul_id', okul.id).eq('aktif', true).order('ad_soyad'); setData(d || []) }

  async function save() {
    if (!form.ad_soyad?.trim()) { setSaveError('Ad soyad zorunludur.'); return }
    if (!form.email?.trim()) { setSaveError('E-posta zorunludur.'); return }
    setSaving(true)
    setSaveError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/personel-ekle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          okul_id: okul.id,
          ad_soyad: form.ad_soyad,
          email: form.email,
          telefon: form.telefon || '',
          rol: form.rol || 'ogretmen',
          sinif: form.sinif || '',
        }),
      })
      const json = await res.json()
      if (!res.ok) { setSaveError(json.error || 'Personel eklenemedi.'); return }
      setModal(false)
      setForm({ rol: 'ogretmen' })
      setSuccessMsg(json.message || `${form.ad_soyad} başarıyla eklendi. Davet e-postası gönderildi.`)
      load()
    } catch {
      setSaveError('Bağlantı hatası. Tekrar deneyin.')
    } finally {
      setSaving(false)
    }
  }

  async function del(id: number) {
    if (!confirm('Silmek istediğinizden emin misiniz?')) return
    await supabase.from('personel').update({ aktif: false }).eq('id', id); load()
  }

  const ROL: Record<string, string> = { ogretmen: 'Öğretmen', mudur: 'Müdür', yardimci: 'Yardımcı' }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm({ rol: 'ogretmen' }); setSaveError(null); setModal(true) }} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">+ Personel Ekle</button>
      </div>

      {successMsg && (
        <div className="mb-4 rounded-xl border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.06)] p-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#4ade80]">✅ {successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="text-[rgba(255,255,255,0.35)] hover:text-white text-lg leading-none">×</button>
        </div>
      )}

      <Card dark={dark}>
        <div className="divide-y divide-[rgba(74,222,128,0.08)]">
          {data.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-[rgba(74,222,128,0.12)] text-[#4ade80] flex items-center justify-center font-bold text-sm flex-shrink-0">
                {p.ad_soyad.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-white">{p.ad_soyad}</div>
                <div className="text-xs text-[rgba(255,255,255,0.54)]">{ROL[p.rol] || p.rol}{p.sinif ? ' · ' + p.sinif : ''} {p.telefon ? '· ' + p.telefon : ''}</div>
              </div>
              <button onClick={() => del(p.id)} className="text-xs text-red-400 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] px-2 py-1 rounded">🗑</button>
            </div>
          ))}
          {!data.length && <div className="text-center py-16 text-[rgba(255,255,255,0.35)]">👨‍🏫 Personel yok</div>}
        </div>
      </Card>

      <Modal open={modal} onClose={() => { setModal(false); setSaveError(null) }} title="Personel Ekle" dark={dark}>
        <div className="p-5 space-y-3">
          {[['Ad Soyad *','ad_soyad','text'],['E-posta *','email','email'],['Telefon','telefon','text']].map(([l,k,t]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">{l}</label>
              <input
                type={t}
                value={form[k] || ''}
                onChange={e => { setForm({ ...form, [k]: e.target.value }); setSaveError(null) }}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Rol</label>
            <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80]">
              <option value="ogretmen">Öğretmen</option>
              <option value="mudur">Müdür</option>
              <option value="yardimci">Yardımcı</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Sınıf</label>
            <select value={form.sinif || ''} onChange={e => setForm({ ...form, sinif: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80]">
              <option value="">—</option>
              {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
            </select>
          </div>
          <p className="text-xs text-[rgba(255,255,255,0.35)]">Güçlü geçici şifre otomatik oluşturulur ve personele e-posta ile gönderilir.</p>
        </div>
        {saveError && (
          <div className="px-5 pb-3">
            <p className="text-sm text-red-400 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-lg px-3 py-2">{saveError}</p>
          </div>
        )}
        <div className="px-5 py-4 border-t border-[rgba(74,222,128,0.14)] flex justify-end gap-2">
          <button onClick={() => { setModal(false); setSaveError(null) }} disabled={saving} className="border border-[rgba(74,222,128,0.2)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.6)] hover:border-[rgba(74,222,128,0.4)] transition-colors disabled:opacity-50">İptal</button>
          <button onClick={save} disabled={saving} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 min-w-[80px]">
            {saving ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── SERVİS ──
function ServisPage({ ogrenciler, siniflar, okul, dark }: any) {
  const [tarih, setTarih] = useState(today())
  const [sinifFilter, setSinifFilter] = useState('')
  const [state, setState] = useState<Record<number, string>>({})

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) load() }, [tarih, okul])

  async function load() {
    const { data } = await supabase.from('servis').select('ogrenci_id,durum').eq('okul_id', okul.id).eq('tarih', tarih)
    const s: Record<number, string> = {}
    data?.forEach(y => s[y.ogrenci_id] = y.durum)
    setState(s)
  }

  async function save() {
    await supabase.from('servis').delete().eq('okul_id', okul.id).eq('tarih', tarih)
    const rows = Object.entries(state).map(([id, durum]) => ({ okul_id: okul.id, ogrenci_id: parseInt(id), tarih, durum }))
    if (rows.length) await supabase.from('servis').insert(rows)
    alert('Servis kaydedildi ✓')
  }

  function sendWA() {
    const bindi = ogrenciler.filter((o: Ogrenci) => state[o.id] === 'bindi').map((o: Ogrenci) => o.ad_soyad.split(' ')[0])
    const indi = ogrenciler.filter((o: Ogrenci) => state[o.id] === 'indi').map((o: Ogrenci) => o.ad_soyad.split(' ')[0])
    const msg = `🚌 *Kinderly Servis — ${tarih}*\n\n✅ Bindi (${bindi.length}): ${bindi.join(', ') || '—'}\n🏠 İndi (${indi.length}): ${indi.join(', ') || '—'}`
    window.open('https://wa.me/?text=' + encodeURIComponent(msg))
  }

  const filtered = sinifFilter ? ogrenciler.filter((o: Ogrenci) => o.sinif === sinifFilter) : ogrenciler
  const counts = { bindi: Object.values(state).filter(v => v === 'bindi').length, indi: Object.values(state).filter(v => v === 'indi').length }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
        <select value={sinifFilter} onChange={e => setSinifFilter(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80]`}>
          <option value="">Tüm Sınıflar</option>
          {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
        </select>
        <button onClick={sendWA} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">📱 WA</button>
        <button onClick={save} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">💾 Kaydet</button>
        <div className="ml-auto flex gap-4 text-sm font-semibold">
          <span className="text-[#4ade80]">🚌 {counts.bindi} Bindi</span>
          <span className="text-orange-500">🏠 {counts.indi} İndi</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((o: Ogrenci) => {
          const d = state[o.id] || ''
          return (
            <div key={o.id} className={`border-2 rounded-xl p-3 text-center transition-all ${d === 'bindi' ? 'border-[rgba(74,222,128,0.5)] bg-[rgba(74,222,128,0.08)]' : d === 'indi' ? 'border-orange-400/50 bg-orange-400/10' : 'border-[rgba(74,222,128,0.14)] bg-[#0b120b]'}`}>
              <div className="text-2xl mb-1">🌸</div>
              <div className="text-xs font-semibold mb-2 text-white">{o.ad_soyad.split(' ')[0]}</div>
              <div className="flex gap-1 justify-center">
                {[['bindi','🚌 Bindi','bg-[#4ade80] text-black'],['indi','🏠 İndi','bg-orange-400 text-white']].map(([val,label,color]) => (
                  <button key={val} onClick={() => setState(s => ({ ...s, [o.id]: val }))}
                    className={`text-xs px-2 py-1 rounded font-bold transition-all ${d === val ? color : 'bg-[#0d160d] text-[rgba(255,255,255,0.54)]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MESAJLAR ──
function MesajlarPage({ ogrenciler, okul, dark }: any) {
  const [mesajlar, setMesajlar] = useState<any[]>([])
  const [selected, setSelected] = useState<Ogrenci | null>(null)
  const [icerik, setIcerik] = useState('')
  const [thread, setThread] = useState<any[]>([])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) loadMesajlar() }, [okul])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (selected && okul) loadThread() }, [selected])

  async function loadMesajlar() {
    const { data } = await supabase.from('mesajlar').select('*,ogrenciler(ad_soyad)').eq('okul_id', okul.id).order('olusturuldu', { ascending: false }).limit(50)
    setMesajlar(data || [])
  }

  async function loadThread() {
    if (!selected) return
    const { data } = await supabase.from('mesajlar').select('*').eq('okul_id', okul.id).or(`alici_id.eq.${selected.id},gonderen_id.eq.${selected.id}`).order('olusturuldu')
    setThread(data || [])
    await supabase.from('mesajlar').update({ okundu: true }).eq('okul_id', okul.id).eq('gonderen_id', selected.id).eq('okundu', false)
  }

  async function send() {
    if (!icerik.trim() || !selected) return
    await supabase.from('mesajlar').insert({ okul_id: okul.id, gonderen_tip: 'okul', gonderen_id: okul.id, alici_tip: 'veli', alici_id: selected.id, icerik, okundu: false, olusturuldu: new Date().toISOString() })
    setIcerik(''); loadThread()
  }

  const unread = mesajlar.filter(m => !m.okundu && m.gonderen_tip === 'veli').length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      <Card dark={dark} className="flex flex-col overflow-hidden">
        <div className={`px-4 py-3 border-b font-semibold text-sm flex items-center justify-between border-[rgba(74,222,128,0.14)] text-white`}>
          💬 Mesajlar
          {unread > 0 && <span className="bg-[rgba(239,68,68,0.12)] text-red-400 text-xs px-2 py-0.5 rounded-full border border-[rgba(239,68,68,0.2)]">{unread}</span>}
        </div>
        <div className="flex-1 overflow-y-auto">
          {ogrenciler.map((o: Ogrenci) => {
            const unreadCount = mesajlar.filter(m => m.gonderen_id === o.id && !m.okundu).length
            return (
              <div key={o.id} onClick={() => setSelected(o)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-[rgba(74,222,128,0.08)] ${selected?.id === o.id ? 'bg-[rgba(74,222,128,0.08)]' : 'hover:bg-[#0d160d]'} transition-colors`}>
                <div className="w-9 h-9 rounded-full bg-[rgba(74,222,128,0.12)] flex items-center justify-center text-lg flex-shrink-0">🌸</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{o.ad_soyad.split(' ')[0]}</div>
                  <div className="text-xs text-[rgba(255,255,255,0.54)]">{o.veli_ad || ''}</div>
                </div>
                {unreadCount > 0 && <span className="bg-[#4ade80] text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{unreadCount}</span>}
              </div>
            )
          })}
        </div>
      </Card>

      <Card dark={dark} className="lg:col-span-2 flex flex-col overflow-hidden">
        {selected ? <>
          <div className={`px-4 py-3 border-b flex items-center gap-3 border-[rgba(74,222,128,0.14)]`}>
            <div className="w-9 h-9 rounded-full bg-[rgba(74,222,128,0.12)] flex items-center justify-center text-lg">🌸</div>
            <div>
              <div className={`font-semibold text-sm text-white`}>{selected.ad_soyad}</div>
              <div className="text-xs text-[rgba(255,255,255,0.54)]">{selected.veli_ad}</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {thread.map(m => (
              <div key={m.id} className={`flex ${m.gonderen_tip === 'okul' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${m.gonderen_tip === 'okul' ? 'bg-[#4ade80] text-black rounded-br-sm' : 'bg-[#0d160d] text-white rounded-bl-sm border border-[rgba(74,222,128,0.14)]'}`}>
                  {m.icerik}
                  <div className={`text-xs mt-1 ${m.gonderen_tip === 'okul' ? 'text-black/60' : 'text-[rgba(255,255,255,0.54)]'}`}>{new Date(m.olusturuldu).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
            {!thread.length && <div className="text-center py-8 text-[rgba(255,255,255,0.35)] text-sm">Henüz mesaj yok</div>}
          </div>
          <div className={`p-3 border-t flex gap-2 border-[rgba(74,222,128,0.14)]`}>
            <input value={icerik} onChange={e => setIcerik(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Mesaj yaz..."
              className={`flex-1 border rounded-xl px-4 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
            <button onClick={send} className="bg-[#4ade80] text-black px-4 py-2 rounded-xl text-sm font-semibold">➤</button>
          </div>
        </> : (
          <div className="flex-1 flex items-center justify-center text-[rgba(255,255,255,0.35)]">
            <div className="text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm">Bir öğrenci seçin</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── DUYURULAR ──
function Duyurular({ okul, dark }: any) {
  const [data, setData] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({})

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) load() }, [okul])
  async function load() { const { data: d } = await supabase.from('duyurular').select('*').eq('okul_id', okul.id).order('tarih', { ascending: false }); setData(d || []) }

  async function save() {
    if (!form.baslik || !form.icerik) { alert('Başlık ve içerik zorunlu!'); return }
    await supabase.from('duyurular').insert({ okul_id: okul.id, ...form, tarih: form.tarih || today() })
    setModal(false); setForm({}); load()
  }

  async function del(id: number) { if (!confirm('Sil?')) return; await supabase.from('duyurular').delete().eq('id', id); load() }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm({}); setModal(true) }} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">+ Duyuru Ekle</button>
      </div>
      <div className="space-y-3">
        {data.map(d => (
          <div key={d.id} className={`rounded-lg border p-4 ${d.onemli ? 'border-l-4 border-l-red-400 border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)]' : 'border-[rgba(74,222,128,0.14)] bg-[#0b120b]'}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm text-white">{d.onemli ? '⚠️ ' : ''}{d.baslik}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[rgba(255,255,255,0.54)]">{d.tarih}</span>
                <button onClick={() => del(d.id)} className="text-xs text-red-400 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] px-2 py-1 rounded">🗑</button>
              </div>
            </div>
            <p className="text-sm text-[rgba(255,255,255,0.54)]">{d.icerik}</p>
          </div>
        ))}
        {!data.length && <div className="text-center py-16 text-[rgba(255,255,255,0.35)]">📢 Duyuru yok</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Duyuru Ekle" dark={dark}>
        <div className="p-5 space-y-3">
          {[['Başlık *','baslik'],['İçerik *','icerik'],['Tarih','tarih']].map(([l,k]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">{l}</label>
              {k === 'icerik'
                ? <textarea value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} rows={4} />
                : <input type={k === 'tarih' ? 'date' : 'text'} value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
              }
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="onemli" checked={form.onemli || false} onChange={e => setForm({ ...form, onemli: e.target.checked })} />
            <label htmlFor="onemli" className={`text-sm font-medium text-white`}>⚠️ Önemli</label>
          </div>
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 border-[rgba(74,222,128,0.14)]`}>
          <button onClick={() => setModal(false)} className="border border-[rgba(74,222,128,0.2)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.6)] hover:border-[rgba(74,222,128,0.4)] transition-colors">İptal</button>
          <button onClick={save} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">Yayınla</button>
        </div>
      </Modal>
    </div>
  )
}

// ── ETKİNLİKLER ──
function Etkinlikler({ siniflar, okul, dark }: any) {
  const [data, setData] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({})

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) load() }, [okul])
  async function load() { const { data: d } = await supabase.from('etkinlikler').select('*').eq('okul_id', okul.id).order('tarih'); setData(d || []) }

  async function save() {
    if (!form.baslik || !form.tarih) { alert('Başlık ve tarih zorunlu!'); return }
    await supabase.from('etkinlikler').insert({ okul_id: okul.id, ...form })
    setModal(false); setForm({}); load()
  }

  async function del(id: number) { if (!confirm('Sil?')) return; await supabase.from('etkinlikler').delete().eq('id', id); load() }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm({}); setModal(true) }} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">+ Etkinlik Ekle</button>
      </div>
      <div className="space-y-3">
        {data.map(e => {
          const d = new Date(e.tarih); const gecti = d < new Date()
          return (
            <div key={e.id} className={`rounded-lg border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-4 flex items-center gap-4 ${gecti ? 'opacity-50' : ''}`}>
              <div className={`${gecti ? 'bg-[rgba(255,255,255,0.1)]' : 'bg-[#4ade80]'} ${gecti ? 'text-white' : 'text-black'} rounded-xl p-3 text-center min-w-12 flex-shrink-0`}>
                <div className="text-xl font-bold leading-none">{d.getDate()}</div>
                <div className="text-xs opacity-70">{d.toLocaleDateString('tr-TR', { month: 'short' })}</div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-white">{e.baslik}</h3>
                <p className="text-xs text-[rgba(255,255,255,0.54)]">{e.aciklama || ''} {e.hedef_kitle ? '· ' + e.hedef_kitle : ''}</p>
              </div>
              <button onClick={() => del(e.id)} className="text-xs text-red-400 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] px-2 py-1.5 rounded">🗑</button>
            </div>
          )
        })}
        {!data.length && <div className="text-center py-16 text-[rgba(255,255,255,0.35)]">📅 Etkinlik yok</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Etkinlik Ekle" dark={dark}>
        <div className="p-5 space-y-3">
          {[['Etkinlik Adı *','baslik'],['Tarih *','tarih'],['Açıklama','aciklama']].map(([l,k]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">{l}</label>
              <input type={k === 'tarih' ? 'date' : 'text'} value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">Hedef Kitle</label>
            <select value={form.hedef_kitle || ''} onChange={e => setForm({ ...form, hedef_kitle: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80]`}>
              <option value="Tüm öğrenciler">Tüm öğrenciler</option>
              <option value="Veliler">Veliler</option>
              {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
            </select>
          </div>
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 border-[rgba(74,222,128,0.14)]`}>
          <button onClick={() => setModal(false)} className="border border-[rgba(74,222,128,0.2)] px-4 py-2 rounded-lg text-sm text-[rgba(255,255,255,0.6)] hover:border-[rgba(74,222,128,0.4)] transition-colors">İptal</button>
          <button onClick={save} className="bg-[#4ade80] text-black px-4 py-2 rounded-lg text-sm font-semibold">Kaydet</button>
        </div>
      </Modal>
    </div>
  )
}

// ── OKUL AYARLARI ──
function OkulAyarlari({ okul, dark, setOkul }: any) {
  const [form, setForm] = useState<any>({})
  const [saved, setSaved] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => { if (okul) setForm({ ...okul }) }, [okul])

  async function save() {
    await supabase.from('okullar').update({ ad: form.ad, telefon: form.telefon, adres: form.adres, logo_url: form.logo_url || null }).eq('id', okul.id)
    setOkul({ ...okul, ...form })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogoUpload(file?: File | null) {
    if (!file) return
    setUploadingLogo(true)
    try {
      const storagePath = `${okul.id}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
      const { error } = await supabase.storage.from('logos').upload(storagePath, file, {
        contentType: file.type || 'image/png',
        upsert: true,
      })

      if (error) {
        console.error('Logo yükleme hatası:', error.message)
        alert(`Logo yüklenemedi: ${error.message}`)
      } else {
        const { data } = supabase.storage.from('logos').getPublicUrl(storagePath)
        const newLogoUrl = data.publicUrl
        setForm((prev: any) => ({ ...prev, logo_url: newLogoUrl }))
        setOkul({ ...okul, logo_url: newLogoUrl })
        await supabase.from('okullar').update({ logo_url: newLogoUrl }).eq('id', okul.id)
      }
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="max-w-lg">
      <Card dark={dark} className="p-6 space-y-4">
        <h3 className={`font-semibold text-base mb-4 text-white`}>⚙️ Okul Bilgileri</h3>
        <div>
          <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-2">Okul Logosu</label>
          <div className="flex items-center gap-3">
            {form.logo_url ? (
              <img src={form.logo_url} alt={form.ad || 'Logo'} className="h-16 w-16 rounded-2xl object-cover border border-[rgba(74,222,128,0.14)]" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-[rgba(74,222,128,0.12)] flex items-center justify-center text-[#4ade80] font-bold">
                {(form.ad || 'Kinderly').split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <input type="file" accept="image/*" onChange={e => handleLogoUpload(e.target.files?.[0] ?? null)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white focus:border-[#4ade80] file:bg-[rgba(74,222,128,0.1)] file:text-[#4ade80] file:border-0 file:rounded file:px-2 file:py-1 file:text-xs" />
          </div>
          <p className="mt-2 text-xs text-[rgba(255,255,255,0.54)]">{uploadingLogo ? 'Logo yükleniyor...' : 'Bucket: logos'}</p>
        </div>
        {[['Okul Adı','ad'],['Telefon','telefon'],['Adres','adres']].map(([l,k]) => (
          <div key={k}>
            <label className="block text-xs font-semibold text-[rgba(255,255,255,0.54)] mb-1">{l}</label>
            <input value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-[#0d160d] border-[rgba(74,222,128,0.14)] text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]`} />
          </div>
        ))}
        <button onClick={save} className="w-full bg-[#4ade80] text-black py-3 rounded-lg text-sm font-semibold">
          {saved ? '✅ Kaydedildi!' : 'Kaydet'}
        </button>
      </Card>
    </div>
  )
}
