'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildCheckInQrPayload } from '@/lib/checkin-qr'
import { getContactType } from '@/lib/contact-utils'
import { localDateTime } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase'
import { QrCodeSvg } from '@/components/shared/qr-code-svg'
import type { Okul, Ogrenci, VeliRecord } from '@/lib/types'

type PickupRecord = {
  id: number
  ogrenci_id: number
  tip: 'check_in' | 'check_out'
  teslim_alan_ad?: string | null
  teslim_alan_yakinlik?: string | null
  teslim_pin?: string | null
  notlar?: string | null
  created_at?: string | null
  ogrenciler?: { ad_soyad?: string | null; sinif?: string | null } | null
}

function todayStartIso() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function formatTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

export function TeslimPanel({
  okul,
  sessionUserId,
}: {
  okul: Okul
  sessionUserId?: string | null
}) {
  const [students, setStudents] = useState<Ogrenci[]>([])
  const [records, setRecords] = useState<PickupRecord[]>([])
  const [contacts, setContacts] = useState<VeliRecord[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [type, setType] = useState<'check_in' | 'check_out'>('check_in')
  const [personName, setPersonName] = useState('')
  const [relation, setRelation] = useState('')
  const [pin, setPin] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState('')

  useEffect(() => {
    void loadData()
  }, [okul.id])

  async function loadData() {
    setLoading(true)
    const [studentResult, recordResult, contactResult] = await Promise.all([
      supabase
        .from('ogrenciler')
        .select('id,ad_soyad,sinif')
        .eq('okul_id', okul.id)
        .eq('aktif', true)
        .order('ad_soyad'),
      supabase
        .from('teslim_kayitlari')
        .select('id,ogrenci_id,tip,teslim_alan_ad,teslim_alan_yakinlik,teslim_pin,notlar,created_at,ogrenciler(ad_soyad,sinif)')
        .eq('okul_id', okul.id)
        .gte('created_at', todayStartIso())
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('veliler')
        .select('id,ogrenci_id,ad_soyad,yakinlik,iliski_tipi,teslim_pin,teslim_alabilir,aktif')
        .eq('okul_id', okul.id)
        .eq('aktif', true)
        .order('ad_soyad'),
    ])

    if (studentResult.error) {
      setBanner(studentResult.error.message)
      setStudents([])
    } else {
      const nextStudents = (studentResult.data || []) as Ogrenci[]
      setStudents(nextStudents)
      setSelectedId((current) => current && nextStudents.some((item) => item.id === current) ? current : nextStudents[0]?.id ?? null)
    }

    setRecords((recordResult.data || []) as PickupRecord[])
    setContacts((contactResult.data || []) as VeliRecord[])
    setLoading(false)
  }

  const selectedStudent = useMemo(
    () => students.find((item) => item.id === selectedId) || null,
    [selectedId, students]
  )

  const selectedLatest = useMemo(
    () => records.find((record) => selectedStudent && Number(record.ogrenci_id) === Number(selectedStudent.id)),
    [records, selectedStudent]
  )

  const selectedContacts = useMemo(
    () => contacts.filter((contact) =>
      selectedStudent
      && Number(contact.ogrenci_id) === Number(selectedStudent.id)
      && (contact.teslim_alabilir || ['parent', 'family'].includes(getContactType(contact.iliski_tipi)))
    ),
    [contacts, selectedStudent]
  )

  const matchedPinContact = useMemo(() => {
    const normalized = pin.trim()
    if (!normalized) return null
    return selectedContacts.find((contact) => contact.teslim_pin === normalized) || null
  }, [pin, selectedContacts])

  async function saveRecord() {
    if (!selectedStudent) {
      setBanner('Teslim kaydı için önce öğrenci seçin.')
      return
    }

    const normalizedPin = pin.replace(/\D/g, '')
    const pinContact = normalizedPin ? selectedContacts.find((contact) => contact.teslim_pin === normalizedPin) || null : null

    if (normalizedPin && !pinContact) {
      setBanner('Bu PIN seçili öğrenci için kayıtlı teslim yetkilisiyle eşleşmedi.')
      return
    }

    if (type === 'check_out' && !personName.trim() && !pinContact) {
      setBanner('Çıkış kaydında kişi adını yazın veya kayıtlı teslim PIN kodunu doğrulayın.')
      return
    }

    setSaving(true)
    setBanner('')
    const { error } = await supabase.from('teslim_kayitlari').insert({
      okul_id: okul.id,
      ogrenci_id: selectedStudent.id,
      tip: type,
      teslim_alan_ad: pinContact?.ad_soyad || personName.trim() || null,
      teslim_alan_yakinlik: pinContact?.yakinlik || relation.trim() || null,
      teslim_pin: normalizedPin || null,
      teslim_veli_id: pinContact?.id || null,
      kayit_kaynagi: normalizedPin ? 'staff_pin' : 'staff_manual',
      notlar: note.trim() || null,
      kaydeden_user_id: sessionUserId || null,
    })
    setSaving(false)

    if (error) {
      setBanner(error.message)
      return
    }

    setPersonName('')
    setRelation('')
    setPin('')
    setNote('')
    await loadData()
    setBanner(type === 'check_in' ? 'Giriş kaydı oluşturuldu.' : 'Çıkış kaydı oluşturuldu.')
  }

  const qrPayload = buildCheckInQrPayload(okul.id)

  if (loading) {
    return (
      <div className="rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-8 text-center text-sm text-[rgba(255,255,255,0.54)]">
        Teslim ekranı hazırlanıyor...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className="rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f59e0b]">Check-in / Check-out</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Okul QR kodu</h2>
          <p className="mt-2 text-sm leading-7 text-[rgba(255,255,255,0.62)]">
            Veliler KinderX uygulaması veya web teslim ekranından bu QR kodu tarayıp 4 haneli PIN ile giriş/çıkış kaydı oluşturur.
          </p>
          <div className="mt-5 flex items-center justify-center rounded-[28px] bg-white p-5">
            <QrCodeSvg value={qrPayload} size={220} />
          </div>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(qrPayload)
              setBanner('QR doğrulama metni panoya kopyalandı.')
            }}
            className="mt-4 w-full rounded-2xl border border-[rgba(74,222,128,0.16)] px-4 py-3 text-sm font-semibold text-[rgba(255,255,255,0.7)]"
          >
            QR metnini kopyala
          </button>
        </div>

        <div className="space-y-5">
          {banner ? (
            <div className="rounded-2xl border border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.08)] px-4 py-3 text-sm text-[#d1fae5]">
              {banner}
            </div>
          ) : null}

          <div className="rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Öğrenci seç</div>
                <div className="mt-1 text-xs text-[rgba(255,255,255,0.48)]">{students.length} aktif öğrenci</div>
              </div>
              {selectedLatest ? (
                <div className="rounded-full bg-[rgba(245,158,11,0.08)] px-3 py-2 text-xs font-semibold text-[#fbbf24]">
                  Son kayıt: {selectedLatest.tip === 'check_in' ? 'Giriş' : 'Çıkış'} · {formatTime(selectedLatest.created_at)}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {students.map((student) => {
                const active = student.id === selectedId
                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedId(student.id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-[#4ade80] bg-[rgba(74,222,128,0.08)] text-[#d1fae5]' : 'border-[rgba(74,222,128,0.14)] bg-[#0d160d] text-white'}`}
                  >
                    <div className="text-sm font-semibold">{student.ad_soyad}</div>
                    <div className="mt-1 text-xs text-[rgba(255,255,255,0.48)]">{student.sinif || 'Sınıf'}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-5">
            <div className="flex flex-wrap gap-2">
              <ToggleButton active={type === 'check_in'} onClick={() => setType('check_in')}>
                Giriş
              </ToggleButton>
              <ToggleButton active={type === 'check_out'} onClick={() => setType('check_out')}>
                Çıkış
              </ToggleButton>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label={type === 'check_in' ? 'Getiren kişi' : 'Teslim alan kişi'} value={personName} onChange={setPersonName} placeholder={type === 'check_in' ? 'Opsiyonel' : 'Zorunlu'} />
              <Field label="Yakınlık" value={relation} onChange={setRelation} placeholder="Anne, baba, servis..." />
              <Field label="Veli PIN" value={pin} onChange={(value) => setPin(value.replace(/\D/g, '').slice(0, 4))} placeholder="4 haneli PIN" />
              <Field label="Not" value={note} onChange={setNote} placeholder="Opsiyonel not" />
            </div>

            {selectedContacts.length ? (
              <div className="mt-5 rounded-[24px] border border-[rgba(74,222,128,0.14)] bg-[#0d160d] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(255,255,255,0.44)]">Teslim alabilecek kişiler</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedContacts.map((contact) => (
                    <div key={contact.id} className="rounded-full border border-[rgba(74,222,128,0.16)] px-3 py-2 text-xs text-[rgba(255,255,255,0.72)]">
                      {contact.ad_soyad || 'Kişi'} · {contact.yakinlik || CONTACT_LABELS[getContactType(contact.iliski_tipi)]}
                      {contact.teslim_pin ? ` · PIN ${contact.teslim_pin}` : ''}
                    </div>
                  ))}
                </div>
                {matchedPinContact ? (
                  <div className="mt-3 rounded-2xl bg-[rgba(74,222,128,0.08)] px-3 py-3 text-sm text-[#d1fae5]">
                    {matchedPinContact.ad_soyad || 'Teslim yetkilisi'} doğrulandı.
                  </div>
                ) : pin.trim().length === 4 ? (
                  <div className="mt-3 rounded-2xl bg-[rgba(245,158,11,0.08)] px-3 py-3 text-sm text-[#fef3c7]">
                    PIN seçili öğrenci için eşleşmedi.
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              onClick={saveRecord}
              disabled={saving}
              className="mt-5 rounded-2xl bg-[#4ade80] px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydı al'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">Bugünkü teslim kayıtları</div>
            <div className="mt-1 text-xs text-[rgba(255,255,255,0.48)]">{localDateTime(new Date().toISOString())}</div>
          </div>
          <div className="rounded-full bg-[rgba(74,222,128,0.08)] px-3 py-2 text-xs font-semibold text-[#4ade80]">{records.length} kayıt</div>
        </div>

        <div className="mt-4 space-y-3">
          {records.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[rgba(74,222,128,0.18)] px-5 py-8 text-center text-sm text-[rgba(255,255,255,0.54)]">
              Bugün teslim kaydı yok.
            </div>
          ) : records.map((record) => (
            <div key={record.id} className="rounded-[24px] border border-[rgba(74,222,128,0.12)] bg-[#0d160d] px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {record.ogrenciler?.ad_soyad || 'Öğrenci'} · {record.tip === 'check_in' ? 'Giriş' : 'Çıkış'}
                  </div>
                  <div className="mt-1 text-xs text-[rgba(255,255,255,0.48)]">
                    {formatTime(record.created_at)}
                    {record.teslim_alan_ad ? ` · ${record.teslim_alan_ad}` : ''}
                    {record.teslim_alan_yakinlik ? ` (${record.teslim_alan_yakinlik})` : ''}
                    {record.teslim_pin ? ` · PIN ${record.teslim_pin}` : ''}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${record.tip === 'check_in' ? 'bg-[rgba(74,222,128,0.08)] text-[#4ade80]' : 'bg-[rgba(245,158,11,0.08)] text-[#fbbf24]'}`}>
                  {record.tip === 'check_in' ? 'Giriş' : 'Çıkış'}
                </span>
              </div>
              {record.notlar ? <div className="mt-3 text-sm text-[rgba(255,255,255,0.62)]">{record.notlar}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const CONTACT_LABELS = {
  parent: 'Veli',
  family: 'Aile',
  approved_pickup: 'Teslim yetkilisi',
  emergency: 'Acil durum',
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-[#4ade80] text-black' : 'border border-[rgba(74,222,128,0.14)] bg-[#0d160d] text-white'}`}
    >
      {children}
    </button>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]"
      />
    </label>
  )
}
