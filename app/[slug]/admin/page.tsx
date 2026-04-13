'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { rolePath } from '@/lib/auth-helpers'
import type { Ogrenci, Okul, Sinif } from '@/lib/types'

const colors = {
  bg: '#fafafa',
  surface: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
  accent: '#16a34a',
  accentLight: '#f0fdf4',
}

type TabId = 'dashboard' | 'ogrenciler' | 'siniflar' | 'personel' | 'veliler' | 'aidatlar' | 'ayarlar'

type AidatRow = {
  id: number
  ogrenci_id: number
  ay: string
  tutar: number
  odendi: boolean
  odeme_tarihi?: string | null
  ogrenciler?: { ad_soyad?: string; veli_ad?: string; veli_telefon?: string }
}

type PersonelRow = {
  id: number
  ad_soyad: string
  rol: string
  sinif?: string | null
  telefon?: string | null
  email?: string | null
  aktif?: boolean | null
}

type VelilerTablosuRow = {
  veli_ad: string
  veli_telefon: string
  ogrenci_adlari: string[]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function money(value: number) {
  return `₺${(Number(value) || 0).toLocaleString('tr-TR')}`
}

function initials(name?: string) {
  if (!name) return 'KN'
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const sidebarItems: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'ogrenciler', label: 'Öğrenciler' },
  { id: 'siniflar', label: 'Sınıflar' },
  { id: 'personel', label: 'Personel' },
  { id: 'veliler', label: 'Veliler' },
  { id: 'aidatlar', label: 'Aidatlar' },
  { id: 'ayarlar', label: 'Ayarlar' },
]

