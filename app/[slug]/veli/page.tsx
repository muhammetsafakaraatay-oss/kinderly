'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Ogrenci } from '@/lib/types'

export default function VeliPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('')
  const [okul, setOkul] = useState<any>(null)
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [tel, setTel] = useState('')
  const [err, setErr] = useState('')
  const [activePage, setActivePage] = useState('home')
  const [selectedOgr, setSelectedOgr] = useState<Ogrenci | null>(null)
  const [feed, setFeed] = useState<any[]>([])
  const [aidatlar, setAidatlar] = useState<any[]>([])
  const [sideOpen, setSideOpen] = useState(false)
  const [feedFilter, setFeedFilter] = useState('30')
  const [typeFilter, setTypeFilter] = useState('')
  const [mesajlar, setMesajlar] = useState<any[]>([])
  const [yeniMesaj, setYeniMesaj] = useState('')
  const [duyurular, setDuyurular] = useState<any[]>([])
  const [etkinlikler, setEtkinlikler] = useState<any[]>([])
  const [fotograflar, setFotograflar] = useState<any[]>([])

  const today = new Date().toISOString().split('T')[0]

  const AKT_TYPES: Record<string, { label: string; emoji: string; color: string }> = {
    food: { label: 'Yemek', emoji: '🍎', color: '#00b884' },
    nap: { label: 'Uyku', emoji: '😴', color: '#3d4eb8' },
    potty: { label: 'Tuvalet', emoji: '🚽', color: '#00b8d4' },
    meds: { label: 'İlaç', emoji: '💊', color: '#f5a623' },
    incident: { label: 'Kaza', emoji: '🩹', color: '#f44336' },
    health: { label: 'Sağlık', emoji: '🌡️', color: '#7c4dff' },
    kudos: { label: 'Tebrik', emoji: '⭐', color: '#9c27b0' },
    note: { label: 'Not', emoji: '📝', color: '#00897b' },
    observation: { label: 'Gözlem', emoji: '👁️', color: '#8bc34a' },
    photo: { label: 'Fotoğraf', emoji: '📷', color: '#6979f8' },
    absence: { label: 'Devamsızlık', emoji: '📅', color: '#9e9e9e' },
    rapor: { label: 'Günlük Rapor', emoji: '📋', color: '#667eea' },
  }

  useEffect(() => { params.then(p => setSlug(p.slug)) }, [params])

  useEffect(() => {
    if (!slug) return
    const saved = sessionStorage.getItem('kinderly_veli_' + slug)
    if (saved) {
      const s = JSON.parse(saved)
      setOkul(s.okul); setOgrenciler(s.ogrenciler); setLoggedIn(true)
      if (s.ogrenciler.length > 0) setSelectedOgr(s.ogrenciler[0])
    }
  }, [slug])

  useEffect(() => {
    if (selectedOgr && okul) loadFeed()
  }, [selectedOgr, feedFilter, typeFilter])

  function formatTel(v: string) {
    const d = v.replace(/[^0-9]/g, '').slice(0, 11)
    let f = d.slice(0, 4)
    if (d.length > 4) f += ' ' + d.slice(4, 7)
    if (d.length > 7) f += ' ' + d.slice(7, 9)
    if (d.length > 9) f += ' ' + d.slice(9, 11)
    return f
  }

  async function doLogin() {
    const raw = tel.replace(/[^0-9]/g, '')
    if (raw.length < 10) { setErr('Geçerli telefon numarası girin!'); return }
    const son10 = raw.slice(-10)
    const { data: okData } = await supabase.from('okullar').select('*').eq('slug', slug).single()
    if (!okData) { setErr('Okul bulunamadı!'); return }
    const { data: ogr } = await supabase.from('ogrenciler').select('*')
      .eq('okul_id', okData.id).eq('aktif', true)
      .or(`veli_telefon.ilike.%${son10}%,veli2_telefon.ilike.%${son10}%`)
    if (!ogr || !ogr.length) { setErr('Bu numaraya kayıtlı öğrenci bulunamadı!'); return }
    setOkul(okData); setOgrenciler(ogr); setLoggedIn(true)
    setSelectedOgr(ogr[0])
    sessionStorage.setItem('kinderly_veli_' + slug, JSON.stringify({ okul: okData, ogrenciler: ogr }))
  }

  async function loadFeed() {
    if (!selectedOgr || !okul) return
    const from = new Date(); from.setDate(from.getDate() - parseInt(feedFilter))
    const fromStr = from.toISOString().split('T')[0]
    let q = supabase.from('aktiviteler').select('*').eq('okul_id', okul.id).eq('ogrenci_id', selectedOgr.id).gte('tarih', fromStr).order('id', { ascending: false })
    if (typeFilter) q = q.eq('tur', typeFilter)
    const { data } = await q
    setFeed(data || [])
  }

  async function loadAidat() {
    if (!okul) return
    let all: any[] = []
    for (const o of ogrenciler) {
      const { data } = await supabase.from('aidatlar').select('*').eq('okul_id', okul.id).eq('ogrenci_id', o.id).order('id', { ascending: false }).limit(12)
      if (data) all = [...all, ...data.map(a => ({ ...a, ogrenci: o }))]
    }
    setAidatlar(all)
  }

  async function loadMesajlar() {
    if (!selectedOgr || !okul) return
    const { data } = await supabase.from('mesajlar').select('*').eq('okul_id', okul.id)
      .or(`alici_id.eq.${selectedOgr.id},gonderen_id.eq.${selectedOgr.id}`)
      .order('olusturuldu')
    setMesajlar(data || [])
  }

  async function sendMesaj() {
    if (!yeniMesaj.trim() || !selectedOgr) return
    await supabase.from('mesajlar').insert({
      okul_id: okul.id, gonderen_tip: 'veli', gonderen_id: selectedOgr.id,
      alici_tip: 'okul', alici_id: okul.id, icerik: yeniMesaj, okundu: false,
      olusturuldu: new Date().toISOString()
    })
    setYeniMesaj(''); loadMesajlar()
  }

  async function loadDuyurular() {
    if (!okul) return
    const { data } = await supabase.from('duyurular').select('*').eq('okul_id', okul.id).order('tarih', { ascending: false })
    setDuyurular(data || [])
  }

  async function loadEtkinlikler() {
    if (!okul) return
    const { data } = await supabase.from('etkinlikler').select('*').eq('okul_id', okul.id).gte('tarih', today).order('tarih')
    setEtkinlikler(data || [])
  }

  async function loadFotograflar() {
    if (!okul) return
    const { data } = await supabase.from('fotograflar').select('*').eq('okul_id', okul.id).order('id', { ascending: false }).limit(30)
    setFotograflar(data || [])
  }

  if (!loggedIn) return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 pt-14 pb-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 text-9xl flex items-end justify-end pr-4">🌙</div>
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-3">🌱</div>
        <h1 className="text-2xl font-bold text-white">Veli Paneli</h1>
        <p className="text-indigo-200 text-sm mt-1">{slug}</p>
      </div>
      <div className="flex-1 bg-white rounded-t-3xl -mt-4 p-6">
        <label className="block text-xs font-semibold text-gray-500 mb-2">Telefon Numaranız</label>
        <input value={tel} onChange={e => setTel(formatTel(e.target.value))}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          placeholder="05xx xxx xx xx"
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-xl text-center tracking-widest font-semibold outline-none focus:border-indigo-500 mb-4" />
        <button onClick={doLogin} className="w-full bg-indigo-600 text-white rounded-xl py-4 font-semibold text-base">Giriş Yap</button>
        {err && <p className="text-red-500 text-sm text-center mt-3 font-semibold">{err}</p>}
      </div>
    </div>
  )

  const unpaidTotal = aidatlar.filter(a => !a.odendi).reduce((s, a) => s + Number(a.tutar), 0)

  return (
    <div className="max-w-screen-sm mx-auto min-h-screen bg-gray-50 flex flex-col pb-20">
      {sideOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSideOpen(false)} />}

      {/* Side menu */}
      <div className={`fixed top-0 left-0 w-72 h-full bg-white z-50 flex flex-col shadow-xl transition-transform duration-300 ${sideOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 pt-10">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl mb-2">🌸</div>
          <div className="text-white font-semibold">{ogrenciler[0]?.veli_ad || 'Veli'}</div>
          <div className="text-indigo-200 text-sm">{okul?.ad}</div>
        </div>
        <nav className="flex-1 py-2">
          {[
            ['home','🏠','Ana Sayfa'],
            ['child','👦','Çocuğum'],
            ['aidat','💰','Ödemeler'],
            ['mesaj','💬','Mesajlar'],
            ['galeri','📷','Galeri'],
            ['duyurular','📢','Duyurular'],
            ['takvim','📅','Takvim'],
          ].map(([id,icon,label]) => (
            <button key={id} onClick={() => {
              setActivePage(id); setSideOpen(false)
              if (id === 'aidat') loadAidat()
              if (id === 'mesaj') loadMesajlar()
              if (id === 'duyurular') loadDuyurular()
              if (id === 'takvim') loadEtkinlikler()
              if (id === 'galeri') loadFotograflar()
            }}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium ${activePage === id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span className="text-lg">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button onClick={() => { sessionStorage.removeItem('kinderly_veli_' + slug); setLoggedIn(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">
            🚪 Çıkış Yap
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-4 h-14">
        <button onClick={() => setSideOpen(true)} className="text-gray-500 text-2xl">☰</button>
        <div className="text-lg font-bold text-indigo-600">🌱 Kinderly</div>
        <div className="w-8" />
      </div>

      {/* ANA SAYFA */}
      {activePage === 'home' && (
        <div className="p-4 space-y-3">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-sm">Çocuklarım</span>
            </div>
            {ogrenciler.map(o => (
              <div key={o.id} onClick={() => { setSelectedOgr(o); setActivePage('child') }}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-2xl flex-shrink-0">🌸</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{o.ad_soyad}</div>
                  <div className="text-xs text-gray-400">{okul?.ad}</div>
                </div>
                <span className="text-gray-300 text-xl">›</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-sm">Aidat Ödemeleri</span>
            </div>
            <div className="p-4 text-center">
              {unpaidTotal > 0 ? (
                <>
                  <div className="text-3xl mb-2">🏫</div>
                  <p className="text-sm text-gray-500 mb-3">Bekleyen ödemeniz bulunmaktadır.</p>
                  <button onClick={() => { setActivePage('aidat'); loadAidat() }}
                    className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold">
                    Ödemeleri Görüntüle — ₺{unpaidTotal.toLocaleString('tr-TR')}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-sm text-gray-500">Tüm ödemeleriniz güncel!</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ÇOCUK SAYFASI */}
      {activePage === 'child' && selectedOgr && (
        <div>
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setActivePage('home')} className="text-gray-500 text-xl">‹ Geri</button>
            <span className="font-semibold flex-1 text-center">{selectedOgr.ad_soyad.split(' ')[0]}</span>
            <div className="w-12" />
          </div>
          <div className="bg-white text-center py-5 border-b border-gray-100">
            <div className="text-6xl mb-2">🌸</div>
            <div className="font-bold">{selectedOgr.ad_soyad}</div>
            <div className="text-sm text-gray-500">{selectedOgr.sinif}</div>
            {selectedOgr.alerjiler && <div className="mt-2 text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-1 inline-block">🚨 {selectedOgr.alerjiler}</div>}
          </div>
          <div className="flex border-b border-gray-200 bg-white">
            <select value={feedFilter} onChange={e => setFeedFilter(e.target.value)}
              className="flex-1 border-r border-gray-200 px-3 py-2.5 text-sm outline-none bg-white">
              <option value="7">Son 7 gün</option>
              <option value="30">Son 30 gün</option>
              <option value="90">Son 3 ay</option>
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm outline-none bg-white">
              <option value="">Tümü</option>
              {Object.entries(AKT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="bg-white">
            {feed.length ? feed.map(a => {
              const tp = AKT_TYPES[a.tur]
              const d = a.detay || {}
              let detail = ''
              if (a.tur === 'food') detail = (d.ogun || '') + (d.yeme ? ' · ' + d.yeme : '')
              else if (a.tur === 'nap') detail = d.nap || ''
              else if (a.tur === 'health') detail = (d.ates ? d.ates + '°C · ' : '') + (d.durum || '')
              else if (a.tur === 'meds') detail = d.ilac || ''
              else detail = d.not || ''
              return (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-50">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-0.5" style={{ background: tp?.color || '#9e9e9e' }}>{tp?.emoji || '📋'}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{tp?.label || a.tur}{detail ? ' | ' + detail : ''}</div>
                    {d.not && a.tur !== 'note' && <div className="text-xs text-gray-500 mt-0.5">{d.not}</div>}
                    <div className="text-xs text-gray-400 mt-0.5">{a.kaydeden || 'Öğretmen'} · {a.tarih}</div>
                  </div>
                  <button className="text-gray-200 text-xl self-center">♡</button>
                </div>
              )
            }) : (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">▽</div>
                <p className="text-sm">Aktivite bulunamadı</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AİDAT */}
      {activePage === 'aidat' && (
        <div className="p-4">
          <div className="bg-indigo-50 rounded-2xl p-4 mb-4">
            <div className="text-xs text-gray-500 mb-1">Güncel Bakiye</div>
            <div className="text-3xl font-bold">₺{unpaidTotal.toLocaleString('tr-TR')}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {aidatlar.length ? aidatlar.map(a => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                <div>
                  <div className="font-semibold text-sm">{a.ogrenci?.ad_soyad}</div>
                  <div className="text-xs text-gray-400">{a.ay}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">₺{Number(a.tutar).toLocaleString('tr-TR')}</div>
                  <div className={`text-xs font-semibold ${a.odendi ? 'text-teal-600' : 'text-red-500'}`}>{a.odendi ? 'Ödendi' : 'Bekliyor'}</div>
                </div>
              </div>
            )) : <div className="text-center py-12 text-gray-400 text-sm">Fatura yok</div>}
          </div>
        </div>
      )}

      {/* MESAJLAR */}
      {activePage === 'mesaj' && (
        <div className="flex flex-col h-[calc(100vh-120px)]">
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl">🏫</div>
            <div>
              <div className="font-semibold text-sm">{okul?.ad}</div>
              <div className="text-xs text-teal-600 font-semibold">● Çevrimiçi</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {mesajlar.length ? mesajlar.map(m => (
              <div key={m.id} className={`flex ${m.gonderen_tip === 'veli' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${m.gonderen_tip === 'veli' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white rounded-bl-sm shadow-sm'}`}>
                  {m.icerik}
                  <div className={`text-xs mt-1 ${m.gonderen_tip === 'veli' ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {new Date(m.olusturuldu).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                <div className="text-3xl mb-2">💬</div>
                <p>Henüz mesaj yok</p>
              </div>
            )}
          </div>
          <div className="bg-white border-t border-gray-200 p-3 flex gap-2">
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide" style={{ display: 'flex' }}>
              {['🤒 Gelmeyecek', '🕒 Erken alacağım', '💰 Aidat sorunu', '💬 Sorum var'].map(v => (
                <button key={v} onClick={() => setYeniMesaj(v)}
                  className="whitespace-nowrap text-xs border border-gray-200 rounded-full px-3 py-1.5 bg-white text-gray-600 flex-shrink-0">
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white border-t border-gray-100 p-3 flex gap-2">
            <input value={yeniMesaj} onChange={e => setYeniMesaj(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMesaj()}
              placeholder="Mesaj yazın..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500" />
            <button onClick={sendMesaj} className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center">➤</button>
          </div>
        </div>
      )}

      {/* GALERİ */}
      {activePage === 'galeri' && (
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            {fotograflar.map(f => (
              <div key={f.id} className="aspect-square rounded-xl overflow-hidden">
                <img src={f.url} className="w-full h-full object-cover" />
              </div>
            ))}
            {!fotograflar.length && <div className="col-span-3 text-center py-16 text-gray-400">📷 Fotoğraf yok</div>}
          </div>
        </div>
      )}

      {/* DUYURULAR */}
      {activePage === 'duyurular' && (
        <div className="p-4 space-y-3">
          {duyurular.length ? duyurular.map(d => (
            <div key={d.id} className={`bg-white rounded-2xl border p-4 ${d.onemli ? 'border-l-4 border-l-red-500 border-red-200' : 'border-gray-200'}`}>
              <div className="font-semibold text-sm mb-1">{d.onemli ? '⚠️ ' : ''}{d.baslik}</div>
              <div className="text-xs text-gray-500 mb-2">{d.tarih}</div>
              <div className="text-sm text-gray-600">{d.icerik}</div>
            </div>
          )) : <div className="text-center py-16 text-gray-400">📢 Duyuru yok</div>}
        </div>
      )}

      {/* TAKVİM */}
      {activePage === 'takvim' && (
        <div className="p-4 space-y-3">
          {etkinlikler.length ? etkinlikler.map(e => {
            const d = new Date(e.tarih)
            return (
              <div key={e.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="bg-indigo-600 text-white rounded-xl p-3 text-center min-w-12 flex-shrink-0">
                  <div className="text-xl font-bold leading-none">{d.getDate()}</div>
                  <div className="text-xs opacity-80">{d.toLocaleDateString('tr-TR', { month: 'short' })}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm">{e.baslik}</div>
                  <div className="text-xs text-gray-400">{e.aciklama || ''}</div>
                </div>
              </div>
            )
          }) : <div className="text-center py-16 text-gray-400">📅 Etkinlik yok</div>}
        </div>
      )}

      {/* Alt Nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-screen-sm bg-white border-t border-gray-200 flex z-30">
        {[
          ['home','🏠','Ana Sayfa'],
          ['child','👦','Çocuğum'],
          ['aidat','💰','Ödemeler'],
          ['mesaj','💬','Mesajlar'],
          ['galeri','📷','Galeri'],
        ].map(([id,icon,label]) => (
          <button key={id} onClick={() => {
            setActivePage(id)
            if (id === 'aidat') loadAidat()
            if (id === 'mesaj') loadMesajlar()
            if (id === 'galeri') loadFotograflar()
          }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 pb-4 text-xs font-medium ${activePage === id ? 'text-indigo-600' : 'text-gray-400'}`}>
            <span className="text-2xl">{icon}</span>{label}
          </button>
        ))}
      </div>
    </div>
  )
}