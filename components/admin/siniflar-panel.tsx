'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Ogrenci, Okul, Sinif } from '@/lib/types'

type SiniflarPanelProps = {
  dark: boolean
  okul: Okul
  ogrenciler: Ogrenci[]
  reload: () => Promise<void> | void
  siniflar: Sinif[]
}

type SinifFormState = {
  ad: string
  kapasite: number
  ogretmen: string
  renk: string
  yas_grubu: string
}

const DEFAULT_FORM: SinifFormState = {
  ad: '',
  kapasite: 20,
  ogretmen: '',
  renk: '#5c6bc0',
  yas_grubu: '',
}

function actionErrorMessage(error: { code?: string; message?: string } | null | undefined, fallback: string) {
  if (error?.code === '42501') return 'Bu işlem için yetkiniz bulunmuyor.'
  if (error?.code === '23505') return 'Bu sınıf adı zaten mevcut.'
  if (process.env.NODE_ENV !== 'production' && error?.message) return error.message
  return fallback
}

function Modal({
  children,
  dark,
  onClose,
  open,
  title,
}: {
  children: React.ReactNode
  dark: boolean
  onClose: () => void
  open: boolean
  title: string
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl ${dark ? 'border-[#252a33] bg-[#111317]' : 'border-gray-200 bg-white'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b px-5 py-4 ${dark ? 'border-[#252a33]' : 'border-gray-200'}`}>
          <h3 className={`text-base font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          <button onClick={onClose} className="text-sm text-gray-400 transition hover:text-gray-600">Kapat</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function SiniflarPanel({ dark, okul, ogrenciler, reload, siniflar }: SiniflarPanelProps) {
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Sinif | null>(null)
  const [studentModal, setStudentModal] = useState<Sinif | null>(null)
  const [form, setForm] = useState<SinifFormState>(DEFAULT_FORM)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const studentsByClass = useMemo(() => {
    return siniflar.reduce<Record<number, Ogrenci[]>>((accumulator, sinif) => {
      accumulator[sinif.id] = ogrenciler
        .filter((ogrenci) => ogrenci.sinif === sinif.ad)
        .sort((left, right) => left.ad_soyad.localeCompare(right.ad_soyad, 'tr'))
      return accumulator
    }, {})
  }, [ogrenciler, siniflar])

  function closeModal() {
    setModal(false)
    setEditing(null)
    setSaveError(null)
    setForm(DEFAULT_FORM)
  }

  function openCreateModal() {
    setEditing(null)
    setSaveError(null)
    setForm(DEFAULT_FORM)
    setModal(true)
  }

  function openEditModal(sinif: Sinif) {
    setEditing(sinif)
    setSaveError(null)
    setForm({
      ad: sinif.ad,
      kapasite: sinif.kapasite || 20,
      ogretmen: sinif.ogretmen || '',
      renk: sinif.renk || '#5c6bc0',
      yas_grubu: sinif.yas_grubu || '',
    })
    setModal(true)
  }

  async function save() {
    if (!form.ad.trim()) {
      setSaveError('Sınıf adı zorunlu.')
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const payload = {
        ...form,
        ad: form.ad.trim(),
        ogretmen: form.ogretmen.trim() || null,
        yas_grubu: form.yas_grubu.trim() || null,
        okul_id: okul.id,
      }

      const { error } = editing
        ? await supabase.from('siniflar').update(payload).eq('id', editing.id)
        : await supabase.from('siniflar').insert(payload)

      if (error) throw error

      closeModal()
      await reload()
    } catch (error) {
      setSaveError(actionErrorMessage(error as { code?: string; message?: string }, 'Sınıf kaydedilemedi. Lütfen tekrar deneyin.'))
    } finally {
      setSaving(false)
    }
  }

  async function removeClass(id: number) {
    if (!window.confirm('Silmek istediğinizden emin misiniz?')) return

    const { error } = await supabase.from('siniflar').delete().eq('id', id)
    if (error) {
      window.alert(actionErrorMessage(error, 'Sınıf silinemedi. Lütfen tekrar deneyin.'))
      return
    }
    await reload()
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={openCreateModal} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">+ Sınıf Ekle</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {siniflar.map((sinif) => {
          const students = studentsByClass[sinif.id] || []
          const count = students.length
          const capacity = sinif.kapasite || 20
          const percentage = Math.min(Math.round((count / capacity) * 100), 100)
          return (
            <div key={sinif.id} className={`overflow-hidden rounded-lg border ${dark ? 'border-[#252a33]' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => setStudentModal(sinif)}
                className="block w-full text-left cursor-pointer transition-opacity hover:opacity-90"
              >
                <div className="p-4 text-white" style={{ background: sinif.renk || '#5c6bc0' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold">{sinif.ad}</div>
                      <div className="text-sm opacity-80">{sinif.yas_grubu || ''} {sinif.ogretmen ? `· ${sinif.ogretmen}` : ''}</div>
                    </div>
                    <span className="rounded-full bg-white/15 px-2 py-1 text-xs font-semibold">
                      Öğrenciler
                    </span>
                  </div>
                </div>
              </button>

              <div className={`p-4 ${dark ? 'bg-[#111317]' : 'bg-white'}`}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-gray-500">Doluluk</span>
                  <span className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{count}/{capacity}</span>
                </div>
                <div className="mb-3 h-1.5 rounded-full bg-gray-200">
                  <div className="h-1.5 rounded-full" style={{ width: `${percentage}%`, background: sinif.renk || '#5c6bc0' }} />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => openEditModal(sinif)} className="flex-1 rounded-lg border border-gray-300 py-1.5 text-xs font-semibold transition hover:border-green-600 hover:text-green-700">✏️ Düzenle</button>
                  <button onClick={() => removeClass(sinif.id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-500">🗑</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={studentModal !== null}
        onClose={() => setStudentModal(null)}
        title={studentModal?.ad ?? ''}
        dark={dark}
      >
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {studentModal && (() => {
            const students = studentsByClass[studentModal.id] || []
            if (students.length === 0) {
              return <p className="text-sm text-gray-400">Bu sınıfta henüz öğrenci yok.</p>
            }
            return (
              <div className="space-y-3">
                {students.map((ogrenci) => (
                  <div
                    key={ogrenci.id}
                    className={`rounded-xl border p-3 ${dark ? 'border-[#252a33] bg-[#0d0f14]' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{ogrenci.ad_soyad}</div>
                    <div className="mt-1 space-y-0.5">
                      {ogrenci.dogum_tarihi && (
                        <div className="text-xs text-gray-500">
                          Doğum: {new Date(ogrenci.dogum_tarihi).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                      {ogrenci.alerjiler && (
                        <div className="text-xs text-orange-500">
                          Alerji: {ogrenci.alerjiler}
                        </div>
                      )}
                      {!ogrenci.dogum_tarihi && !ogrenci.alerjiler && (
                        <div className="text-xs text-gray-400">Ek bilgi yok.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </Modal>

      <Modal open={modal} onClose={closeModal} title={editing ? 'Sınıf Düzenle' : 'Sınıf Ekle'} dark={dark}>
        <div className="grid grid-cols-2 gap-3 p-5">
          {[
            { label: 'Sınıf Adı *', key: 'ad', full: true, type: 'text' },
            { label: 'Yaş Grubu', key: 'yas_grubu', type: 'text' },
            { label: 'Kapasite', key: 'kapasite', type: 'number' },
            { label: 'Öğretmen', key: 'ogretmen', full: true, type: 'text' },
          ].map((field) => (
            <div key={field.key} className={field.full ? 'col-span-2' : ''}>
              <label className="mb-1 block text-xs font-semibold text-gray-500">{field.label}</label>
              <input
                type={field.type}
                value={form[field.key as keyof SinifFormState] || ''}
                onChange={(event) => {
                  const value = field.key === 'kapasite' ? Number(event.target.value || 0) : event.target.value
                  setForm((current) => ({ ...current, [field.key]: value }))
                }}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${dark ? 'border-[#343a45] bg-[#1a1d23] text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
              />
            </div>
          ))}

          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Renk</label>
            <select
              value={form.renk}
              onChange={(event) => setForm((current) => ({ ...current, renk: event.target.value }))}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${dark ? 'border-[#343a45] bg-[#1a1d23] text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`}
            >
              {[['#5c6bc0', '🔵 Mor'], ['#26a69a', '🟢 Yeşil'], ['#ffa726', '🟡 Sarı'], ['#ef5350', '🔴 Kırmızı'], ['#42a5f5', '🔵 Mavi'], ['#ec407a', '🩷 Pembe']].map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {saveError && (
          <div className="px-5 pb-3">
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{saveError}</p>
          </div>
        )}

        <div className={`flex justify-end gap-2 border-t px-5 py-4 ${dark ? 'border-[#252a33]' : 'border-gray-200'}`}>
          <button onClick={closeModal} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 disabled:opacity-50">İptal</button>
          <button onClick={save} disabled={saving} className="min-w-[80px] rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
