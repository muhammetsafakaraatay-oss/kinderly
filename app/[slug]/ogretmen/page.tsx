'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { rolePath } from '@/lib/auth-helpers'
import { Ogrenci, Sinif } from '@/lib/types'

export default function OgretmenPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { session, role, okul: authOkul, loading, signOut } = useAuth()
  const [slug, setSlug] = useState('')
  const [okul, setOkul] = useState<any>(null)
  const [ad, setAd] = useState('')
  const [sinifSec, setSinifSec] = useState('')
  const [siniflar, setSiniflar] = useState<Sinif[]>([])
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [yoklama, setYoklama] = useState<Record<number, string>>({})
  const [activePage, setActivePage] = useState('messages')
  const [selectedOgr, setSelectedOgr] = useState<Ogrenci | null>(null)
  const [feed, setFeed] = useState<any[]>([])
  const [aktModal, setAktModal] = useState(false)
  const [aktType, setAktType] = useState('')
  const [aktForm, setAktForm] = useState<any>({})
  const [sideOpen, setSideOpen] = useState(false)
  const [gunlukModal, setGunlukModal] = useState(false)
  const [gunlukForm, setGunlukForm] = useState<any>({})

  const today = new Date().toISOString().split('T')[0]

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
    { id: 'photo', label: 'Fotoğraf', emoji: '📷', color: '#6979f8' },
  ]

  useEffect(() => { params.then(p => setSlug(p.slug)) }, [params])

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

    const currentSession = session
    const currentOkul = authOkul

    async function bootstrapTeacher() {
      setOkul(currentOkul)
      await loadSiniflar(Number(currentOkul.id))

      const { data: personel } = await supabase
        .from('personel')
        .select('ad_soyad, sinif')
        .eq('user_id', currentSession.user.id)
        .eq('okul_id', currentOkul.id)
        .maybeSingle()

      const teacherName = personel?.ad_soyad?.trim() || currentSession.user.email || 'Ogretmen'
      const teacherClass = personel?.sinif?.trim() || ''

      setAd(teacherName)
      setSinifSec(teacherClass)
      await loadData(Number(currentOkul.id), teacherClass)
    }

    bootstrapTeacher()
  }, [authOkul, loading, role, router, session, slug])

  async function loadSiniflar(okulId: number) {
    const { data: sinifData } = await supabase.from('siniflar').select('*').eq('okul_id', okulId).order('ad')
    setSiniflar(sinifData || [])
  }

  async function loadData(okulId: number, sinif: string) {
    const { data: ogr } = await supabase.from('ogrenciler').select('*').eq('okul_id', okulId).eq('aktif', true).order('ad_soyad')
    const filtered = sinif ? (ogr || []).filter(o => o.sinif === sinif) : (ogr || [])
    setOgrenciler(filtered)
    const { data: yok } = await supabase.from('yoklama').select('ogrenci_id,durum').eq('okul_id', okulId).eq('tarih', today)
    const s: Record<number, string> = {}
    yok?.forEach(y => s[y.ogrenci_id] = y.durum)
    setYoklama(s)
  }

  async function saveYoklama() {
    await supabase.from('yoklama').delete().eq('okul_id', okul.id).eq('tarih', today)
    const rows = Object.entries(yoklama).map(([id, durum]) => ({ okul_id: okul.id, ogrenci_id: parseInt(id), tarih: today, durum }))
    if (rows.length) await supabase.from('yoklama').insert(rows)
    alert('Yoklama kaydedildi ✓')
  }

  async function openOgrenci(o: Ogrenci) {
    setSelectedOgr(o)
    setActivePage('detail')
    const { data } = await supabase.from('aktiviteler').select('*').eq('okul_id', okul.id).eq('ogrenci_id', o.id).order('id', { ascending: false }).limit(20)
    setFeed(data || [])
  }

  function openAkt(type: string) {
    setAktType(type); setAktForm({}); setAktModal(true)
  }

  async function saveAkt() {
    if (!selectedOgr) return
    await supabase.from('aktiviteler').insert({
      okul_id: okul.id, ogrenci_id: selectedOgr.id, tarih: today,
      tur: aktType, detay: aktForm, kaydeden: ad, veli_gosterilsin: true
    })
    await supabase.from('bildirimler').insert({
      okul_id: okul.id, ogrenci_id: selectedOgr.id,
      baslik: AKT_TYPES.find(t => t.id === aktType)?.label || aktType,
      mesaj: selectedOgr.ad_soyad.split(' ')[0] + ' için kayıt eklendi.',
      tur: aktType, okundu: false
    })
    setAktModal(false)
    const { data } = await supabase.from('aktiviteler').select('*').eq('okul_id', okul.id).eq('ogrenci_id', selectedOgr.id).order('id', { ascending: false }).limit(20)
    setFeed(data || [])
    alert('Kaydedildi ✓')
  }

  async function saveGunluk() {
    if (!selectedOgr) return
    const existing = await supabase.from('gunluk_rapor').select('id').eq('okul_id', okul.id).eq('ogrenci_id', selectedOgr.id).eq('tarih', today).single()
    if (existing.data) {
      await supabase.from('gunluk_rapor').update({ ...gunlukForm, kaydeden: ad }).eq('id', existing.data.id)
    } else {
      await supabase.from('gunluk_rapor').insert({ okul_id: okul.id, ogrenci_id: selectedOgr.id, tarih: today, ...gunlukForm, kaydeden: ad })
    }
    setGunlukModal(false)
    alert('Günlük rapor kaydedildi ✓')
  }

  if (loading || !session || !okul) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Panel hazirlaniyor...
      </div>
    )
  }

  const geldi = Object.values(yoklama).filter(v => v === 'geldi').length

  return (
    <div className="max-w-screen-sm mx-auto min-h-screen bg-white flex flex-col">
      {sideOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSideOpen(false)} />}

      {/* Side menu */}
      <div className={`fixed top-0 left-0 w-72 h-full bg-white z-50 flex flex-col shadow-xl transition-transform duration-300 ${sideOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 pt-10">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg mb-2">
            {ad.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div className="text-white font-semibold">{ad}</div>
          <div className="text-indigo-200 text-sm">{sinifSec}</div>
        </div>
        <nav className="flex-1 py-2">
          {[['messages','💬','Öğrenciler'],['attendance','📋','Yoklama'],['activity','⚡','Aktiviteler']].map(([id,icon,label]) => (
            <button key={id} onClick={() => { setActivePage(id); setSideOpen(false) }}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium ${activePage === id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span className="text-lg">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button onClick={async () => { await signOut(); router.replace('/giris') }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">
            🚪 Çıkış Yap
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSideOpen(true)} className="text-white text-2xl">☰</button>
          <div className="bg-white/15 border border-white/30 rounded-lg px-4 py-1.5 text-white text-sm font-semibold">{sinifSec || 'Tüm Sınıf'}</div>
          <div className="w-8" />
        </div>
      </div>

      <div className="flex-1 bg-gray-50">

        {/* ÖĞRENCİ GRİD */}
        {activePage === 'messages' && (
          <div className="grid grid-cols-3 gap-px bg-gray-200">
            {ogrenciler.map(o => {
              const checked = yoklama[o.id] === 'geldi'
              return (
                <div key={o.id} onClick={() => openOgrenci(o)}
                  className="bg-white p-4 flex flex-col items-center gap-1 cursor-pointer active:bg-gray-50">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${checked ? 'opacity-100' : 'opacity-40'}`}>🌸</div>
                    {checked && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">✓</div>}
                  </div>
                  <div className={`text-xs font-medium text-center ${checked ? 'text-gray-800' : 'text-gray-300'}`}>{o.ad_soyad.split(' ')[0]}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* YOKLAMA */}
        {activePage === 'attendance' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-4 text-sm font-semibold">
                <span className="text-teal-600">✅ {geldi}</span>
                <span className="text-red-500">❌ {ogrenciler.length - geldi}</span>
              </div>
              <button onClick={saveYoklama} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">💾 Kaydet</button>
            </div>
            <div className="space-y-2">
              {ogrenciler.map(o => {
                const d = yoklama[o.id] || ''
                return (
                  <div key={o.id} className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100">
                    <div className="text-2xl">🌸</div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{o.ad_soyad}</div>
                      <div className="text-xs text-gray-400">{d === 'geldi' ? '✅ Geldi' : d === 'gelmedi' ? '❌ Gelmedi' : d === 'izinli' ? '🏖️ İzinli' : 'İşaretlenmedi'}</div>
                    </div>
                    <div className="flex gap-1">
                      {[['geldi','✓','bg-teal-500'],['gelmedi','✗','bg-red-500'],['izinli','İ','bg-orange-400']].map(([val,label,color]) => (
                        <button key={val} onClick={() => setYoklama(s => ({ ...s, [o.id]: val }))}
                          className={`text-xs px-2 py-1.5 rounded-lg font-bold ${d === val ? color + ' text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* AKTİVİTELER */}
        {activePage === 'activity' && (
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">Öğrenci seçmek için ana sayfadan tıklayın.</p>
            <div className="grid grid-cols-3 gap-3">
              {AKT_TYPES.map(t => (
                <button key={t.id} onClick={() => { if (!selectedOgr) { alert('Önce öğrenci seçin!'); return }; openAkt(t.id) }}
                  className="rounded-xl p-3 flex flex-col items-center gap-1 text-white text-xs font-semibold"
                  style={{ background: t.color }}>
                  <span className="text-2xl">{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ÖĞRENCİ DETAY */}
        {activePage === 'detail' && selectedOgr && (
          <div>
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
              <button onClick={() => setActivePage('messages')} className="text-gray-500 text-xl">‹</button>
              <span className="font-semibold flex-1">{selectedOgr.ad_soyad.split(' ')[0]}</span>
              <button onClick={() => { setGunlukForm({}); setGunlukModal(true) }}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold">📋 Günlük</button>
            </div>

            <div className="p-4 text-center border-b border-gray-100 bg-white">
              <div className="text-6xl mb-2">🌸</div>
              <div className="font-bold">{selectedOgr.ad_soyad}</div>
              <div className="text-sm text-gray-500">{selectedOgr.sinif}</div>
              {selectedOgr.alerjiler && <div className="mt-2 text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-1 inline-block">🚨 {selectedOgr.alerjiler}</div>}
              {selectedOgr.ilac && <div className="mt-1 text-xs text-orange-500 font-semibold bg-orange-50 rounded-lg px-3 py-1 inline-block">💊 {selectedOgr.ilac}</div>}
            </div>

            <div className="p-4 grid grid-cols-5 gap-2 border-b border-gray-100 bg-white">
              {AKT_TYPES.map(t => (
                <button key={t.id} onClick={() => openAkt(t.id)}
                  className="rounded-xl p-2 flex flex-col items-center gap-1 text-white text-xs font-semibold"
                  style={{ background: t.color }}>
                  <span className="text-xl">{t.emoji}</span>
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-white">
              {feed.length ? feed.map(a => {
                const tp = AKT_TYPES.find(x => x.id === a.tur)
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: tp?.color || '#9e9e9e' }}>{tp?.emoji || '📋'}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{tp?.label || a.tur}{a.detay?.not ? ' · ' + a.detay.not : ''}</div>
                      <div className="text-xs text-gray-400">{a.tarih} · {a.kaydeden}</div>
                    </div>
                  </div>
                )
              }) : <div className="text-center py-12 text-gray-400 text-sm">Aktivite yok</div>}
            </div>
          </div>
        )}
      </div>

      {/* Alt Nav */}
      {activePage !== 'detail' && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-screen-sm bg-white border-t border-gray-200 flex z-30">
          {[['messages','💬','Öğrenciler'],['attendance','📋','Yoklama'],['activity','⚡','Aktivite']].map(([id,icon,label]) => (
            <button key={id} onClick={() => setActivePage(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 pb-4 text-xs font-medium ${activePage === id ? 'text-indigo-600' : 'text-gray-400'}`}>
              <span className="text-2xl">{icon}</span>{label}
            </button>
          ))}
        </div>
      )}

      {/* Aktivite Modal */}
      {aktModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-screen-sm">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold">{AKT_TYPES.find(t => t.id === aktType)?.emoji} {AKT_TYPES.find(t => t.id === aktType)?.label} — {selectedOgr?.ad_soyad.split(' ')[0]}</h3>
              <button onClick={() => setAktModal(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="p-5 space-y-3">
              {aktType === 'food' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">ÖĞÜN</label>
                    <div className="flex gap-2 flex-wrap">
                      {['Kahvaltı','Kuşluk','Öğle','İkindi'].map(v => (
                        <button key={v} onClick={() => setAktForm({...aktForm, ogun: v})}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${aktForm.ogun === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">NE KADAR YEDİ?</label>
                    <div className="flex gap-2 flex-wrap">
                      {['Hepsini','Çoğunu','Birazını','Hiç'].map(v => (
                        <button key={v} onClick={() => setAktForm({...aktForm, yeme: v})}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${aktForm.yeme === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {aktType === 'nap' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">UYKU DURUMU</label>
                  <div className="flex gap-2">
                    {['Başladı','Kontrol','Bitti'].map(v => (
                      <button key={v} onClick={() => setAktForm({...aktForm, nap: v})}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border ${aktForm.nap === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600'}`}>{v}</button>
                    ))}
                  </div>
                </div>
              )}
              {aktType === 'health' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Ateş (°C)</label>
                  <input type="number" step="0.1" value={aktForm.ates || ''} onChange={e => setAktForm({...aktForm, ates: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              )}
              {aktType === 'meds' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">İlaç Adı *</label>
                    <input value={aktForm.ilac || ''} onChange={e => setAktForm({...aktForm, ilac: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Doz</label>
                    <input value={aktForm.doz || ''} onChange={e => setAktForm({...aktForm, doz: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Not</label>
                <textarea value={aktForm.not || ''} onChange={e => setAktForm({...aktForm, not: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none resize-none" rows={3} />
              </div>
            </div>
            <div className="px-5 pb-8 pt-3 border-t border-gray-200 flex gap-2">
              <button onClick={() => setAktModal(false)} className="flex-1 border border-gray-300 py-3 rounded-xl text-sm text-gray-600 font-medium">İptal</button>
              <button onClick={saveAkt} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Günlük Rapor Modal */}
      {gunlukModal && selectedOgr && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-screen-sm">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold">📋 Günlük Rapor — {selectedOgr.ad_soyad.split(' ')[0]}</h3>
              <button onClick={() => setGunlukModal(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="p-5 space-y-3">
              {[['kahvalti','🍳 Kahvaltı','Ne yedi?'],['ogle','🍽️ Öğle','Ne yedi?'],['uyku_suresi','😴 Uyku','Ne kadar uyudu?'],['ruh_hali','😊 Ruh Hali','Nasıldı?']].map(([k,l,p]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{l}</label>
                  <input value={gunlukForm[k] || ''} onChange={e => setGunlukForm({...gunlukForm, [k]: e.target.value})}
                    placeholder={p} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">📝 Açıklama</label>
                <textarea value={gunlukForm.aciklama || ''} onChange={e => setGunlukForm({...gunlukForm, aciklama: e.target.value})}
                  placeholder="Gün hakkında not..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none resize-none" rows={3} />
              </div>
            </div>
            <div className="px-5 pb-8 pt-3 border-t border-gray-200 flex gap-2">
              <button onClick={() => setGunlukModal(false)} className="flex-1 border border-gray-300 py-3 rounded-xl text-sm text-gray-600">İptal</button>
              <button onClick={saveGunluk} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
