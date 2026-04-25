'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  CONTACT_TYPES,
  contactKey,
  contactKeyFromValues,
  formatChildCode,
  getContactType,
  isJoinedContact,
  isValidEmail,
  normalizeEmail,
  normalizePhone,
  sameContact,
  statusFor,
} from '@/lib/contact-utils'
import type { ContactType, Ogrenci, Okul, VeliRecord } from '@/lib/types'

type VeliForm = {
  ad_soyad: string
  email: string
  telefon: string
  yakinlik: string
  iliski_tipi: ContactType
  teslim_alabilir: boolean
  acil_durum_kisisi: boolean
  notlar: string
}

type ChildCodeState = {
  studentId: number
  studentName: string
  code: string
} | null

const EMPTY_FORM: VeliForm = {
  ad_soyad: '',
  email: '',
  telefon: '',
  yakinlik: '',
  iliski_tipi: 'parent',
  teslim_alabilir: true,
  acil_durum_kisisi: false,
  notlar: '',
}

function copyText(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value)
  }
  return Promise.reject(new Error('Kopyalama desteklenmiyor'))
}

function childCodeShareText(okulAd: string, studentName: string, code: string) {
  return [
    `${okulAd} veli bağlantısı`,
    '',
    `${studentName} için çocuk kodu: ${formatChildCode(code)}`,
    '',
    'KinderX uygulamasında veya web giriş ekranında Okula Bağlan seçeneğini açın.',
    'Bu 10 haneli çocuk kodunu girin.',
  ].join('\n')
}