export default function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { session, role, okul: authOkul, loading, signOut } = useAuth()

  const [slug, setSlug] = useState('')
  const [okul, setOkul] = useState<Okul | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authTimeout, setAuthTimeout] = useState(false)

  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [siniflar, setSiniflar] = useState<Sinif[]>([])
  const [personel, setPersonel] = useState<PersonelRow[]>([])
  const [aidatlar, setAidatlar] = useState<AidatRow[]>([])
  const [aidatAy, setAidatAy] = useState(today().slice(0, 7))

  useEffect(() => {
    params.then((p) => setSlug(p.slug))
  }, [params])

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

    const school = authOkul as Okul
    setOkul(school)
    void loadCoreData(Number(school.id))
  }, [authOkul, loading, role, router, session, slug])

  useEffect(() => {
    if (!okul) return
    void loadAidatlar(okul.id, aidatAy)
  }, [aidatAy, okul])

  async function loadCoreData(okulId: number) {
    const [{ data: ogr }, { data: sinif }, { data: prs }] = await Promise.all([
      supabase.from('ogrenciler').select('*').eq('okul_id', okulId).eq('aktif', true).order('ad_soyad'),
      supabase.from('siniflar').select('*').eq('okul_id', okulId).order('ad'),
      supabase.from('personel').select('*').eq('okul_id', okulId).eq('aktif', true).order('ad_soyad'),
    ])
    setOgrenciler((ogr as Ogrenci[]) || [])
    setSiniflar((sinif as Sinif[]) || [])
    setPersonel((prs as PersonelRow[]) || [])
    await loadAidatlar(okulId, aidatAy)
  }

  async function loadAidatlar(okulId: number, ay: string) {
    const { data } = await supabase
      .from('aidatlar')
      .select('id,ogrenci_id,ay,tutar,odendi,odeme_tarihi,ogrenciler(ad_soyad,veli_ad,veli_telefon)')
      .eq('okul_id', okulId)
      .eq('ay', ay)
      .order('id', { ascending: false })
    setAidatlar((data as AidatRow[]) || [])
  }

  async function refreshAll() {
    if (!okul) return
    await loadCoreData(okul.id)
  }

  if (loading || !session || !okul) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: colors.bg, color: colors.muted }}>
        {authTimeout ? 'Oturum doğrulanamadı, giriş ekranına yönlendiriliyor...' : 'Panel hazırlanıyor...'}
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg, color: colors.text }}>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[240px] border-r bg-white shadow-sm transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{ borderColor: colors.border }}
      >
        <div className="flex items-center gap-3 border-b px-4 py-4" style={{ borderColor: colors.border }}>
          {okul.logo_url ? (
            <img src={okul.logo_url} alt={okul.ad} className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold" style={{ background: colors.accentLight, color: colors.accent }}>
              {initials(okul.ad)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold">{okul.ad}</p>
            <p className="text-xs" style={{ color: colors.muted }}>
              Yönetim Paneli
            </p>
          </div>
        </div>

        <nav className="p-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id)
                setSidebarOpen(false)
              }}
              className="mb-1 flex w-full items-center justify-start rounded-lg px-3 py-2 text-sm transition"
              style={{
                background: activeTab === item.id ? colors.accentLight : 'transparent',
                color: activeTab === item.id ? colors.accent : colors.text,
                fontWeight: activeTab === item.id ? 600 : 500,
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t p-3" style={{ borderColor: colors.border }}>
          <button
            onClick={async () => {
              await signOut()
              router.replace('/giris')
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: colors.border, color: colors.muted }}
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="lg:ml-[240px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm lg:px-6" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-md border px-2 py-1 text-sm lg:hidden" style={{ borderColor: colors.border }}>
              Menü
            </button>
            <div>
              <h1 className="text-base font-semibold">{sidebarItems.find((i) => i.id === activeTab)?.label}</h1>
              <p className="text-xs" style={{ color: colors.muted }}>
                {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshAll}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: colors.border, color: colors.muted }}
            >
              Yenile
            </button>
            <button
              onClick={() => setActiveTab('ogrenciler')}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-white"
              style={{ background: colors.accent }}
            >
              Öğrenci Ekle
            </button>
          </div>
        </header>

        <main className="h-[calc(100vh-64px)] overflow-y-auto p-4 lg:p-6">
          {activeTab === 'dashboard' && (
            <DashboardTab ogrenciler={ogrenciler} siniflar={siniflar} personel={personel} aidatlar={aidatlar} goTab={setActiveTab} />
          )}
          {activeTab === 'ogrenciler' && <OgrencilerTab okul={okul} ogrenciler={ogrenciler} siniflar={siniflar} onRefresh={refreshAll} />}
          {activeTab === 'siniflar' && <SiniflarTab okul={okul} siniflar={siniflar} ogrenciler={ogrenciler} onRefresh={refreshAll} />}
          {activeTab === 'personel' && <PersonelTab okul={okul} personel={personel} siniflar={siniflar} onRefresh={refreshAll} />}
          {activeTab === 'veliler' && <VelilerTab ogrenciler={ogrenciler} />}
          {activeTab === 'aidatlar' && (
            <AidatlarTab okul={okul} ay={aidatAy} setAy={setAidatAy} aidatlar={aidatlar} ogrenciler={ogrenciler} onRefresh={refreshAll} />
          )}
          {activeTab === 'ayarlar' && <AyarlarTab okul={okul} setOkul={setOkul} />}
        </main>
      </div>
    </div>
  )
}

