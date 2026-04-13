'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import { ThemeToggle } from '@/components/theme-toggle'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { rolePath } from '@/lib/auth-helpers'
import { Ogrenci, Sinif, Okul } from '@/lib/types'

export default function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { session, role, okul: authOkul, loading, signOut } = useAuth()
  const { resolvedTheme } = useTheme()
  const [slug, setSlug] = useState('')
  const [okul, setOkul] = useState<Okul | null>(null)
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [siniflar, setSiniflar] = useState<Sinif[]>([])
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authTimeout, setAuthTimeout] = useState(false)
  const dark = resolvedTheme === 'dark'

  async function loadAll(okulId: number) {
    const [{ data: ogr }, { data: sinif }] = await Promise.all([
      supabase.from('ogrenciler').select('*').eq('okul_id', okulId).eq('aktif', true).order('ad_soyad'),
      supabase.from('siniflar').select('*').eq('okul_id', okulId).order('ad'),
    ])
    if (ogr) setOgrenciler(ogr)
    if (sinif) setSiniflar(sinif)
  }

  useEffect(() => { params.then(p => setSlug(p.slug)) }, [params])

  useEffect(() => {
    if (!loading) {
      setAuthTimeout(false)
      return
    }
    const timeout = window.setTimeout(() => setAuthTimeout(true), 10000)
    return () => window.clearTimeout(timeout)
  }, [loading])

  useEffect(() => {
    if (!authTimeout || session) return
    router.replace(`/giris?redirect=${encodeURIComponent(`/${slug}/admin`)}`)
  }, [authTimeout, router, session, slug])

  useEffect(() => {
    if (loading || !slug) return

    if (!session || !authOkul) {
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

    setOkul(authOkul as Okul)
    loadAll(Number(authOkul.id))
  }, [authOkul, loading, role, router, session, slug])

  if (loading || !session || !okul) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--muted-text)]">
        {authTimeout ? 'Oturum doğrulanamadı, giriş ekranına yönlendiriliyor...' : 'Panel hazırlanıyor...'}
      </div>
    )
  }

  const navItems = [
    { id: 'dashboard', icon: 'AP', label: 'Ana Panel' },
    { id: 'ogrenciler', icon: 'Ö', label: 'Öğrenciler' },
    { id: 'siniflar', icon: 'S', label: 'Sınıflar' },
    { id: 'yoklama', icon: 'Y', label: 'Yoklama' },
    { id: 'aktivite', icon: 'A', label: 'Aktiviteler' },
    { id: 'gunluk', icon: 'GR', label: 'Günlük Rapor' },
    { id: 'gelisim', icon: 'G', label: 'Gelişim' },
    { id: 'fotograflar', icon: 'F', label: 'Fotoğraflar' },
    { id: 'aidat', icon: 'ÖD', label: 'Aidat' },
    { id: 'yemek', icon: 'YL', label: 'Yemek Listesi' },
    { id: 'personel', icon: 'P', label: 'Personel' },
    { id: 'servis', icon: 'SV', label: 'Servis' },
    { id: 'mesajlar', icon: 'M', label: 'Mesajlar' },
    { id: 'duyurular', icon: 'D', label: 'Duyurular' },
    { id: 'etkinlikler', icon: 'E', label: 'Etkinlikler' },
    { id: 'ayarlar', icon: 'AY', label: 'Okul Ayarları' },
  ]

  return (
    <div className={`flex min-h-screen ${dark ? 'bg-[var(--bg)] text-[var(--text)]' : 'bg-[#fafafa] text-gray-900'}`}>
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed top-0 left-0 h-full w-60 z-50 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 border-r shadow-sm ${dark ? 'bg-[#0d1117] border-[#2a2f36]' : 'bg-white border-gray-200'}`}>
        <div className={`p-4 border-b flex items-center gap-3 ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
          {okul?.logo_url ? (
            <img src={okul.logo_url} alt={okul.ad} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center text-sm font-bold text-white">
              {(okul?.ad || 'Kinderly').split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{okul?.ad || 'Kinderly'}</div>
            <div className="text-xs text-gray-500">Yönetim Paneli</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setActivePage(item.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all border-l-2 ${activePage === item.id
                ? dark
                  ? 'bg-[#1f242d] text-white border-l-green-500'
                  : 'bg-green-50 text-green-700 border-l-green-600'
                : dark
                  ? 'border-l-transparent text-gray-200 hover:bg-[#161b22]'
                  : 'border-l-transparent text-gray-600 hover:bg-gray-50'}`}>
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-semibold ${dark ? 'bg-[#161b22] text-gray-200' : 'bg-gray-100 text-gray-500'}`}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className={`p-3 border-t ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
          <button onClick={async () => { await signOut(); router.replace('/giris') }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${dark ? 'text-gray-400 hover:bg-[#161b22]' : 'text-gray-500 hover:bg-gray-50'}`}>
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <header className={`px-4 h-14 flex items-center justify-between sticky top-0 z-30 border-b shadow-sm ${dark ? 'bg-[#0d1117] border-[#2a2f36]' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 text-xl">☰</button>
            <h1 className={`text-base font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{navItems.find(n => n.id === activePage)?.label}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => setActivePage('yoklama')} className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Yoklama Al</button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {activePage === 'dashboard' && <Dashboard okul={okul} ogrenciler={ogrenciler} dark={dark} setActivePage={setActivePage} />}
          {activePage === 'ogrenciler' && <Ogrenciler ogrenciler={ogrenciler} siniflar={siniflar} okul={okul} dark={dark} reload={() => loadAll(okul!.id)} />}
          {activePage === 'siniflar' && <Siniflar siniflar={siniflar} ogrenciler={ogrenciler} okul={okul} dark={dark} reload={() => loadAll(okul!.id)} />}
          {activePage === 'yoklama' && <Yoklama ogrenciler={ogrenciler} siniflar={siniflar} okul={okul} dark={dark} />}
          {activePage === 'aktivite' && <AktivitePage ogrenciler={ogrenciler} okul={okul} dark={dark} />}
          {activePage === 'gunluk' && <GunlukRaporPage ogrenciler={ogrenciler} siniflar={siniflar} okul={okul} dark={dark} />}
          {activePage === 'gelisim' && <GelisimPage ogrenciler={ogrenciler} okul={okul} dark={dark} />}
          {activePage === 'fotograflar' && <Fotograflar siniflar={siniflar} okul={okul} dark={dark} />}
          {activePage === 'aidat' && <AidatPage ogrenciler={ogrenciler} okul={okul} dark={dark} />}
          {activePage === 'yemek' && <YemekListesi okul={okul} dark={dark} />}
          {activePage === 'personel' && <Personel siniflar={siniflar} okul={okul} dark={dark} />}
          {activePage === 'servis' && <ServisPage ogrenciler={ogrenciler} siniflar={siniflar} okul={okul} dark={dark} />}
          {activePage === 'mesajlar' && <MesajlarPage ogrenciler={ogrenciler} okul={okul} dark={dark} />}
          {activePage === 'duyurular' && <Duyurular okul={okul} dark={dark} />}
          {activePage === 'etkinlikler' && <Etkinlikler siniflar={siniflar} okul={okul} dark={dark} />}
          {activePage === 'ayarlar' && <OkulAyarlari okul={okul} dark={dark} setOkul={setOkul} />}
        </main>
      </div>
    </div>
  )
}

// ── YARDIMCI ──
function Card({ children, dark, className = '' }: any) {
  return <div className={`rounded-xl border shadow-sm overflow-hidden ${dark ? 'border-[#2a2f36] bg-[#161b22]' : 'border-gray-200 bg-white'} ${className}`}>{children}</div>
}

function Modal({ open, onClose, title, children, dark }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className={`rounded-xl w-full max-w-lg max-h-screen overflow-y-auto border shadow-sm ${dark ? 'bg-[#161b22] border-[#2a2f36]' : 'bg-white border-gray-200'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
          <h3 className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
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
  { id: 'kudos', label: 'Tebrik', emoji: '⭐', color: '#9c27b0' },
  { id: 'meds', label: 'İlaç', emoji: '💊', color: '#f5a623' },
  { id: 'incident', label: 'Kaza', emoji: '🩹', color: '#f44336' },
  { id: 'health', label: 'Sağlık', emoji: '🌡️', color: '#7c4dff' },
  { id: 'note', label: 'Not', emoji: '📝', color: '#00897b' },
  { id: 'absence', label: 'Devamsızlık', emoji: '📅', color: '#9e9e9e' },
]

function today() { return new Date().toISOString().split('T')[0] }
function fmtM(n: number) { return '₺' + (Number(n) || 0).toLocaleString('tr-TR') }

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
          <h2 className="text-xl font-bold text-gray-900">Hoş Geldiniz</h2>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {alerjili.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-sm text-red-600">Alerjisi Olan Öğrenciler ({alerjili.length})</p>
            <p className="text-xs text-gray-500">{alerjili.map((o: Ogrenci) => o.ad_soyad.split(' ')[0] + ': ' + o.alerjiler).join(' · ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { icon: 'Ö', label: 'Toplam Öğrenci', value: ogrenciler.length, color: 'text-green-700', page: 'ogrenciler' },
          { icon: 'Y', label: 'Bugün Geldi', value: stats.geldi, color: 'text-green-700', page: 'yoklama' },
          { icon: 'A', label: 'Geciken Aidat', value: stats.aidatKisi + ' kişi', color: 'text-green-700', page: 'aidat' },
          { icon: 'E', label: 'Yaklaşan Etkinlik', value: stats.etkinlik, color: 'text-green-700', page: 'etkinlikler' },
        ].map(w => (
          <div key={w.label} onClick={() => setActivePage(w.page)}
            className="rounded-xl p-4 border border-gray-200 bg-white cursor-pointer hover:shadow-sm transition-shadow">
            <div className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-green-50 px-2 text-xs font-semibold text-green-700 mb-2">{w.icon}</div>
            <div className="text-xs text-gray-500 font-medium mb-1">{w.label}</div>
            <div className={`text-2xl font-bold ${w.color}`}>{w.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card dark={dark}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900">Yaklaşan Etkinlikler</h3>
            <button onClick={() => setActivePage('etkinlikler')} className="text-xs text-green-700 font-medium">Tümü</button>
          </div>
          <div className="p-4">
            {events.length ? events.map(e => {
              const d = new Date(e.tarih)
              return <div key={e.id} className="flex items-center gap-3 py-2 border-b last:border-0 border-gray-50">
                <div className="bg-green-600 text-white rounded-lg px-2 py-1 text-center min-w-10 flex-shrink-0">
                  <div className="text-base font-bold leading-none">{d.getDate()}</div>
                  <div className="text-xs opacity-80">{d.toLocaleDateString('tr-TR', { month: 'short' })}</div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{e.baslik}</p>
                  <p className="text-xs text-gray-500">{e.hedef_kitle || ''}</p>
                </div>
              </div>
            }) : <p className="text-sm text-gray-400">Yaklaşan etkinlik yok</p>}
          </div>
        </Card>

        <Card dark={dark}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900">Geciken Aidatlar</h3>
            <button onClick={() => setActivePage('aidat')} className="text-xs text-green-700 font-medium">Tümü</button>
          </div>
          <div className="p-4">
            {debts.length ? debts.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 text-sm border-gray-50">
                <span className="font-medium text-gray-900">{(a.ogrenciler as any)?.ad_soyad || '—'}</span>
                <span className="text-red-500 font-semibold">{fmtM(a.tutar)}</span>
              </div>
            )) : <p className="text-sm text-green-700 font-semibold">✅ Tüm aidatlar ödendi!</p>}
          </div>
        </Card>

        <Card dark={dark}>
          <div className={`px-4 py-3 border-b ${dark ? 'border-[#2a2f36]' : 'border-gray-100'}`}>
            <h3 className={`font-semibold text-sm ${dark ? 'text-white' : ''}`}>⚡ Son Aktiviteler</h3>
          </div>
          <div className="p-4">
            {activities.length ? activities.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 py-2 border-b last:border-0 text-sm ${dark ? 'border-[#2a2f36]' : 'border-gray-50'}`}>
                <span>{AKT_E[a.tur] || '📋'}</span>
                <span className={`flex-1 font-medium ${dark ? 'text-white' : ''}`}>{(a.ogrenciler as any)?.ad_soyad || '—'}</span>
                <span className="text-gray-400 text-xs">{a.tarih}</span>
              </div>
            )) : <p className="text-sm text-gray-400">Aktivite yok</p>}
          </div>
        </Card>

        <Card dark={dark}>
          <div className={`px-4 py-3 border-b ${dark ? 'border-[#2a2f36]' : 'border-gray-100'}`}>
            <h3 className={`font-semibold text-sm ${dark ? 'text-white' : ''}`}>🎂 Bu Hafta Doğum Günleri</h3>
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
                <div key={o.id} className={`flex items-center gap-3 py-2 border-b last:border-0 ${dark ? 'border-[#2a2f36]' : 'border-gray-50'}`}>
                  <span className="text-xl">🎂</span>
                  <span className={`flex-1 text-sm font-medium ${dark ? 'text-white' : ''}`}>{o.ad_soyad}</span>
                  <span className="text-xs text-orange-500 font-semibold">{diff === 0 ? '🎉 Bugün!' : diff + ' gün'}</span>
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
            }) && <p className="text-sm text-gray-400">Bu hafta doğum günü yok</p>}
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
      const data = { ...form, okul_id: okul.id, aktif: true }
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
          className={`flex-1 min-w-48 border rounded-lg px-3 py-2 text-sm outline-none focus:border-green-600 ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
        <select value={sinifFilter} onChange={e => setSinifFilter(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
          <option value="">Tüm Sınıflar</option>
          {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
        </select>
        <button onClick={exportCSV} className={`border px-4 py-2 rounded-lg text-sm font-semibold ${dark ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-600'}`}>📥 CSV</button>
        <button onClick={openAdd} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Ekle</button>
      </div>

      <Card dark={dark}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={dark ? 'bg-[#1f242d]' : 'bg-gray-50'}>
                {['Öğrenci', 'Sınıf', 'Veli', 'Telefon', 'Alerji', 'İşlem'].map(h => (
                  <th key={h} className={`text-left px-4 py-3 text-xs font-semibold uppercase ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o: Ogrenci) => (
                <tr key={o.id} className={`border-t ${dark ? 'border-[#2a2f36] hover:bg-[#1f242d]' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <div className={`font-semibold text-sm ${dark ? 'text-white' : ''}`}>{o.ad_soyad}</div>
                    {o.alerjiler && <div className="text-xs text-red-500 font-semibold">🚨 {o.alerjiler}</div>}
                  </td>
                  <td className="px-4 py-3"><span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">{o.sinif || '—'}</span></td>
                  <td className={`px-4 py-3 text-sm ${dark ? 'text-gray-200' : 'text-gray-600'}`}>{o.veli_ad || '—'}</td>
                  <td className={`px-4 py-3 text-sm ${dark ? 'text-gray-200' : 'text-gray-600'}`}>{o.veli_telefon || '—'}</td>
                  <td className="px-4 py-3">{o.alerjiler ? <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded-full">⚠️ Var</span> : <span className="text-gray-400 text-xs">Yok</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(o)} className="text-xs border border-gray-300 px-2 py-1 rounded hover:border-green-600 hover:text-green-700">✏️</button>
                      <button onClick={() => deleteOgr(o.id)} className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-1 rounded">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">Öğrenci bulunamadı</td></tr>}
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
              <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
              <input type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-green-600 ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Sınıf</label>
            <select value={form.sinif || ''} onChange={e => setForm({ ...form, sinif: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
              <option value="">— Seçin —</option>
              {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Kan Grubu</label>
            <select value={form.kan_grubu || ''} onChange={e => setForm({ ...form, kan_grubu: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
              {['—', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        {saveError && (
          <div className="px-5 pb-3">
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
          </div>
        )}
        <div className={`px-5 py-4 border-t flex justify-end gap-2 ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
          <button onClick={() => setModal(false)} disabled={saving} className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600 disabled:opacity-50">İptal</button>
          <button onClick={save} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 min-w-[80px]">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── SINIFLAR ──
function Siniflar({ siniflar, ogrenciler, okul, dark, reload }: any) {
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Sinif | null>(null)
  const [form, setForm] = useState<any>({ renk: '#5c6bc0', kapasite: 20 })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.ad) { setSaveError('Sınıf adı zorunlu!'); return }
    setSaving(true)
    setSaveError(null)
    try {
      const payload = { ...form, okul_id: okul.id }
      const { error } = editing
        ? await supabase.from('siniflar').update(payload).eq('id', editing.id)
        : await supabase.from('siniflar').insert(payload)
      if (error) throw error
      setModal(false)
      reload()
    } catch (err: any) {
      const detail = err?.code === '42501'
        ? 'Yetki hatası (RLS): Bu işlem için yetkiniz bulunmuyor.'
        : err?.code === '23505'
          ? 'Bu sınıf adı zaten mevcut.'
          : `Kayıt hatası: ${err?.message || 'Bilinmeyen hata'}`
      setSaveError(detail)
    } finally {
      setSaving(false)
    }
  }

  async function del(id: number) {
    if (!confirm('Silmek istediğinizden emin misiniz?')) return
    const { error } = await supabase.from('siniflar').delete().eq('id', id)
    if (error) { alert(`Silme hatası: ${error.message}`); return }
    reload()
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setEditing(null); setForm({ renk: '#5c6bc0', kapasite: 20 }); setSaveError(null); setModal(true) }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Sınıf Ekle</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {siniflar.map((s: Sinif) => {
          const cnt = ogrenciler.filter((o: Ogrenci) => o.sinif === s.ad).length
          const pct = Math.min(Math.round(cnt / (s.kapasite || 20) * 100), 100)
          return (
            <div key={s.id} className={`rounded-lg border overflow-hidden ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
              <div className="p-4 text-white" style={{ background: s.renk || '#5c6bc0' }}>
                <div className="font-bold text-lg">{s.ad}</div>
                <div className="text-sm opacity-80">{s.yas_grubu || ''} {s.ogretmen ? '· ' + s.ogretmen : ''}</div>
              </div>
              <div className={`p-4 ${dark ? 'bg-[#161b22]' : 'bg-white'}`}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Doluluk</span>
                  <span className={`font-semibold ${dark ? 'text-white' : ''}`}>{cnt}/{s.kapasite || 20}</span>
                </div>
                <div className="bg-gray-200 rounded-full h-1.5 mb-3">
                  <div className="h-1.5 rounded-full" style={{ width: pct + '%', background: s.renk || '#5c6bc0' }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(s); setForm({ ...s }); setModal(true) }} className="flex-1 border border-gray-300 rounded-lg py-1.5 text-xs font-semibold hover:border-green-600 hover:text-green-700">✏️ Düzenle</button>
                  <button onClick={() => del(s.id)} className="border border-red-200 text-red-500 bg-red-50 rounded-lg px-3 py-1.5 text-xs">🗑</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Sınıf Düzenle' : 'Sınıf Ekle'} dark={dark}>
        <div className="p-5 grid grid-cols-2 gap-3">
          {[
            { label: 'Sınıf Adı *', key: 'ad', full: true },
            { label: 'Yaş Grubu', key: 'yas_grubu' },
            { label: 'Kapasite', key: 'kapasite', type: 'number' },
            { label: 'Öğretmen', key: 'ogretmen', full: true },
          ].map(f => (
            <div key={f.key} className={f.full ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
              <input type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Renk</label>
            <select value={form.renk} onChange={e => setForm({ ...form, renk: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
              {[['#5c6bc0','🔵 Mor'],['#26a69a','🟢 Yeşil'],['#ffa726','🟡 Sarı'],['#ef5350','🔴 Kırmızı'],['#42a5f5','🔵 Mavi'],['#ec407a','🩷 Pembe']].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        {saveError && (
          <div className="px-5 pb-3">
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
          </div>
        )}
        <div className={`px-5 py-4 border-t flex justify-end gap-2 ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
          <button onClick={() => setModal(false)} disabled={saving} className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600 disabled:opacity-50">İptal</button>
          <button onClick={save} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 min-w-[80px]">
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
          className={`border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
        <select value={sinifFilter} onChange={e => setSinifFilter(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
          <option value="">Tüm Sınıflar</option>
          {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
        </select>
        <button onClick={sendWA} className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">📱 WhatsApp</button>
        <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">💾 Kaydet</button>
        <div className="ml-auto flex gap-4 text-sm font-semibold">
          <span className="text-green-700">✅ {counts.geldi}</span>
          <span className="text-red-500">❌ {counts.gelmedi}</span>
          <span className="text-orange-500">🏖️ {counts.izinli}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((o: Ogrenci) => {
          const d = state[o.id] || ''
          return (
            <div key={o.id} className={`border-2 rounded-xl p-3 text-center transition-all ${d === 'geldi' ? 'border-green-300 bg-green-50' : d === 'gelmedi' ? 'border-red-400 bg-red-50' : d === 'izinli' ? 'border-orange-400 bg-orange-50' : dark ? 'border-gray-600 bg-[#161b22]' : 'border-gray-200 bg-white'}`}>
              <div className="text-2xl mb-1">🌸</div>
              <div className={`text-xs font-semibold mb-2 ${dark ? 'text-white' : ''}`}>{o.ad_soyad.split(' ')[0]}</div>
              <div className="flex gap-1 justify-center">
                {[['geldi','✓','bg-green-600'],['gelmedi','✗','bg-red-500'],['izinli','İ','bg-orange-400']].map(([val,label,color]) => (
                  <button key={val} onClick={() => setState(s => ({ ...s, [o.id]: val }))}
                    className={`text-xs px-2 py-1 rounded font-bold transition-all ${d === val ? color + ' text-white' : 'bg-gray-100 text-gray-500'}`}>
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
  const [search, setSearch] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (selected && okul) loadFeed() }, [selected, tarih])

  async function loadFeed() {
    const { data } = await supabase.from('aktiviteler').select('*').eq('okul_id', okul.id).eq('ogrenci_id', selected!.id).eq('tarih', tarih).order('id', { ascending: false })
    setFeed(data || [])
  }

  async function saveAkt() {
    if (!selected) return
    await supabase.from('aktiviteler').insert({ okul_id: okul.id, ogrenci_id: selected.id, tarih, tur: aktType, detay: form, kaydeden: 'Yönetici', veli_gosterilsin: true })
    await supabase.from('bildirimler').insert({ okul_id: okul.id, ogrenci_id: selected.id, baslik: AKT_TYPES.find(t => t.id === aktType)?.label || aktType, mesaj: selected.ad_soyad.split(' ')[0] + ' için kayıt eklendi.', tur: aktType, okundu: false })
    setModal(false); loadFeed()
  }

  const filtered = ogrenciler.filter((o: Ogrenci) => o.ad_soyad.toLowerCase().includes(search.toLowerCase()))
  const t = AKT_TYPES.find(x => x.id === aktType)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card dark={dark}>
        <div className={`px-4 py-3 border-b font-semibold text-sm ${dark ? 'border-[#2a2f36] text-white' : 'border-gray-100'}`}>👦 Öğrenci Seç</div>
        <div className="p-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Ara..."
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none mb-2 ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
          <div className="max-h-80 overflow-y-auto">
            {filtered.map((o: Ogrenci) => (
              <div key={o.id} onClick={() => setSelected(o)}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${selected?.id === o.id ? 'bg-green-50' : dark ? 'hover:bg-[#1f242d]' : 'hover:bg-gray-50'}`}>
                <span className="text-lg">🌸</span>
                <div>
                  <div className={`text-sm font-medium ${dark ? 'text-white' : ''}`}>{o.ad_soyad}</div>
                  <div className="text-xs text-gray-400">{o.sinif || ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <Card dark={dark}>
          <div className={`px-4 py-3 border-b font-semibold text-sm ${dark ? 'border-[#2a2f36] text-white' : 'border-gray-100'}`}>
            {selected ? selected.ad_soyad : 'Öğrenci seçin'}
          </div>
          <div className="p-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
            {AKT_TYPES.map(t => (
              <button key={t.id} onClick={() => { if (!selected) { alert('Önce öğrenci seçin!'); return }; setAktType(t.id); setForm({}); setModal(true) }}
                className="rounded-xl p-3 flex flex-col items-center gap-1 text-white text-xs font-semibold transition-transform hover:-translate-y-0.5"
                style={{ background: t.color }}>
                <span className="text-2xl">{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card dark={dark}>
          <div className={`px-4 py-3 border-b flex items-center justify-between ${dark ? 'border-[#2a2f36]' : 'border-gray-100'}`}>
            <span className={`font-semibold text-sm ${dark ? 'text-white' : ''}`}>📋 Aktivite Geçmişi</span>
            <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
              className={`border rounded-lg px-2 py-1 text-xs outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
          </div>
          <div>
            {feed.length ? feed.map(a => {
              const tp = AKT_TYPES.find(x => x.id === a.tur)
              return <div key={a.id} className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 ${dark ? 'border-[#2a2f36]' : 'border-gray-50'}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: tp?.color || '#9e9e9e' }}>{tp?.emoji || '📋'}</div>
                <div>
                  <div className={`text-sm font-medium ${dark ? 'text-white' : ''}`}>{tp?.label || a.tur}{a.detay?.not ? ' · ' + a.detay.not : ''}</div>
                  <div className="text-xs text-gray-400">{a.kaydeden}</div>
                </div>
              </div>
            }) : <div className="text-center py-8 text-gray-400 text-sm">Aktivite yok</div>}
          </div>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={`${t?.emoji} ${t?.label}`} dark={dark}>
        <div className="p-5 space-y-3">
          {aktType === 'food' && <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">ÖĞÜN</label>
              <div className="flex gap-2 flex-wrap">
                {['Kahvaltı','Kuşluk','Öğle','İkindi'].map(v => (
                  <button key={v} onClick={() => setForm({...form, ogun: v})}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${form.ogun === v ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600'}`}>{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">NE KADAR YEDİ?</label>
              <div className="flex gap-2 flex-wrap">
                {['Hepsini','Çoğunu','Birazını','Hiç'].map(v => (
                  <button key={v} onClick={() => setForm({...form, yeme: v})}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${form.yeme === v ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600'}`}>{v}</button>
                ))}
              </div>
            </div>
          </>}
          {aktType === 'health' && <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Ateş (°C)</label>
            <input type="number" step="0.1" value={form.ates || ''} onChange={e => setForm({...form, ates: e.target.value})}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
          </div>}
          {aktType === 'meds' && <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">İlaç Adı *</label>
              <input value={form.ilac || ''} onChange={e => setForm({...form, ilac: e.target.value})}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Doz</label>
              <input value={form.doz || ''} onChange={e => setForm({...form, doz: e.target.value})}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
            </div>
          </>}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Not</label>
            <textarea value={form.not || ''} onChange={e => setForm({...form, not: e.target.value}) }
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} rows={3} />
          </div>
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
          <button onClick={() => setModal(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600">İptal</button>
          <button onClick={saveAkt} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Kaydet</button>
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
          className={`border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
        <select value={sinifFilter} onChange={e => setSinifFilter(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
          <option value="">Tüm Sınıflar</option>
          {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
        </select>
      </div>
      <div className="space-y-3">
        {filtered.map((o: Ogrenci) => {
          const r = raporlar[o.id] || {}
          return (
            <Card key={o.id} dark={dark}>
              <div className={`px-4 py-3 border-b flex items-center gap-3 ${dark ? 'border-[#2a2f36]' : 'border-gray-100'}`}>
                <span className="text-xl">🌸</span>
                <span className={`font-semibold text-sm ${dark ? 'text-white' : ''}`}>{o.ad_soyad}</span>
                <span className="text-xs text-gray-400">{o.sinif}</span>
              </div>
              <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: '🍳 Kahvaltı', key: 'kahvalti', placeholder: 'Ne yedi?' },
                  { label: '🍽️ Öğle', key: 'ogle', placeholder: 'Ne yedi?' },
                  { label: '😴 Uyku', key: 'uyku_suresi', placeholder: 'Ne kadar?' },
                  { label: '😊 Ruh Hali', key: 'ruh_hali', placeholder: 'Nasıldı?' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                    <input
                      defaultValue={r[f.key] || ''}
                      placeholder={f.placeholder}
                      onBlur={e => saveRapor(o.id, { ...r, [f.key]: e.target.value })}
                      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-green-600 ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`}
                    />
                  </div>
                ))}
                <div className="col-span-2 lg:col-span-4">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">📝 Açıklama</label>
                  <input
                    defaultValue={r.aciklama || ''}
                    placeholder="Günle ilgili not..."
                    onBlur={e => saveRapor(o.id, { ...r, aciklama: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-green-600 ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`}
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
          className={`border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
          <option value="">— Öğrenci Seç —</option>
          {ogrenciler.map((o: Ogrenci) => <option key={o.id} value={o.id}>{o.ad_soyad}</option>)}
        </select>
        <select value={donem} onChange={e => setDonem(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
          <option>2025-2026 1. Dönem</option>
          <option>2025-2026 2. Dönem</option>
        </select>
        {selectedOgr && <button onClick={() => { setPuanlar({}); setGenelNot(''); setModal(true) }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Rapor Ekle</button>}
      </div>

      {data.length > 0 && (
        <Card dark={dark}>
          <div className={`px-4 py-3 border-b ${dark ? 'border-[#2a2f36]' : 'border-gray-100'}`}>
            <h3 className={`font-semibold ${dark ? 'text-white' : ''}`}>{donem}</h3>
          </div>
          <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {GEL_CATS.map(k => {
              const d = data.find(x => x.kategori === k.id)
              return (
                <div key={k.id} className={`rounded-lg p-3 ${dark ? 'bg-[#1f242d]' : 'bg-gray-50'}`}>
                  <div className="text-xs font-semibold text-gray-500 mb-1">{k.ad}</div>
                  <div className="text-lg">{'⭐'.repeat(d?.puan || 0)}{'☆'.repeat(5 - (d?.puan || 0))}</div>
                </div>
              )
            })}
          </div>
          {data.find(x => x.kategori === 'genel')?.not_text && (
            <div className={`mx-4 mb-4 p-3 rounded-lg border-l-4 border-green-600 ${dark ? 'bg-[#1f242d]' : 'bg-green-50'}`}>
              <p className={`text-sm ${dark ? 'text-white' : ''}`}>📝 {data.find(x => x.kategori === 'genel')?.not_text}</p>
            </div>
          )}
        </Card>
      )}

      {!selectedOgr && <div className="text-center py-16 text-gray-400">📈 Öğrenci seçin</div>}
      {selectedOgr && !data.length && <div className="text-center py-16 text-gray-400">📈 Bu dönem için rapor yok</div>}

      <Modal open={modal} onClose={() => setModal(false)} title="Gelişim Raporu Ekle" dark={dark}>
        <div className="p-5 space-y-3">
          {GEL_CATS.map(k => (
            <div key={k.id} className="flex items-center gap-3">
              <span className={`flex-1 text-sm font-medium ${dark ? 'text-white' : ''}`}>{k.ad}</span>
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
            <label className="block text-xs font-semibold text-gray-500 mb-1">Genel Değerlendirme</label>
            <textarea value={genelNot} onChange={e => setGenelNot(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} rows={3} />
          </div>
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
          <button onClick={() => setModal(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600">İptal</button>
          <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Kaydet</button>
        </div>
      </Modal>
    </div>
  )
}

// ── FOTOĞRAFLAR ──
function Fotograflar({ siniflar, okul, dark }: any) {
  const [fotos, setFotos] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [form, setForm] = useState<any>({})
  const [uploading, setUploading] = useState(false)
  const [viewer, setViewer] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) load() }, [okul])

  async function load() {
    const { data } = await supabase.from('fotograflar').select('*').eq('okul_id', okul.id).order('id', { ascending: false }).limit(50)
    setFotos(data || [])
  }

  async function upload() {
    if (!files.length) return
    setUploading(true)
    for (const f of files) {
      const fn = Date.now() + '_' + Math.random().toString(36).slice(2) + '.jpg'
      const { error } = await supabase.storage.from('fotograflar').upload(fn, f, {
        contentType: f.type || 'image/jpeg',
        upsert: true,
      })
      if (!error) {
        const { data } = supabase.storage.from('fotograflar').getPublicUrl(fn)
        const url = data.publicUrl
        await supabase.from('fotograflar').insert({ okul_id: okul.id, url, aciklama: form.aciklama, sinif: form.sinif, tarih: today() })
      }
    }
    setUploading(false); setModal(false); load()
  }

  async function deleteFoto(id: number) {
    if (!confirm('Sil?')) return
    await supabase.from('fotograflar').delete().eq('id', id)
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
        <button onClick={() => { setFiles([]); setForm({}); setModal(true) }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Fotoğraf Ekle</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {fotos.map(f => (
          <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer" onClick={() => setViewer(f.url)}>
            <Image
              src={f.url}
              alt={f.aciklama || 'Okul fotografi'}
              fill
              sizes="(max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform group-hover:scale-105"
              unoptimized
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-white text-xs">{f.aciklama || ''}</p>
            </div>
            <button onClick={e => { e.stopPropagation(); deleteFoto(f.id) }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
          </div>
        ))}
        {!fotos.length && <div className="col-span-4 text-center py-16 text-gray-400">📷 Fotoğraf yok</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Fotoğraf Ekle" dark={dark}>
        <div className="p-5 space-y-3">
          <div onClick={() => document.getElementById('foto-input')?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-green-500">
            <div className="text-3xl mb-2">📷</div>
            <p className="text-sm font-medium">{files.length ? files.length + ' dosya seçildi' : 'Fotoğraf Seç'}</p>
            <input id="foto-input" type="file" accept="image/*" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files || []))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Açıklama</label>
            <input value={form.aciklama || ''} onChange={e => setForm({ ...form, aciklama: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Sınıf</label>
            <select value={form.sinif || ''} onChange={e => setForm({ ...form, sinif: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
              <option value="">Tüm okul</option>
              {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
            </select>
          </div>
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
          <button onClick={() => setModal(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600">İptal</button>
          <button onClick={upload} disabled={uploading} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
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
          className={`border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
        <button onClick={generate} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">📋 Ay Oluştur</button>
        <button onClick={sendWA} className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">📱 WA Hatırlatma</button>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[['TOPLAM', toplam, 'text-green-700'], ['ÖDENEN', odenen, 'text-green-700'], ['BEKLEYEN', toplam - odenen, 'text-red-500']].map(([l, v, c]) => (
          <Card key={l as string} dark={dark} className="p-4 text-center">
            <div className="text-xs text-gray-500 font-semibold mb-1">{l}</div>
            <div className={`text-xl font-bold ${c}`}>{fmtM(Number(v))}</div>
          </Card>
        ))}
      </div>
      <Card dark={dark}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={dark ? 'bg-[#1f242d]' : 'bg-gray-50'}>
                {['Öğrenci', 'Veli', 'Tutar', 'Durum', 'Tarih', 'İşlem'].map(h => (
                  <th key={h} className={`text-left px-4 py-3 text-xs font-semibold uppercase ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(a => (
                <tr key={a.id} className={`border-t ${dark ? 'border-[#2a2f36]' : 'border-gray-100'}`}>
                  <td className={`px-4 py-3 text-sm font-semibold ${dark ? 'text-white' : ''}`}>{(a.ogrenciler as any)?.ad_soyad || '—'}</td>
                  <td className={`px-4 py-3 text-sm ${dark ? 'text-gray-200' : 'text-gray-600'}`}>{(a.ogrenciler as any)?.veli_ad || '—'}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${dark ? 'text-white' : ''}`}>{fmtM(a.tutar)}</td>
                  <td className="px-4 py-3">{a.odendi ? <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">✅ Ödendi</span> : <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded-full">⏳ Bekliyor</span>}</td>
                  <td className={`px-4 py-3 text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{a.odeme_tarihi || '—'}</td>
                  <td className="px-4 py-3">
                    {!a.odendi
                      ? <button onClick={() => markOdendi(a.id, a.tutar)} className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold">✓ Ödendi</button>
                      : <button onClick={async () => { await supabase.from('aidatlar').update({ odendi: false, odeme_tarihi: null }).eq('id', a.id); load() }} className="bg-red-50 text-red-500 border border-red-200 text-xs px-3 py-1.5 rounded-lg">✗ İptal</button>
                    }
                  </td>
                </tr>
              ))}
              {!data.length && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">Bu ay için aidat oluşturulmamış</td></tr>}
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
          className={`border px-3 py-2 rounded-lg text-sm ${dark ? 'border-gray-600 text-gray-200' : 'border-gray-300'}`}>‹</button>
        <span className={`text-sm font-medium flex-1 text-center ${dark ? 'text-white' : ''}`}>{new Date(hafta).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} haftası</span>
        <button onClick={() => { const d = new Date(hafta); d.setDate(d.getDate() + 7); setHafta(d.toISOString().split('T')[0]) }}
          className={`border px-3 py-2 rounded-lg text-sm ${dark ? 'border-gray-600 text-gray-200' : 'border-gray-300'}`}>›</button>
        <button onClick={sendWA} className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">📱 WA</button>
      </div>
      <Card dark={dark}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={dark ? 'bg-[#1f242d]' : 'bg-gray-50'}>
                {['Gün', 'Kahvaltı', 'Öğle', 'İkindi', ''].map(h => (
                  <th key={h} className={`text-left px-4 py-3 text-xs font-semibold ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.tarih} className={`border-t ${dark ? 'border-[#2a2f36]' : 'border-gray-100'}`}>
                  <td className="px-4 py-3">
                    <div className={`font-semibold text-sm ${dark ? 'text-white' : ''}`}>{r.gun}</div>
                    <div className="text-xs text-gray-400">{r.tarih}</div>
                  </td>
                  <td className={`px-4 py-3 text-sm ${dark ? 'text-gray-200' : 'text-gray-600'}`}>{r.yemek.kahvalti || <span className="text-gray-200">—</span>}</td>
                  <td className={`px-4 py-3 text-sm ${dark ? 'text-gray-200' : 'text-gray-600'}`}>{r.yemek.ogle || <span className="text-gray-200">—</span>}</td>
                  <td className={`px-4 py-3 text-sm ${dark ? 'text-gray-200' : 'text-gray-600'}`}>{r.yemek.ikindi || <span className="text-gray-200">—</span>}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setForm({ tarih: r.tarih, kahvalti: r.yemek.kahvalti || '', ogle: r.yemek.ogle || '', ikindi: r.yemek.ikindi || '' }); setModal(true) }}
                      className={`text-xs border px-2 py-1 rounded hover:border-green-600 hover:text-green-700 ${dark ? 'border-gray-600 text-gray-200' : 'border-gray-300'}`}>✏️</button>
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
              <label className="block text-xs font-semibold text-gray-500 mb-1">{l}</label>
              <input value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
            </div>
          ))}
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
          <button onClick={() => setModal(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600">İptal</button>
          <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Kaydet</button>
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (okul) load() }, [okul])
  async function load() { const { data: d } = await supabase.from('personel').select('*').eq('okul_id', okul.id).eq('aktif', true).order('ad_soyad'); setData(d || []) }

  async function save() {
    if (!form.ad_soyad) { alert('Ad zorunlu!'); return }
    await supabase.from('personel').insert({ okul_id: okul.id, ...form, aktif: true })
    setModal(false); setForm({ rol: 'ogretmen' }); load()
  }

  async function del(id: number) {
    if (!confirm('Silmek istediğinizden emin misiniz?')) return
    await supabase.from('personel').update({ aktif: false }).eq('id', id); load()
  }

  const ROL: Record<string, string> = { ogretmen: 'Öğretmen', mudur: 'Müdür', yardimci: 'Yardımcı' }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm({ rol: 'ogretmen' }); setModal(true) }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Personel Ekle</button>
      </div>
      <Card dark={dark}>
        <div className="divide-y divide-gray-100">
          {data.map(p => (
            <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${dark ? 'border-[#2a2f36]' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-green-50 text-green-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {p.ad_soyad.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className={`font-semibold text-sm ${dark ? 'text-white' : ''}`}>{p.ad_soyad}</div>
                <div className="text-xs text-gray-500">{ROL[p.rol] || p.rol}{p.sinif ? ' · ' + p.sinif : ''} {p.telefon ? '· ' + p.telefon : ''}</div>
              </div>
              <button onClick={() => del(p.id)} className="text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-1 rounded">🗑</button>
            </div>
          ))}
          {!data.length && <div className="text-center py-16 text-gray-400">👨‍🏫 Personel yok</div>}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Personel Ekle" dark={dark}>
        <div className="p-5 space-y-3">
          {[['Ad Soyad *','ad_soyad'],['Telefon','telefon'],['E-posta','email']].map(([l,k]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{l}</label>
              <input value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Rol</label>
            <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
              <option value="ogretmen">Öğretmen</option>
              <option value="mudur">Müdür</option>
              <option value="yardimci">Yardımcı</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Sınıf</label>
            <select value={form.sinif || ''} onChange={e => setForm({ ...form, sinif: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
              <option value="">—</option>
              {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
            </select>
          </div>
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
          <button onClick={() => setModal(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600">İptal</button>
          <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Kaydet</button>
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
          className={`border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
        <select value={sinifFilter} onChange={e => setSinifFilter(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
          <option value="">Tüm Sınıflar</option>
          {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
        </select>
        <button onClick={sendWA} className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">📱 WA</button>
        <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">💾 Kaydet</button>
        <div className="ml-auto flex gap-4 text-sm font-semibold">
          <span className="text-green-700">🚌 {counts.bindi} Bindi</span>
          <span className="text-orange-500">🏠 {counts.indi} İndi</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((o: Ogrenci) => {
          const d = state[o.id] || ''
          return (
            <div key={o.id} className={`border-2 rounded-xl p-3 text-center transition-all ${d === 'bindi' ? 'border-green-300 bg-green-50' : d === 'indi' ? 'border-orange-400 bg-orange-50' : dark ? 'border-gray-600 bg-[#161b22]' : 'border-gray-200 bg-white'}`}>
              <div className="text-2xl mb-1">🌸</div>
              <div className={`text-xs font-semibold mb-2 ${dark ? 'text-white' : ''}`}>{o.ad_soyad.split(' ')[0]}</div>
              <div className="flex gap-1 justify-center">
                {[['bindi','🚌 Bindi','bg-green-600'],['indi','🏠 İndi','bg-orange-400']].map(([val,label,color]) => (
                  <button key={val} onClick={() => setState(s => ({ ...s, [o.id]: val }))}
                    className={`text-xs px-2 py-1 rounded font-bold transition-all ${d === val ? color + ' text-white' : 'bg-gray-100 text-gray-500'}`}>
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
        <div className={`px-4 py-3 border-b font-semibold text-sm flex items-center justify-between ${dark ? 'border-[#2a2f36] text-white' : 'border-gray-100'}`}>
          💬 Mesajlar
          {unread > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unread}</span>}
        </div>
        <div className="flex-1 overflow-y-auto">
          {ogrenciler.map((o: Ogrenci) => {
            const unreadCount = mesajlar.filter(m => m.gonderen_id === o.id && !m.okundu).length
            return (
              <div key={o.id} onClick={() => setSelected(o)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b ${dark ? 'border-[#2a2f36]' : 'border-gray-50'} ${selected?.id === o.id ? 'bg-green-50' : dark ? 'hover:bg-[#1f242d]' : 'hover:bg-gray-50'}`}>
                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-lg flex-shrink-0">🌸</div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${dark ? 'text-white' : ''}`}>{o.ad_soyad.split(' ')[0]}</div>
                  <div className="text-xs text-gray-400">{o.veli_ad || ''}</div>
                </div>
                {unreadCount > 0 && <span className="bg-green-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{unreadCount}</span>}
              </div>
            )
          })}
        </div>
      </Card>

      <Card dark={dark} className="lg:col-span-2 flex flex-col overflow-hidden">
        {selected ? <>
          <div className={`px-4 py-3 border-b flex items-center gap-3 ${dark ? 'border-[#2a2f36]' : 'border-gray-100'}`}>
            <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-lg">🌸</div>
            <div>
              <div className={`font-semibold text-sm ${dark ? 'text-white' : ''}`}>{selected.ad_soyad}</div>
              <div className="text-xs text-gray-400">{selected.veli_ad}</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {thread.map(m => (
              <div key={m.id} className={`flex ${m.gonderen_tip === 'okul' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${m.gonderen_tip === 'okul' ? 'bg-green-600 text-white rounded-br-sm' : dark ? 'bg-[#1f242d] text-white rounded-bl-sm' : 'bg-gray-100 rounded-bl-sm'}`}>
                  {m.icerik}
                  <div className={`text-xs mt-1 ${m.gonderen_tip === 'okul' ? 'text-green-100' : 'text-gray-400'}`}>{new Date(m.olusturuldu).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
            {!thread.length && <div className="text-center py-8 text-gray-400 text-sm">Henüz mesaj yok</div>}
          </div>
          <div className={`p-3 border-t flex gap-2 ${dark ? 'border-[#2a2f36]' : 'border-gray-100'}`}>
            <input value={icerik} onChange={e => setIcerik(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Mesaj yaz..."
              className={`flex-1 border rounded-xl px-4 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
            <button onClick={send} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">➤</button>
          </div>
        </> : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
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
        <button onClick={() => { setForm({}); setModal(true) }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Duyuru Ekle</button>
      </div>
      <div className="space-y-3">
        {data.map(d => (
          <div key={d.id} className={`rounded-lg border p-4 ${d.onemli ? 'border-l-4 border-l-red-500 border-red-200' : dark ? 'border-[#2a2f36] bg-[#161b22]' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className={`font-semibold text-sm ${dark ? 'text-white' : ''}`}>{d.onemli ? '⚠️ ' : ''}{d.baslik}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{d.tarih}</span>
                <button onClick={() => del(d.id)} className="text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-1 rounded">🗑</button>
              </div>
            </div>
            <p className="text-sm text-gray-500">{d.icerik}</p>
          </div>
        ))}
        {!data.length && <div className="text-center py-16 text-gray-400">📢 Duyuru yok</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Duyuru Ekle" dark={dark}>
        <div className="p-5 space-y-3">
          {[['Başlık *','baslik'],['İçerik *','icerik'],['Tarih','tarih']].map(([l,k]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{l}</label>
              {k === 'icerik'
                ? <textarea value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} rows={4} />
                : <input type={k === 'tarih' ? 'date' : 'text'} value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
              }
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="onemli" checked={form.onemli || false} onChange={e => setForm({ ...form, onemli: e.target.checked })} />
            <label htmlFor="onemli" className={`text-sm font-medium ${dark ? 'text-white' : ''}`}>⚠️ Önemli</label>
          </div>
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
          <button onClick={() => setModal(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600">İptal</button>
          <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Yayınla</button>
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
        <button onClick={() => { setForm({}); setModal(true) }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Etkinlik Ekle</button>
      </div>
      <div className="space-y-3">
        {data.map(e => {
          const d = new Date(e.tarih); const gecti = d < new Date()
          return (
            <div key={e.id} className={`rounded-lg border p-4 flex items-center gap-4 ${gecti ? 'opacity-60' : ''} ${dark ? 'bg-[#161b22] border-[#2a2f36]' : 'bg-white border-gray-200'}`}>
              <div className={`${gecti ? 'bg-gray-400' : 'bg-green-600'} text-white rounded-xl p-3 text-center min-w-12 flex-shrink-0`}>
                <div className="text-xl font-bold leading-none">{d.getDate()}</div>
                <div className="text-xs opacity-80">{d.toLocaleDateString('tr-TR', { month: 'short' })}</div>
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold text-sm ${dark ? 'text-white' : ''}`}>{e.baslik}</h3>
                <p className="text-xs text-gray-500">{e.aciklama || ''} {e.hedef_kitle ? '· ' + e.hedef_kitle : ''}</p>
              </div>
              <button onClick={() => del(e.id)} className="text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-1.5 rounded">🗑</button>
            </div>
          )
        })}
        {!data.length && <div className="text-center py-16 text-gray-400">📅 Etkinlik yok</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Etkinlik Ekle" dark={dark}>
        <div className="p-5 space-y-3">
          {[['Etkinlik Adı *','baslik'],['Tarih *','tarih'],['Açıklama','aciklama']].map(([l,k]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{l}</label>
              <input type={k === 'tarih' ? 'date' : 'text'} value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Hedef Kitle</label>
            <select value={form.hedef_kitle || ''} onChange={e => setForm({ ...form, hedef_kitle: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300 bg-white'}`}>
              <option value="Tüm öğrenciler">Tüm öğrenciler</option>
              <option value="Veliler">Veliler</option>
              {siniflar.map((s: Sinif) => <option key={s.id} value={s.ad}>{s.ad}</option>)}
            </select>
          </div>
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 ${dark ? 'border-[#2a2f36]' : 'border-gray-200'}`}>
          <button onClick={() => setModal(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600">İptal</button>
          <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Kaydet</button>
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
    await supabase.from('okullar').update({ ad: form.ad, telefon: form.telefon, adres: form.adres, sifre: form.sifre, logo_url: form.logo_url || null }).eq('id', okul.id)
    setOkul({ ...okul, ...form })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogoUpload(file?: File | null) {
    if (!file) return
    setUploadingLogo(true)
    const storagePath = `${okul.id}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const { error } = await supabase.storage.from('logos').upload(storagePath, file, {
      contentType: file.type || 'image/png',
      upsert: true,
    })

    if (!error) {
      const { data } = supabase.storage.from('logos').getPublicUrl(storagePath)
      setForm((prev: any) => ({ ...prev, logo_url: data.publicUrl }))
    }

    setUploadingLogo(false)
  }

  return (
    <div className="max-w-lg">
      <Card dark={dark} className="p-6 space-y-4">
        <h3 className={`font-semibold text-base mb-4 ${dark ? 'text-white' : ''}`}>⚙️ Okul Bilgileri</h3>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">Okul Logosu</label>
          <div className="flex items-center gap-3">
            {form.logo_url ? (
              <img src={form.logo_url} alt={form.ad || 'Logo'} className="h-16 w-16 rounded-2xl object-cover border border-gray-200" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center text-green-700 font-bold">
                {(form.ad || 'Kinderly').split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <input type="file" accept="image/*" onChange={e => handleLogoUpload(e.target.files?.[0] ?? null)}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
          </div>
          <p className="mt-2 text-xs text-gray-500">{uploadingLogo ? 'Logo yükleniyor...' : 'Bucket: logos'}</p>
        </div>
        {[['Okul Adı','ad'],['Telefon','telefon'],['Adres','adres']].map(([l,k]) => (
          <div key={k}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{l}</label>
            <input value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-green-600 ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Yönetici Şifresi</label>
          <input type="password" value={form.sifre || ''} onChange={e => setForm({ ...form, sifre: e.target.value })}
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-green-600 ${dark ? 'bg-[#1f242d] border-gray-600 text-white' : 'border-gray-300'}`} />
        </div>
        <button onClick={save} className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-semibold">
          {saved ? '✅ Kaydedildi!' : 'Kaydet'}
        </button>
      </Card>
    </div>
  )
}