export function VelilerPanel({
  okul,
  onChanged,
}: {
  okul: Okul
  onChanged?: () => void | Promise<void>
}) {
  const [veliler, setVeliler] = useState<VeliRecord[]>([])
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ContactType | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<VeliForm>(EMPTY_FORM)
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [invitingId, setInvitingId] = useState<number | null>(null)
  const [sharingStudentId, setSharingStudentId] = useState<number | null>(null)
  const [rotatingStudentId, setRotatingStudentId] = useState<number | null>(null)
  const [banner, setBanner] = useState('')
  const [codeModal, setCodeModal] = useState<ChildCodeState>(null)

  const editingContact = useMemo(
    () => veliler.find((item) => Number(item.id) === editingId) ?? null,
    [editingId, veliler]
  )

  useEffect(() => {
    void load()
  }, [okul.id])

  async function load() {
    setLoading(true)
    const [veliRes, ogrenciRes] = await Promise.all([
      supabase
        .from('veliler')
        .select('id, okul_id, ogrenci_id, user_id, ad_soyad, email, telefon, aktif, iliski_tipi, yakinlik, teslim_alabilir, acil_durum_kisisi, notlar, davet_gonderildi_at, son_davet_durumu, teslim_pin, ogrenciler(id, ad_soyad, sinif, baglanti_kodu)')
        .eq('okul_id', okul.id)
        .order('ad_soyad'),
      supabase
        .from('ogrenciler')
        .select('id, ad_soyad, sinif, baglanti_kodu')
        .eq('okul_id', okul.id)
        .eq('aktif', true)
        .order('ad_soyad'),
    ])

    if (veliRes.error) {
      setBanner(`Kişiler yüklenemedi: ${veliRes.error.message}`)
      setVeliler([])
    } else {
      setVeliler(((veliRes.data || []) as VeliRecord[]).map((item) => ({
        ...item,
        iliski_tipi: getContactType(item.iliski_tipi),
      })))
    }

    if (ogrenciRes.error) {
      setBanner(`Öğrenciler yüklenemedi: ${ogrenciRes.error.message}`)
      setOgrenciler([])
    } else {
      setOgrenciler((ogrenciRes.data || []) as Ogrenci[])
    }

    setLoading(false)
  }

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSelectedStudentIds(ogrenciler.length === 1 ? [ogrenciler[0].id] : [])
    setModalOpen(true)
  }

  function openEdit(item: VeliRecord) {
    const key = contactKey(item)
    const relatedRows = key ? veliler.filter((row) => sameContact(contactKey(row), key)) : [item]
    const studentIds = Array.from(
      new Set(relatedRows.map((row) => Number(row.ogrenci_id)).filter((id) => Number.isFinite(id)))
    )

    setEditingId(Number(item.id))
    setForm({
      ad_soyad: item.ad_soyad || '',
      email: item.email || '',
      telefon: item.telefon || '',
      yakinlik: item.yakinlik || '',
      iliski_tipi: getContactType(item.iliski_tipi),
      teslim_alabilir: item.teslim_alabilir ?? getContactType(item.iliski_tipi) !== 'emergency',
      acil_durum_kisisi: item.acil_durum_kisisi ?? getContactType(item.iliski_tipi) === 'emergency',
      notlar: item.notlar || '',
    })
    setSelectedStudentIds(studentIds.length ? studentIds : item.ogrenci_id ? [Number(item.ogrenci_id)] : [])
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSelectedStudentIds([])
  }

  function toggleStudent(id: number) {
    setSelectedStudentIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  async function showChildCode(studentId: number, studentName: string | null | undefined, code: string | null | undefined) {
    const normalizedCode = String(code || '').replace(/\D/g, '')
    if (!normalizedCode) {
      window.alert('Bu öğrenci için çocuk kodu bulunamadı.')
      return
    }

    setCodeModal({
      studentId,
      studentName: studentName || 'Öğrenci',
      code: normalizedCode,
    })
  }

  async function shareChildCode(studentId: number, studentName: string | null | undefined, code: string | null | undefined) {
    const normalizedCode = String(code || '').replace(/\D/g, '')
    if (!normalizedCode) {
      window.alert('Bu öğrenci için çocuk kodu bulunamadı.')
      return
    }

    const message = childCodeShareText(okul.ad || 'KinderX', studentName || 'Öğrenci', normalizedCode)
    setSharingStudentId(studentId)

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'KinderX çocuk kodu',
          text: message,
        })
      } else {
        await copyText(message)
        setBanner('Çocuk kodu panoya kopyalandı.')
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Çocuk kodu paylaşılamadı.'
      setBanner(messageText)
    } finally {
      setSharingStudentId(null)
    }
  }

  async function sendParentInvite(item: Pick<VeliRecord, 'id' | 'email' | 'iliski_tipi'>) {
    const type = CONTACT_TYPES[getContactType(item.iliski_tipi)]
    const email = normalizeEmail(item.email)

    if (!type.canInvite) {
      return { ok: false, message: 'Bu kişi tipi uygulama hesabı açmaz; sadece okul içi kayıt olarak tutulur.' }
    }

    if (!email) {
      return { ok: false, message: 'Davet göndermek için önce bu kişiye e-posta ekleyin.' }
    }

    const { data, error } = await supabase.functions.invoke('invite-parent', {
      body: {
        okul_id: okul.id,
        veli_id: item.id,
        email,
      },
    })

    if (error || data?.ok === false) {
      return { ok: false, message: data?.error || error?.message || 'Lütfen tekrar deneyin.' }
    }

    const fallbackToCode = data?.email_sent === false && data?.status !== 'linked-existing-user'

    return {
      ok: true,
      fallbackToCode,
      message: fallbackToCode
        ? `E-posta gönderilemedi ama veli çocuk kodu ile bağlanabilir.${data?.warning ? ` ${data.warning}` : ''}`
        : data?.warning
        ? data.warning
        : data?.status === 'linked-existing-user'
        ? 'Bu e-posta mevcut hesapla eşleştirildi. Aynı kişi bağlı çocukları görebilir.'
        : 'Kurulum bağlantısı e-posta adresine gönderildi.',
    }
  }

  async function save(mode: 'save' | 'invite' | 'code' = 'save') {
    const adSoyad = form.ad_soyad.trim()
    const email = normalizeEmail(form.email)
    const telefon = form.telefon.trim()
    const phoneKey = normalizePhone(telefon)
    const original = editingId ? veliler.find((item) => Number(item.id) === editingId) : null
    const originalKey = original ? contactKey(original) : contactKeyFromValues(email, telefon)
    const relatedRows = originalKey
      ? veliler.filter((item) => sameContact(contactKey(item), originalKey))
      : original ? [original] : []
    const emailChanged = Boolean(original && normalizeEmail(original.email) && normalizeEmail(original.email) !== email)
    const linkedUserId = !emailChanged ? relatedRows.find((item) => item.user_id)?.user_id ?? null : null

    if (!adSoyad) {
      setBanner('Ad soyad zorunlu.')
      return
    }

    if (!email && !phoneKey) {
      setBanner('Kişi için e-posta veya telefon gerekir.')
      return
    }

    if (email && !isValidEmail(email)) {
      setBanner('Lütfen geçerli bir e-posta adresi girin.')
      return
    }

    if (!selectedStudentIds.length) {
      setBanner('Kişinin bağlı olduğu en az bir öğrenciyi seçin.')
      return
    }

    const contactType = CONTACT_TYPES[getContactType(form.iliski_tipi)]
    const payload: Record<string, unknown> = {
      okul_id: okul.id,
      ad_soyad: adSoyad,
      email: email || null,
      telefon: telefon || null,
      iliski_tipi: form.iliski_tipi,
      yakinlik: form.yakinlik.trim() || null,
      teslim_alabilir: form.teslim_alabilir,
      acil_durum_kisisi: form.acil_durum_kisisi,
      notlar: form.notlar.trim() || null,
      aktif: true,
    }

    if (emailChanged) {
      payload.user_id = null
      payload.davet_gonderildi_at = null
      payload.son_davet_durumu = null
    }

    setSaving(true)
    setBanner('')

    const updateIds = relatedRows.map((item) => Number(item.id)).filter((id) => Number.isFinite(id))
    if (updateIds.length) {
      const { error } = await supabase.from('veliler').update(payload).eq('okul_id', okul.id).in('id', updateIds)
      if (error) {
        setSaving(false)
        setBanner(error.message)
        return
      }
    }

    const existingStudentIds = new Set(
      relatedRows.map((item) => Number(item.ogrenci_id)).filter((id) => Number.isFinite(id))
    )
    const selectedStudentSet = new Set(selectedStudentIds)
    const removedIds = relatedRows
      .filter((item) => {
        const studentId = Number(item.ogrenci_id)
        return Number.isFinite(studentId) && !selectedStudentSet.has(studentId)
      })
      .map((item) => Number(item.id))
      .filter((id) => Number.isFinite(id))
    const rowsToInsert = selectedStudentIds
      .filter((studentId) => !existingStudentIds.has(studentId))
      .map((studentId) => ({
        ...payload,
        ogrenci_id: studentId,
        user_id: linkedUserId,
      }))

    if (rowsToInsert.length) {
      const { error } = await supabase.from('veliler').insert(rowsToInsert)
      if (error) {
        setSaving(false)
        setBanner(error.message)
        return
      }
    }

    if (removedIds.length) {
      const { error } = await supabase.from('veliler').update({ aktif: false }).eq('okul_id', okul.id).in('id', removedIds)
      if (error) {
        setSaving(false)
        setBanner(error.message)
        return
      }
    }

    await load()
    if (onChanged) await onChanged()
    setSaving(false)
    closeModal()

    let message = rowsToInsert.length > 1 ? 'Kişi birden fazla öğrenciye bağlandı.' : 'Kişi kaydı güncellendi.'
    let inviteFallbackToCode = false

    if (mode === 'invite' && contactType.canInvite && email) {
      const { data: inviteRow, error: inviteLookupError } = await supabase
        .from('veliler')
        .select('id, email, iliski_tipi')
        .eq('okul_id', okul.id)
        .eq('email', email)
        .in('ogrenci_id', selectedStudentIds)
        .limit(1)
        .maybeSingle()

      if (inviteLookupError || !inviteRow) {
        setBanner(`${message} Davet için kayıt bulunamadı.`)
        return
      }

      const inviteResult = await sendParentInvite(inviteRow as VeliRecord)
      inviteFallbackToCode = Boolean(inviteResult.fallbackToCode)
      message = inviteResult.ok
        ? `${message} ${inviteResult.message}`
        : `${message} Davet gönderilemedi: ${inviteResult.message}`
    }

    if (mode === 'code') {
      const student = ogrenciler.find((item) => selectedStudentIds.includes(item.id))
      if (student?.baglanti_kodu) {
        await showChildCode(student.id, student.ad_soyad, student.baglanti_kodu)
      }
      setBanner(`${message} Çocuk kodu gösterildi.`)
      return
    }

    if (inviteFallbackToCode) {
      const student = ogrenciler.find((item) => selectedStudentIds.includes(item.id))
      if (student?.baglanti_kodu) {
        await showChildCode(student.id, student.ad_soyad, student.baglanti_kodu)
      }
    }

    setBanner(message)
  }

  async function rotateStudentCode(studentId: number, studentName?: string | null) {
    const confirmed = window.confirm(`${studentName || 'Bu öğrenci'} için mevcut çocuk kodu yenilensin mi?`)
    if (!confirmed) return

    setRotatingStudentId(studentId)
    const { error } = await supabase.rpc('rotate_child_link_code', { target_ogrenci_id: studentId })
    setRotatingStudentId(null)

    if (error) {
      setBanner(error.message)
      return
    }

    await load()
    if (onChanged) await onChanged()
    setBanner('Çocuk kodu yenilendi.')
  }

  async function invite(item: VeliRecord) {
    setInvitingId(Number(item.id))
    const result = await sendParentInvite(item)
    setInvitingId(null)

    if (!result.ok) {
      setBanner(result.message)
      return
    }

    const childId = Number(item.ogrenci_id || item.ogrenciler?.id)
    if (result.fallbackToCode && Number.isFinite(childId) && item.ogrenciler?.baglanti_kodu) {
      await showChildCode(childId, item.ogrenciler?.ad_soyad, item.ogrenciler?.baglanti_kodu || '')
    }

    await load()
    if (onChanged) await onChanged()
    setBanner(result.message)
  }

  async function toggleAktif(item: VeliRecord) {
    const nextValue = !(item.aktif ?? true)
    const confirmed = window.confirm(
      nextValue
        ? `${item.ad_soyad || 'Bu kişi'} yeniden aktif olsun mu?`
        : `${item.ad_soyad || 'Bu kişi'} pasif hale gelsin mi?`
    )
    if (!confirmed) return

    const { error } = await supabase
      .from('veliler')
      .update({ aktif: nextValue })
      .eq('id', item.id)
      .eq('okul_id', okul.id)

    if (error) {
      setBanner(error.message)
      return
    }

    await load()
    if (onChanged) await onChanged()
  }

  const counts = useMemo(() => {
    const active = veliler.filter((item) => item.aktif !== false)
    const accountActive = active.filter((item) => isJoinedContact(item)).length
    const pendingInvite = active.filter((item) =>
      CONTACT_TYPES[getContactType(item.iliski_tipi)].canInvite && item.email && !isJoinedContact(item)
    ).length
    const codeReady = active.filter((item) =>
      CONTACT_TYPES[getContactType(item.iliski_tipi)].canInvite &&
      !isJoinedContact(item) &&
      item.ogrenciler?.baglanti_kodu
    ).length

    return { active: active.length, accountActive, pendingInvite, codeReady }
  }, [veliler])

  const filtered = useMemo(() => veliler.filter((item) => {
    const type = getContactType(item.iliski_tipi)
    const haystack = `${item.ad_soyad || ''} ${item.email || ''} ${item.telefon || ''} ${item.yakinlik || ''} ${item.ogrenciler?.ad_soyad || ''}`.toLocaleLowerCase('tr-TR')
    const matchesSearch = haystack.includes(search.trim().toLocaleLowerCase('tr-TR'))
    const matchesFilter = filter === 'all' ? true : type === filter
    return matchesSearch && matchesFilter
  }), [filter, search, veliler])

  const selectedType = CONTACT_TYPES[getContactType(form.iliski_tipi)]
  const canInviteFromForm = Boolean(form.email.trim())
    && CONTACT_TYPES[getContactType(form.iliski_tipi)].canInvite
    && !isJoinedContact(editingContact)
  const canShowCodeFromForm = selectedType.canInvite && selectedStudentIds.length > 0 && !isJoinedContact(editingContact)

  if (loading) {
    return (
      <div className="rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-8 text-center text-sm text-[rgba(255,255,255,0.54)]">
        Aile kişileri yükleniyor...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f59e0b]">Aile Kişileri</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Veli, aile ve teslim kişileri</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[rgba(255,255,255,0.62)]">
            E-posta daveti, çocuk bağlantı kodu, teslim PIN ve kişi tipleri artık web yönetim panelinden de düzenlenebilir.
          </p>
        </div>
        <button onClick={openAdd} className="rounded-2xl bg-[#4ade80] px-4 py-3 text-sm font-semibold text-black">
          + Yeni kişi
        </button>
      </div>

      {banner ? (
        <div className="rounded-2xl border border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.08)] px-4 py-3 text-sm text-[#d1fae5]">
          {banner}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Aktif kayıt', counts.active],
          ['Hesap aktif', counts.accountActive],
          ['Davet bekliyor', counts.pendingInvite],
          ['Kodla hazır', counts.codeReady],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[24px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[rgba(255,255,255,0.44)]">{label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-4 text-sm leading-7 text-[rgba(255,255,255,0.62)]">
        E-posta giderse veli linkten şifre kurar. Mail ulaşmazsa kişi kartındaki çocuk kodu ile <strong className="text-white">Okula Bağlan</strong> akışı kullanılabilir.
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Veli, telefon veya öğrenci ara..."
          className="min-w-0 flex-1 rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]"
        />
        <div className="flex flex-wrap gap-2">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Tümü</FilterButton>
          {(Object.keys(CONTACT_TYPES) as ContactType[]).map((type) => (
            <FilterButton key={type} active={filter === type} onClick={() => setFilter(type)}>
              {CONTACT_TYPES[type].label}
            </FilterButton>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[rgba(74,222,128,0.18)] bg-[#0b120b] px-5 py-10 text-center">
            <div className="text-lg font-semibold text-white">Kişi bulunamadı</div>
            <div className="mt-2 text-sm text-[rgba(255,255,255,0.54)]">Filtreleri değiştirin veya yeni kişi ekleyin.</div>
          </div>
        ) : filtered.map((item) => {
          const type = CONTACT_TYPES[getContactType(item.iliski_tipi)]
          const status = statusFor(item)
          const childId = Number(item.ogrenci_id || item.ogrenciler?.id)

          return (
            <div key={item.id} className={`rounded-[28px] border p-5 ${item.aktif === false ? 'border-[rgba(148,163,184,0.2)] bg-[#0b120b]/70' : 'border-[rgba(74,222,128,0.14)] bg-[#0b120b]'}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-white">{item.ad_soyad || 'Adsız kişi'}</div>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: type.bg, color: type.color }}>
                      {type.label}
                    </span>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-[rgba(255,255,255,0.62)]">
                    {item.yakinlik || type.desc}
                    {item.ogrenciler?.ad_soyad ? ` • ${item.ogrenciler.ad_soyad}` : ''}
                    {item.ogrenciler?.sinif ? ` • ${item.ogrenciler.sinif}` : ''}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-[rgba(255,255,255,0.62)]">
                    {item.email ? <span>✉️ {item.email}</span> : null}
                    {item.telefon ? <span>☎️ {item.telefon}</span> : null}
                    {item.teslim_alabilir ? <span>🔐 Teslim alabilir</span> : null}
                    {item.teslim_alabilir && item.teslim_pin ? <span>PIN {item.teslim_pin}</span> : null}
                    {item.acil_durum_kisisi ? <span>Acil durum</span> : null}
                  </div>
                  {item.ogrenciler?.baglanti_kodu ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => showChildCode(childId, item.ogrenciler?.ad_soyad, item.ogrenciler?.baglanti_kodu)}
                        className="rounded-full border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.08)] px-3 py-2 text-xs font-semibold text-[#f59e0b]"
                      >
                        Çocuk kodu: {formatChildCode(item.ogrenciler.baglanti_kodu)}
                      </button>
                      {Number.isFinite(childId) ? (
                        <button
                          onClick={() => rotateStudentCode(childId, item.ogrenciler?.ad_soyad)}
                          className="rounded-full border border-[rgba(245,158,11,0.18)] px-3 py-2 text-xs font-semibold text-[#fbbf24]"
                        >
                          {rotatingStudentId === childId ? 'Yenileniyor...' : 'Kodu yenile'}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openEdit(item)} className="rounded-2xl border border-[rgba(74,222,128,0.16)] px-4 py-2 text-sm font-semibold text-white">
                    Düzenle
                  </button>
                  {type.canInvite && item.email && !isJoinedContact(item) && item.aktif !== false ? (
                    <button
                      onClick={() => invite(item)}
                      className="rounded-2xl border border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] px-4 py-2 text-sm font-semibold text-[#4ade80]"
                    >
                      {invitingId === Number(item.id) ? 'Gönderiliyor...' : 'Davet gönder'}
                    </button>
                  ) : null}
                  {type.canInvite && item.ogrenciler?.baglanti_kodu && !isJoinedContact(item) && item.aktif !== false ? (
                    <button
                      onClick={() => shareChildCode(childId, item.ogrenciler?.ad_soyad, item.ogrenciler?.baglanti_kodu)}
                      className="rounded-2xl border border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.08)] px-4 py-2 text-sm font-semibold text-[#f59e0b]"
                    >
                      {sharingStudentId === childId ? 'Paylaşılıyor...' : 'Kodu paylaş'}
                    </button>
                  ) : null}
                  <button
                    onClick={() => toggleAktif(item)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${item.aktif === false ? 'border-[rgba(74,222,128,0.2)] text-[#4ade80]' : 'border-[rgba(239,68,68,0.25)] text-red-400'}`}
                  >
                    {item.aktif === false ? 'Aktifleştir' : 'Pasifleştir'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b]">
            <div className="flex items-start justify-between gap-4 border-b border-[rgba(74,222,128,0.14)] px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f59e0b]">{editingId ? 'Kişi Profili' : 'Yeni kişi'}</div>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">İlişki, erişim ve çocuk eşleştirme</h3>
              </div>
              <button onClick={closeModal} className="text-2xl text-[rgba(255,255,255,0.44)]">×</button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="rounded-2xl border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.08)] px-4 py-4 text-sm leading-7 text-[#fef3c7]">
                Önce kişi kaydını oluşturup daveti şimdi veya daha sonra gönderebilirsiniz. Veli ve Aile tipleri hesap alır; diğer tipler okul içi güvenlik kaydı olarak kalır.
              </div>

              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">Kişi tipi</div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {(Object.keys(CONTACT_TYPES) as ContactType[]).map((typeKey) => {
                    const type = CONTACT_TYPES[typeKey]
                    const active = form.iliski_tipi === typeKey
                    return (
                      <button
                        key={typeKey}
                        onClick={() => setForm((prev) => ({
                          ...prev,
                          iliski_tipi: typeKey,
                          teslim_alabilir: typeKey !== 'emergency',
                          acil_durum_kisisi: typeKey === 'emergency',
                        }))}
                        className={`rounded-[24px] border p-4 text-left transition ${active ? 'border-transparent' : 'border-[rgba(74,222,128,0.14)] bg-[#0d160d]'}`}
                        style={active ? { backgroundColor: type.bg, color: type.color } : undefined}
                      >
                        <div className={`text-sm font-semibold ${active ? '' : 'text-white'}`}>{type.label}</div>
                        <div className={`mt-2 text-xs leading-6 ${active ? '' : 'text-[rgba(255,255,255,0.54)]'}`}>{type.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ad Soyad *" value={form.ad_soyad} onChange={(value) => setForm((prev) => ({ ...prev, ad_soyad: value }))} placeholder="Örn: Ayşe Kaya" />
                <Field label="Yakınlık" value={form.yakinlik} onChange={(value) => setForm((prev) => ({ ...prev, yakinlik: value }))} placeholder="Anne, baba, teyze..." />
                <Field label="E-posta" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} placeholder="ornek@email.com" type="email" />
                <Field label="Telefon" value={form.telefon} onChange={(value) => setForm((prev) => ({ ...prev, telefon: value }))} placeholder="05xx xxx xx xx" />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">Bağlı öğrenciler</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {ogrenciler.map((ogrenci) => {
                    const active = selectedStudentIds.includes(ogrenci.id)
                    return (
                      <button
                        key={ogrenci.id}
                        onClick={() => toggleStudent(ogrenci.id)}
                        className={`rounded-[24px] border p-4 text-left transition ${active ? 'border-[#4ade80] bg-[rgba(74,222,128,0.08)]' : 'border-[rgba(74,222,128,0.14)] bg-[#0d160d]'}`}
                      >
                        <div className={`text-sm font-semibold ${active ? 'text-[#4ade80]' : 'text-white'}`}>{ogrenci.ad_soyad}</div>
                        <div className={`mt-1 text-xs ${active ? 'text-[#d1fae5]' : 'text-[rgba(255,255,255,0.54)]'}`}>{ogrenci.sinif || 'Sınıf bilgisi'}</div>
                        {ogrenci.baglanti_kodu ? (
                          <div className={`mt-2 text-xs ${active ? 'text-[#d1fae5]' : 'text-[rgba(255,255,255,0.48)]'}`}>
                            Kod {formatChildCode(ogrenci.baglanti_kodu)}
                          </div>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-4 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={form.teslim_alabilir}
                    onChange={(event) => setForm((prev) => ({ ...prev, teslim_alabilir: event.target.checked }))}
                  />
                  Çocuğu teslim alabilir
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-4 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={form.acil_durum_kisisi}
                    onChange={(event) => setForm((prev) => ({ ...prev, acil_durum_kisisi: event.target.checked }))}
                  />
                  Acil durumda aranacak kişi
                </label>
              </div>

              <Field
                label="Notlar"
                value={form.notlar}
                onChange={(value) => setForm((prev) => ({ ...prev, notlar: value }))}
                placeholder="Teslim notu, saat bilgisi veya özel açıklama..."
                textarea
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(74,222,128,0.14)] px-6 py-5">
              <div className="text-sm text-[rgba(255,255,255,0.54)]">
                {selectedType.label}: {selectedType.desc}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={closeModal} disabled={saving} className="rounded-2xl border border-[rgba(74,222,128,0.16)] px-4 py-3 text-sm font-semibold text-[rgba(255,255,255,0.7)]">
                  İptal
                </button>
                {canShowCodeFromForm ? (
                  <button onClick={() => save('code')} disabled={saving} className="rounded-2xl border border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-sm font-semibold text-[#f59e0b]">
                    {saving ? 'Kaydediliyor...' : 'Kaydet + Kod'}
                  </button>
                ) : null}
                {canInviteFromForm ? (
                  <button onClick={() => save('invite')} disabled={saving} className="rounded-2xl border border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] px-4 py-3 text-sm font-semibold text-[#4ade80]">
                    {saving ? 'Kaydediliyor...' : 'Kaydet + Davet'}
                  </button>
                ) : null}
                <button onClick={() => save('save')} disabled={saving} className="rounded-2xl bg-[#4ade80] px-4 py-3 text-sm font-semibold text-black">
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {codeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-[30px] border border-[rgba(245,158,11,0.22)] bg-[#0b120b] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f59e0b]">Çocuk Kodu</div>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{codeModal.studentName}</h3>
            <div className="mt-4 rounded-[24px] border border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.08)] px-5 py-6 text-center">
              <div className="text-xs uppercase tracking-[0.18em] text-[rgba(255,255,255,0.48)]">Bağlantı kodu</div>
              <div className="mt-3 text-4xl font-semibold tracking-[0.2em] text-white">{formatChildCode(codeModal.code)}</div>
              <div className="mt-3 text-sm text-[rgba(255,255,255,0.62)]">
                Web veya uygulamadaki <strong className="text-white">Okula Bağlan</strong> akışında kullanılır.
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  await copyText(childCodeShareText(okul.ad || 'KinderX', codeModal.studentName, codeModal.code))
                  setBanner('Çocuk kodu panoya kopyalandı.')
                }}
                className="flex-1 rounded-2xl border border-[rgba(245,158,11,0.22)] px-4 py-3 text-sm font-semibold text-[#fbbf24]"
              >
                Metni kopyala
              </button>
              <button
                onClick={() => shareChildCode(codeModal.studentId, codeModal.studentName, codeModal.code)}
                className="flex-1 rounded-2xl bg-[#f59e0b] px-4 py-3 text-sm font-semibold text-black"
              >
                Paylaş
              </button>
            </div>
            <button onClick={() => setCodeModal(null)} className="mt-3 w-full rounded-2xl border border-[rgba(74,222,128,0.16)] px-4 py-3 text-sm font-semibold text-[rgba(255,255,255,0.7)]">
              Kapat
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FilterButton({
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
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-[#4ade80] text-black' : 'border border-[rgba(74,222,128,0.14)] bg-[#0d160d] text-[rgba(255,255,255,0.7)]'}`}
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
  type = 'text',
  textarea = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  textarea?: boolean
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">{label}</div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-[120px] w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#4ade80]"
        />
      )}
    </label>
  )
}