function Card({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-white shadow-sm" style={{ borderColor: colors.border }}>
      {(title || right) && (
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: colors.border }}>
          <h3 className="text-sm font-semibold">{title}</h3>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

function Badge({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'accent' | 'danger' }) {
  const map = {
    muted: { bg: '#f3f4f6', fg: '#4b5563' },
    accent: { bg: colors.accentLight, fg: colors.accent },
    danger: { bg: '#fef2f2', fg: '#dc2626' },
  }
  return (
    <span className="rounded-full px-2 py-1 text-xs font-medium" style={{ background: map[tone].bg, color: map[tone].fg }}>
      {text}
    </span>
  )
}

function DashboardTab({
  ogrenciler,
  siniflar,
  personel,
  aidatlar,
  goTab,
}: {
  ogrenciler: Ogrenci[]
  siniflar: Sinif[]
  personel: PersonelRow[]
  aidatlar: AidatRow[]
  goTab: (tab: TabId) => void
}) {
  const bekleyen = aidatlar.filter((a) => !a.odendi)
  const odenenToplam = aidatlar.filter((a) => a.odendi).reduce((sum, row) => sum + Number(row.tutar || 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Toplam Öğrenci', value: ogrenciler.length, tab: 'ogrenciler' as TabId },
          { label: 'Aktif Sınıf', value: siniflar.length, tab: 'siniflar' as TabId },
          { label: 'Aktif Personel', value: personel.length, tab: 'personel' as TabId },
          { label: 'Bekleyen Aidat', value: bekleyen.length, tab: 'aidatlar' as TabId },
        ].map((item) => (
          <button key={item.label} onClick={() => goTab(item.tab)} className="rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5" style={{ borderColor: colors.border }}>
            <p className="text-xs font-medium" style={{ color: colors.muted }}>
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{item.value}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Hızlı Aksiyonlar">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => goTab('ogrenciler')} className="rounded-lg px-3 py-2 text-sm font-medium text-white" style={{ background: colors.accent }}>
              Yeni Öğrenci
            </button>
            <button onClick={() => goTab('siniflar')} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: colors.border }}>
              Sınıf Yönet
            </button>
            <button onClick={() => goTab('aidatlar')} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: colors.border }}>
              Aidat Kontrol
            </button>
          </div>
        </Card>

        <Card title="Aktivite Feed">
          <div className="space-y-3 text-sm">
            <p style={{ color: colors.muted }}>Yeni kayıtlar ve güncellemeler burada listelenir.</p>
            <div className="border-b pb-2" style={{ borderColor: colors.border }}>
              Öğrenci, sınıf ve personel verileri gerçek zamanlı yenilenir.
            </div>
            <div>Bugün ödenen aidat toplamı: <strong>{money(odenenToplam)}</strong></div>
          </div>
        </Card>

        <Card title="Finans Özeti">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span style={{ color: colors.muted }}>Toplam Kayıt</span>
              <strong>{aidatlar.length}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: colors.muted }}>Ödenen</span>
              <strong>{aidatlar.filter((a) => a.odendi).length}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: colors.muted }}>Bekleyen</span>
              <strong>{bekleyen.length}</strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function OgrencilerTab({
  okul,
  ogrenciler,
  siniflar,
  onRefresh,
}: {
  okul: Okul
  ogrenciler: Ogrenci[]
  siniflar: Sinif[]
  onRefresh: () => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [sinifFilter, setSinifFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Ogrenci | null>(null)
  const [form, setForm] = useState<Record<string, any>>({ aidat_tutari: 3000 })

  const filtered = useMemo(
    () =>
      ogrenciler.filter(
        (o) => o.ad_soyad.toLowerCase().includes(search.toLowerCase()) && (!sinifFilter || o.sinif === sinifFilter)
      ),
    [ogrenciler, search, sinifFilter]
  )

  function openAdd() {
    setEditing(null)
    setForm({ aidat_tutari: 3000 })
    setModalOpen(true)
  }

  function openEdit(row: Ogrenci) {
    setEditing(row)
    setForm({ ...row })
    setModalOpen(true)
  }

  async function saveOgrenci() {
    if (!form.ad_soyad || !form.veli_ad || !form.veli_telefon) return
    const payload = { ...form, okul_id: okul.id, aktif: true }
    if (editing) {
      await supabase.from('ogrenciler').update(payload).eq('id', editing.id)
    } else {
      const { data } = await supabase.from('ogrenciler').insert({ ...payload, kayit_tarihi: today() }).select()
      if (data?.[0]) {
        await supabase.from('aidatlar').insert({
          okul_id: okul.id,
          ogrenci_id: data[0].id,
          ay: today().slice(0, 7),
          tutar: form.aidat_tutari || 3000,
          odendi: false,
        })
      }
    }
    setModalOpen(false)
    await onRefresh()
  }

  async function pasifYap(id: number) {
    await supabase.from('ogrenciler').update({ aktif: false }).eq('id', id)
    await onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Öğrenci ara"
          className="min-w-[240px] flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: colors.border }}
        />
        <select value={sinifFilter} onChange={(e) => setSinifFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: colors.border }}>
          <option value="">Tüm sınıflar</option>
          {siniflar.map((s) => (
            <option key={s.id} value={s.ad}>
              {s.ad}
            </option>
          ))}
        </select>
        <button onClick={openAdd} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: colors.accent }}>
          Ekle
        </button>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: colors.muted }}>
              <th className="border-b pb-3" style={{ borderColor: colors.border }}>Öğrenci</th>
              <th className="border-b pb-3" style={{ borderColor: colors.border }}>Sınıf</th>
              <th className="border-b pb-3" style={{ borderColor: colors.border }}>Veli</th>
              <th className="border-b pb-3" style={{ borderColor: colors.border }}>Telefon</th>
              <th className="border-b pb-3 text-right" style={{ borderColor: colors.border }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="transition hover:bg-[#f9fafb]">
                <td className="border-b py-3" style={{ borderColor: colors.border }}>{o.ad_soyad}</td>
                <td className="border-b py-3" style={{ borderColor: colors.border }}><Badge text={o.sinif || '—'} /></td>
                <td className="border-b py-3" style={{ borderColor: colors.border }}>{o.veli_ad || '—'}</td>
                <td className="border-b py-3" style={{ borderColor: colors.border }}>{o.veli_telefon || '—'}</td>
                <td className="border-b py-3 text-right" style={{ borderColor: colors.border }}>
                  <button onClick={() => openEdit(o)} className="mr-2 rounded-md border px-2 py-1 text-xs" style={{ borderColor: colors.border }}>
                    Düzenle
                  </button>
                  <button onClick={() => pasifYap(o.id)} className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: colors.border, color: '#dc2626' }}>
                    Pasif
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm" style={{ color: colors.muted }}>
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {modalOpen && (
        <Modal title={editing ? 'Öğrenci Düzenle' : 'Öğrenci Ekle'} onClose={() => setModalOpen(false)} onSave={saveOgrenci}>
          <FormGrid>
            <Field label="Ad Soyad *">
              <input value={form.ad_soyad || ''} onChange={(e) => setForm({ ...form, ad_soyad: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Sınıf">
              <select value={form.sinif || ''} onChange={(e) => setForm({ ...form, sinif: e.target.value })} className={inputClass}>
                <option value="">Seçiniz</option>
                {siniflar.map((s) => (
                  <option key={s.id} value={s.ad}>
                    {s.ad}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Veli Adı *">
              <input value={form.veli_ad || ''} onChange={(e) => setForm({ ...form, veli_ad: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Veli Telefon *">
              <input value={form.veli_telefon || ''} onChange={(e) => setForm({ ...form, veli_telefon: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Aidat (₺)">
              <input type="number" value={form.aidat_tutari || ''} onChange={(e) => setForm({ ...form, aidat_tutari: Number(e.target.value) })} className={inputClass} />
            </Field>
            <Field label="Alerjiler">
              <input value={form.alerjiler || ''} onChange={(e) => setForm({ ...form, alerjiler: e.target.value })} className={inputClass} />
            </Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}

function SiniflarTab({
  okul,
  siniflar,
  ogrenciler,
  onRefresh,
}: {
  okul: Okul
  siniflar: Sinif[]
  ogrenciler: Ogrenci[]
  onRefresh: () => Promise<void>
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Sinif | null>(null)
  const [form, setForm] = useState<Record<string, any>>({ kapasite: 20, renk: '#16a34a' })

  function openAdd() {
    setEditing(null)
    setForm({ kapasite: 20, renk: '#16a34a' })
    setModalOpen(true)
  }

  function openEdit(row: Sinif) {
    setEditing(row)
    setForm({ ...row })
    setModalOpen(true)
  }

  async function saveSinif() {
    const payload = { ...form, okul_id: okul.id }
    if (editing) await supabase.from('siniflar').update(payload).eq('id', editing.id)
    else await supabase.from('siniflar').insert(payload)
    setModalOpen(false)
    await onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: colors.accent }}>
          Sınıf Ekle
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {siniflar.map((s) => {
          const count = ogrenciler.filter((o) => o.sinif === s.ad).length
          return (
            <Card key={s.id}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold">{s.ad}</h4>
                  <Badge text={`${count} öğrenci`} tone="accent" />
                </div>
                <p className="text-sm" style={{ color: colors.muted }}>
                  {s.yas_grubu || 'Yaş grubu tanımlı değil'}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(s)} className="rounded-md border px-3 py-1.5 text-xs" style={{ borderColor: colors.border }}>
                    Düzenle
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Sınıf Düzenle' : 'Sınıf Ekle'} onClose={() => setModalOpen(false)} onSave={saveSinif}>
          <FormGrid>
            <Field label="Sınıf Adı">
              <input value={form.ad || ''} onChange={(e) => setForm({ ...form, ad: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Yaş Grubu">
              <input value={form.yas_grubu || ''} onChange={(e) => setForm({ ...form, yas_grubu: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Kapasite">
              <input type="number" value={form.kapasite || 20} onChange={(e) => setForm({ ...form, kapasite: Number(e.target.value) })} className={inputClass} />
            </Field>
            <Field label="Öğretmen">
              <input value={form.ogretmen || ''} onChange={(e) => setForm({ ...form, ogretmen: e.target.value })} className={inputClass} />
            </Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}

function PersonelTab({
  okul,
  personel,
  siniflar,
  onRefresh,
}: {
  okul: Okul
  personel: PersonelRow[]
  siniflar: Sinif[]
  onRefresh: () => Promise<void>
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({ rol: 'ogretmen' })

  async function savePersonel() {
    await supabase.from('personel').insert({ okul_id: okul.id, ...form, aktif: true })
    setModalOpen(false)
    setForm({ rol: 'ogretmen' })
    await onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModalOpen(true)} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: colors.accent }}>
          Personel Ekle
        </button>
      </div>
      <Card>
        <div className="space-y-2">
          {personel.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold" style={{ background: colors.accentLight, color: colors.accent }}>
                  {initials(p.ad_soyad)}
                </div>
                <div>
                  <p className="text-sm font-medium">{p.ad_soyad}</p>
                  <p className="text-xs" style={{ color: colors.muted }}>
                    {p.telefon || 'Telefon yok'}
                  </p>
                </div>
              </div>
              <Badge text={p.rol} tone="accent" />
            </div>
          ))}
          {personel.length === 0 && (
            <div className="py-10 text-center text-sm" style={{ color: colors.muted }}>
              Personel kaydı bulunamadı.
            </div>
          )}
        </div>
      </Card>

      {modalOpen && (
        <Modal title="Personel Ekle" onClose={() => setModalOpen(false)} onSave={savePersonel}>
          <FormGrid>
            <Field label="Ad Soyad">
              <input value={form.ad_soyad || ''} onChange={(e) => setForm({ ...form, ad_soyad: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Telefon">
              <input value={form.telefon || ''} onChange={(e) => setForm({ ...form, telefon: e.target.value })} className={inputClass} />
            </Field>
            <Field label="E-posta">
              <input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Rol">
              <select value={form.rol || 'ogretmen'} onChange={(e) => setForm({ ...form, rol: e.target.value })} className={inputClass}>
                <option value="ogretmen">Öğretmen</option>
                <option value="mudur">Müdür</option>
                <option value="yardimci">Yardımcı</option>
              </select>
            </Field>
            <Field label="Sınıf">
              <select value={form.sinif || ''} onChange={(e) => setForm({ ...form, sinif: e.target.value })} className={inputClass}>
                <option value="">Seçiniz</option>
                {siniflar.map((s) => (
                  <option key={s.id} value={s.ad}>
                    {s.ad}
                  </option>
                ))}
              </select>
            </Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}

function VelilerTab({ ogrenciler }: { ogrenciler: Ogrenci[] }) {
  const rows: VelilerTablosuRow[] = useMemo(() => {
    const map = new Map<string, VelilerTablosuRow>()
    ogrenciler.forEach((o) => {
      const key = `${o.veli_ad || ''}|${o.veli_telefon || ''}`
      if (!o.veli_ad && !o.veli_telefon) return
      if (!map.has(key)) {
        map.set(key, {
          veli_ad: o.veli_ad || '—',
          veli_telefon: o.veli_telefon || '—',
          ogrenci_adlari: [],
        })
      }
      map.get(key)?.ogrenci_adlari.push(o.ad_soyad)
    })
    return Array.from(map.values())
  }, [ogrenciler])

  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: colors.muted }}>
            <th className="border-b pb-3" style={{ borderColor: colors.border }}>Veli</th>
            <th className="border-b pb-3" style={{ borderColor: colors.border }}>Telefon</th>
            <th className="border-b pb-3" style={{ borderColor: colors.border }}>Öğrenci Bağlantısı</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.veli_ad}-${r.veli_telefon}`}>
              <td className="border-b py-3" style={{ borderColor: colors.border }}>{r.veli_ad}</td>
              <td className="border-b py-3" style={{ borderColor: colors.border }}>{r.veli_telefon}</td>
              <td className="border-b py-3" style={{ borderColor: colors.border }}>{r.ogrenci_adlari.join(', ')}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-10 text-center text-sm" style={{ color: colors.muted }}>
                Veli kaydı bulunamadı.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}

function AidatlarTab({
  okul,
  ay,
  setAy,
  aidatlar,
  ogrenciler,
  onRefresh,
}: {
  okul: Okul
  ay: string
  setAy: (value: string) => void
  aidatlar: AidatRow[]
  ogrenciler: Ogrenci[]
  onRefresh: () => Promise<void>
}) {
  const toplam = aidatlar.reduce((sum, row) => sum + Number(row.tutar || 0), 0)
  const odenen = aidatlar.filter((a) => a.odendi).reduce((sum, row) => sum + Number(row.tutar || 0), 0)

  async function aylikKayitUret() {
    const { data: mevcut } = await supabase.from('aidatlar').select('ogrenci_id').eq('okul_id', okul.id).eq('ay', ay)
    const ids = (mevcut || []).map((r: { ogrenci_id: number }) => r.ogrenci_id)
    const yeni = ogrenciler.filter((o) => !ids.includes(o.id))
    if (!yeni.length) return
    await supabase.from('aidatlar').insert(
      yeni.map((o) => ({
        okul_id: okul.id,
        ogrenci_id: o.id,
        ay,
        tutar: o.aidat_tutari || 3000,
        odendi: false,
      }))
    )
    await onRefresh()
  }

  async function odemeDurumuGuncelle(id: number, odendiMi: boolean) {
    await supabase.from('aidatlar').update({ odendi: odendiMi, odeme_tarihi: odendiMi ? today() : null }).eq('id', id)
    await onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input type="month" value={ay} onChange={(e) => setAy(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: colors.border }} />
        <button onClick={aylikKayitUret} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: colors.accent }}>
          Ay Kaydı Oluştur
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs" style={{ color: colors.muted }}>Toplam</p>
          <p className="text-xl font-semibold">{money(toplam)}</p>
        </Card>
        <Card>
          <p className="text-xs" style={{ color: colors.muted }}>Ödenen</p>
          <p className="text-xl font-semibold">{money(odenen)}</p>
        </Card>
        <Card>
          <p className="text-xs" style={{ color: colors.muted }}>Bekleyen</p>
          <p className="text-xl font-semibold">{money(toplam - odenen)}</p>
        </Card>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: colors.muted }}>
              <th className="border-b pb-3" style={{ borderColor: colors.border }}>Öğrenci</th>
              <th className="border-b pb-3" style={{ borderColor: colors.border }}>Tutar</th>
              <th className="border-b pb-3" style={{ borderColor: colors.border }}>Durum</th>
              <th className="border-b pb-3 text-right" style={{ borderColor: colors.border }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {aidatlar.map((a) => (
              <tr key={a.id} className="transition hover:bg-[#f9fafb]">
                <td className="border-b py-3" style={{ borderColor: colors.border }}>{a.ogrenciler?.ad_soyad || '—'}</td>
                <td className="border-b py-3" style={{ borderColor: colors.border }}>{money(a.tutar)}</td>
                <td className="border-b py-3" style={{ borderColor: colors.border }}>
                  {a.odendi ? <Badge text="Ödendi" tone="accent" /> : <Badge text="Bekleyen" tone="danger" />}
                </td>
                <td className="border-b py-3 text-right" style={{ borderColor: colors.border }}>
                  <button
                    onClick={() => odemeDurumuGuncelle(a.id, !a.odendi)}
                    className="rounded-md border px-2 py-1 text-xs"
                    style={{ borderColor: colors.border }}
                  >
                    {a.odendi ? 'Geri Al' : 'Ödendi İşaretle'}
                  </button>
                </td>
              </tr>
            ))}
            {aidatlar.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm" style={{ color: colors.muted }}>
                  Bu ay için aidat kaydı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function AyarlarTab({ okul, setOkul }: { okul: Okul; setOkul: (next: Okul) => void }) {
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setForm({ ...okul })
  }, [okul])

  async function saveSettings() {
    setSaving(true)
    await supabase
      .from('okullar')
      .update({ ad: form.ad, telefon: form.telefon, adres: form.adres, sifre: form.sifre, logo_url: form.logo_url || null })
      .eq('id', okul.id)
    setOkul({ ...okul, ...form })
    setSaving(false)
  }

  async function uploadLogo(file?: File | null) {
    if (!file) return
    setUploading(true)
    const path = `${okul.id}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const { error } = await supabase.storage.from('logos').upload(path, file, {
      contentType: file.type || 'image/png',
      upsert: true,
    })
    if (!error) {
      const { data } = supabase.storage.from('logos').getPublicUrl(path)
      setForm((prev: Record<string, any>) => ({ ...prev, logo_url: data.publicUrl }))
    }
    setUploading(false)
  }

  return (
    <div className="max-w-2xl">
      <Card title="Okul Ayarları">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: colors.muted }}>
              Logo Upload
            </label>
            <div className="flex items-center gap-3">
              {form.logo_url ? (
                <Image src={form.logo_url} alt="Logo" width={64} height={64} className="rounded-xl border object-cover" style={{ borderColor: colors.border }} unoptimized />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl text-sm font-semibold" style={{ background: colors.accentLight, color: colors.accent }}>
                  {initials(form.ad)}
                </div>
              )}
              <input type="file" accept="image/*" onChange={(e) => uploadLogo(e.target.files?.[0] ?? null)} className={inputClass} />
            </div>
            <p className="mt-1 text-xs" style={{ color: colors.muted }}>
              {uploading ? 'Logo yükleniyor...' : 'Bucket: logos'}
            </p>
          </div>

          <Field label="Okul Adı">
            <input value={form.ad || ''} onChange={(e) => setForm({ ...form, ad: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Telefon">
            <input value={form.telefon || ''} onChange={(e) => setForm({ ...form, telefon: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Adres">
            <input value={form.adres || ''} onChange={(e) => setForm({ ...form, adres: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Yönetici Şifresi">
            <input type="password" value={form.sifre || ''} onChange={(e) => setForm({ ...form, sifre: e.target.value })} className={inputClass} />
          </Field>

          <button onClick={saveSettings} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: colors.accent }}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </Card>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium" style={{ color: colors.muted }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
}

function Modal({
  title,
  onClose,
  onSave,
  children,
}: {
  title: string
  onClose: () => void
  onSave: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-white shadow-sm" style={{ borderColor: colors.border }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: colors.border }}>
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="text-sm" style={{ color: colors.muted }}>
            Kapat
          </button>
        </div>
        <div className="p-4">{children}</div>
        <div className="flex justify-end gap-2 border-t px-4 py-3" style={{ borderColor: colors.border }}>
          <button onClick={onClose} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: colors.border }}>
            İptal
          </button>
          <button onClick={onSave} className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: colors.accent }}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}
