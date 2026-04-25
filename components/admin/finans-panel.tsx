'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { firstActiveContact } from '@/lib/contact-utils'
import { toLocalDateKey } from '@/lib/date-utils'
import {
  buildCategoryReport,
  buildCsv,
  buildFinansOverview,
  buildFinansYearSummary,
  buildMonthlyLedger,
  buildMonthlyReportHtml,
  buildSupplierReport,
  computeGiderSummary,
  createGider,
  createKategori,
  createSignedFaturaUrl,
  createTedarikci,
  deleteFaturaDosyasi,
  deleteGider,
  ensureRecurringExpensesForMonth,
  formatMoney,
  formatMonthLabel,
  getAvailableYears,
  getCurrentMonthKey,
  loadFinansSnapshot,
  markAsBekliyor,
  markAsOdendi,
  resolveAidatMonthKey,
  resolveGiderMonthKey,
  uploadFaturaDosyasi,
  updateGider,
  type AidatFinanceRow,
  type GiderDurum,
  type GiderRow,
  type KategoriRow,
  type OdemeYontemi,
  type TedarikciRow,
  type TekrarliPeriyot,
} from '@/lib/finans-web'
import { supabase } from '@/lib/supabase'
import type { Ogrenci, Okul, VeliRecord } from '@/lib/types'

type FinanceTab = 'ozet' | 'gelirler' | 'giderler' | 'tedarikciler' | 'raporlar'

type ExpenseDraft = {
  baslik: string
  kategori_id: string
  tutar: string
  fatura_tarihi: string
  son_odeme_tarihi: string
  tedarikci_id: string
  odeme_yontemi: OdemeYontemi | ''
  durum: GiderDurum
  fatura_no: string
  aciklama: string
  kdv_orani: string
  file: File | null
  tekrarli: boolean
  tekrarli_periyot: TekrarliPeriyot | ''
}

type SupplierDraft = {
  ad: string
  telefon: string
  vergi_no: string
  iban: string
  notlar: string
}

type CategoryDraft = {
  ad: string
  ikon: string
  renk: string
  butce_aylik: string
}

const FINANCE_TABS: Array<{ id: FinanceTab; label: string; desc: string }> = [
  { id: 'ozet', label: 'Özet', desc: 'Aylık finans görünümü' },
  { id: 'gelirler', label: 'Gelirler', desc: 'Aidatlar ve tahsilat' },
  { id: 'giderler', label: 'Giderler', desc: 'Masraflar ve faturalar' },
  { id: 'tedarikciler', label: 'Tedarikçiler', desc: 'Tedarikçi ve kategori yönetimi' },
  { id: 'raporlar', label: 'Raporlar', desc: 'CSV ve PDF çıktıları' },
]

const DURUM_OPTIONS: Array<{ key: 'tumu' | GiderDurum; label: string }> = [
  { key: 'tumu', label: 'Tümü' },
  { key: 'bekliyor', label: 'Bekleyen' },
  { key: 'gecikti', label: 'Geciken' },
  { key: 'odendi', label: 'Ödendi' },
  { key: 'iptal', label: 'İptal' },
]

const ODEME_YONTEMLERI: Array<{ key: OdemeYontemi; label: string }> = [
  { key: 'nakit', label: 'Nakit' },
  { key: 'kart', label: 'Kart' },
  { key: 'havale', label: 'Havale' },
  { key: 'cek', label: 'Çek' },
]

const CATEGORY_PRESETS = [
  { ikon: '👩‍🏫', ad: 'Personel', renk: '#1d4ed8' },
  { ikon: '🏠', ad: 'Kira', renk: '#7c3aed' },
  { ikon: '🍽', ad: 'Mutfak', renk: '#ea580c' },
  { ikon: '💡', ad: 'Faturalar', renk: '#f59e0b' },
  { ikon: '🧹', ad: 'Temizlik', renk: '#14b8a6' },
  { ikon: '📦', ad: 'Diğer', renk: '#64748b' },
]

function monthFirstDay(monthKey: string) {
  return `${monthKey}-01`
}

function monthTenthDay(monthKey: string) {
  return `${monthKey}-10`
}

function formatDateLabel(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function statusMeta(durum: GiderDurum) {
  switch (durum) {
    case 'odendi':
      return { label: 'Ödendi', className: 'bg-[rgba(74,222,128,0.12)] text-[#4ade80]' }
    case 'gecikti':
      return { label: 'Gecikti', className: 'bg-[rgba(239,68,68,0.12)] text-red-400' }
    case 'iptal':
      return { label: 'İptal', className: 'bg-[rgba(148,163,184,0.12)] text-slate-300' }
    default:
      return { label: 'Bekliyor', className: 'bg-[rgba(250,204,21,0.12)] text-amber-300' }
  }
}

function makeExpenseDraft(monthKey: string, categories: KategoriRow[]): ExpenseDraft {
  return {
    baslik: '',
    kategori_id: categories[0]?.id || '',
    tutar: '',
    fatura_tarihi: monthFirstDay(monthKey),
    son_odeme_tarihi: monthTenthDay(monthKey),
    tedarikci_id: '',
    odeme_yontemi: '',
    durum: 'bekliyor',
    fatura_no: '',
    aciklama: '',
    kdv_orani: '',
    file: null,
    tekrarli: false,
    tekrarli_periyot: '',
  }
}

function buildExpenseDraftFromRow(row: GiderRow): ExpenseDraft {
  return {
    baslik: row.baslik,
    kategori_id: row.kategori_id,
    tutar: String(row.tutar),
    fatura_tarihi: row.fatura_tarihi,
    son_odeme_tarihi: row.son_odeme_tarihi || '',
    tedarikci_id: row.tedarikci_id || '',
    odeme_yontemi: row.odeme_yontemi || '',
    durum: row.durum,
    fatura_no: row.fatura_no || '',
    aciklama: row.aciklama || '',
    kdv_orani: row.kdv_orani == null ? '' : String(row.kdv_orani),
    file: null,
    tekrarli: row.tekrarli,
    tekrarli_periyot: row.tekrarli_periyot || '',
  }
}

function recurringLabel(row: Pick<GiderRow, 'tekrarli' | 'tekrarli_periyot' | 'tekrarli_ana_id'>) {
  if (!row.tekrarli) return 'Tek seferlik'
  const period = row.tekrarli_periyot === 'yillik' ? 'Yıllık' : 'Aylık'
  return row.tekrarli_ana_id ? `${period} · şablondan üretildi` : `${period} · otomatik tekrar`
}

function emptySupplierDraft(): SupplierDraft {
  return { ad: '', telefon: '', vergi_no: '', iban: '', notlar: '' }
}

function emptyCategoryDraft(): CategoryDraft {
  const preset = CATEGORY_PRESETS[0]
  return { ad: '', ikon: preset.ikon, renk: preset.renk, butce_aylik: '' }
}

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function openPrintableReport(html: string) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900')
  if (!popup) {
    window.alert('Rapor penceresi açılamadı. Tarayıcı popup engelliyor olabilir.')
    return
  }
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  popup.focus()
  popup.print()
}

export function FinansPanel({
  okul,
  ogrenciler,
  veliler,
}: {
  okul: Okul
  ogrenciler: Ogrenci[]
  veliler: VeliRecord[]
}) {
  const [activeTab, setActiveTab] = useState<FinanceTab>('ozet')
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey())
  const [reportMonthKey, setReportMonthKey] = useState(getCurrentMonthKey())
  const [snapshot, setSnapshot] = useState({ aidatlar: [], giderler: [], kategoriler: [], tedarikciler: [] } as {
    aidatlar: AidatFinanceRow[]
    giderler: GiderRow[]
    kategoriler: KategoriRow[]
    tedarikciler: TedarikciRow[]
  })
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const [durumFilter, setDurumFilter] = useState<'tumu' | GiderDurum>('tumu')
  const [kategoriFilter, setKategoriFilter] = useState<string>('tumu')
  const [arama, setArama] = useState('')

  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [expenseMode, setExpenseMode] = useState<'create' | 'edit'>('create')
  const [editingExpense, setEditingExpense] = useState<GiderRow | null>(null)
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(makeExpenseDraft(monthKey, snapshot.kategoriler))
  const [expenseExistingFileUrl, setExpenseExistingFileUrl] = useState<string | null>(null)
  const [removeExpenseFile, setRemoveExpenseFile] = useState(false)
  const [savingExpense, setSavingExpense] = useState(false)

  const [selectedGider, setSelectedGider] = useState<GiderRow | null>(null)
  const [selectedGiderUrl, setSelectedGiderUrl] = useState<string | null>(null)
  const [giderActionLoading, setGiderActionLoading] = useState(false)

  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft>(emptySupplierDraft())
  const [savingSupplier, setSavingSupplier] = useState(false)
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(emptyCategoryDraft())
  const [savingCategory, setSavingCategory] = useState(false)
  const [accountantEmail, setAccountantEmail] = useState('')

  useEffect(() => {
    void load()
  }, [okul.id])

  useEffect(() => {
    if (expenseModalOpen || expenseMode === 'edit') return
    setExpenseDraft(makeExpenseDraft(monthKey, snapshot.kategoriler))
  }, [expenseModalOpen, expenseMode, monthKey, snapshot.kategoriler])

  useEffect(() => {
    if (loading) return
    void load('refresh')
  }, [monthKey])

  useEffect(() => {
    if (!selectedGider?.fatura_dosya_path) {
      setSelectedGiderUrl(null)
      return
    }

    let alive = true
    void createSignedFaturaUrl(selectedGider.fatura_dosya_path).then(({ data }) => {
      if (!alive) return
      setSelectedGiderUrl(data?.signedUrl ?? null)
    })
    return () => {
      alive = false
    }
  }, [selectedGider?.fatura_dosya_path])

  useEffect(() => {
    if (!editingExpense?.fatura_dosya_path) {
      setExpenseExistingFileUrl(null)
      return
    }

    let alive = true
    void createSignedFaturaUrl(editingExpense.fatura_dosya_path).then(({ data }) => {
      if (!alive) return
      setExpenseExistingFileUrl(data?.signedUrl ?? null)
    })
    return () => {
      alive = false
    }
  }, [editingExpense?.fatura_dosya_path])

  async function load(mode: 'initial' | 'refresh' = 'initial', successMessage?: string) {
    if (mode === 'initial') setLoading(true)
    if (mode === 'refresh') setRefreshing(true)

    const recurring = await ensureRecurringExpensesForMonth(Number(okul.id), monthKey)
    const { data, error } = await loadFinansSnapshot(Number(okul.id))
    if (recurring.error) {
      setBanner(recurring.error.message || 'Tekrarlı giderler hazırlanamadı.')
    } else if (error) {
      setBanner(error.message || 'Finans verileri yüklenemedi.')
    } else if (successMessage) {
      setBanner(successMessage)
    } else if (recurring.data.created > 0) {
      setBanner(`${recurring.data.created} tekrarlı gider ${formatMonthLabel(monthKey)} için otomatik oluşturuldu.`)
    } else {
      setBanner('')
    }

    setSnapshot(data)
    setLoading(false)
    setRefreshing(false)
  }

  const primaryContacts = useMemo(() => {
    const map: Record<number, VeliRecord | null> = {}
    ogrenciler.forEach((ogrenci) => {
      map[ogrenci.id] = firstActiveContact(veliler, ogrenci.id)
    })
    return map
  }, [ogrenciler, veliler])

  const years = useMemo(() => getAvailableYears(snapshot), [snapshot])

  useEffect(() => {
    if (!years.includes(reportYear)) {
      setReportYear(years[0] || new Date().getFullYear())
    }
  }, [reportYear, years])

  const overview = useMemo(() => buildFinansOverview(snapshot, monthKey), [monthKey, snapshot])

  const monthAidatlar = useMemo(
    () => snapshot.aidatlar.filter((aidat) => resolveAidatMonthKey(aidat) === monthKey),
    [monthKey, snapshot.aidatlar]
  )

  const monthGiderler = useMemo(
    () => snapshot.giderler.filter((gider) => resolveGiderMonthKey(gider) === monthKey),
    [monthKey, snapshot.giderler]
  )

  const filteredGiderler = useMemo(() => monthGiderler.filter((gider) => {
    if (durumFilter !== 'tumu' && gider.durum !== durumFilter) return false
    if (kategoriFilter !== 'tumu' && gider.kategori_id !== kategoriFilter) return false
    if (arama.trim() && !`${gider.baslik} ${gider.tedarikci?.ad || ''} ${gider.kategori?.ad || ''}`.toLocaleLowerCase('tr-TR').includes(arama.trim().toLocaleLowerCase('tr-TR'))) {
      return false
    }
    return true
  }), [arama, durumFilter, kategoriFilter, monthGiderler])

  const expenseSummary = useMemo(() => computeGiderSummary(filteredGiderler), [filteredGiderler])
  const yearSummary = useMemo(() => buildFinansYearSummary(snapshot, reportYear), [reportYear, snapshot])
  const categoryReport = useMemo(() => buildCategoryReport(snapshot, reportYear), [reportYear, snapshot])
  const supplierReport = useMemo(() => buildSupplierReport(snapshot, reportYear), [reportYear, snapshot])
  const monthlyLedger = useMemo(() => buildMonthlyLedger(snapshot, reportMonthKey), [reportMonthKey, snapshot])

  function openCreateExpenseModal() {
    setExpenseMode('create')
    setEditingExpense(null)
    setExpenseExistingFileUrl(null)
    setRemoveExpenseFile(false)
    setExpenseDraft(makeExpenseDraft(monthKey, snapshot.kategoriler))
    setExpenseModalOpen(true)
  }

  function openEditExpenseModal(row: GiderRow) {
    setExpenseMode('edit')
    setEditingExpense(row)
    setRemoveExpenseFile(false)
    setExpenseDraft(buildExpenseDraftFromRow(row))
    setExpenseModalOpen(true)
    setSelectedGider(null)
  }

  function closeExpenseModal() {
    setExpenseModalOpen(false)
    setExpenseMode('create')
    setEditingExpense(null)
    setExpenseExistingFileUrl(null)
    setRemoveExpenseFile(false)
    setExpenseDraft(makeExpenseDraft(monthKey, snapshot.kategoriler))
  }

  async function generateMonthAidatlar() {
    const mevcutIds = new Set(monthAidatlar.map((item) => item.ogrenci_id))
    const eksik = ogrenciler.filter((ogrenci) => !mevcutIds.has(Number(ogrenci.id)))
    if (!eksik.length) {
      setBanner('Bu ay için tüm öğrencilerin aidat kaydı zaten var.')
      return
    }

    const yil = Number(monthKey.split('-')[0])
    const rows = eksik.map((ogrenci) => ({
      okul_id: okul.id,
      ogrenci_id: ogrenci.id,
      ay: monthKey,
      donem: formatMonthLabel(monthKey),
      yil,
      tutar: Number(ogrenci.aidat_tutari || 3000),
      odendi: false,
      son_odeme: monthTenthDay(monthKey),
      aciklama: `${formatMonthLabel(monthKey)} aidatı`,
    }))

    const { error } = await supabase.from('aidatlar').insert(rows)
    if (error) {
      setBanner(error.message)
      return
    }

    await load('refresh', `${eksik.length} öğrenci için aidat kaydı oluşturuldu.`)
  }

  async function toggleAidatPaid(row: AidatFinanceRow) {
    if (!row.odendi) {
      const miktar = window.prompt('Ödeme miktarı (₺):', String(row.tutar))
      if (!miktar) return
      const numeric = Number(miktar)
      if (!Number.isFinite(numeric) || numeric <= 0) {
        setBanner('Geçerli bir ödeme tutarı girin.')
        return
      }

      const { error } = await supabase
        .from('aidatlar')
        .update({ odendi: true, odeme_tarihi: toLocalDateKey(new Date()), odenen_miktar: numeric })
        .eq('id', row.id)

      if (error) {
        setBanner(error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('aidatlar')
        .update({ odendi: false, odeme_tarihi: null, odenen_miktar: null })
        .eq('id', row.id)
      if (error) {
        setBanner(error.message)
        return
      }
    }

    await load('refresh', row.odendi ? 'Aidat tekrar bekliyor durumuna alındı.' : 'Aidat ödendi olarak işaretlendi.')
  }

  function sendAidatReminder() {
    const bekleyenler = monthAidatlar.filter((item) => !item.odendi)
    if (!bekleyenler.length) {
      setBanner('Bu ay için bekleyen aidat yok.')
      return
    }

    const message = [
      `KinderX Aidat Hatırlatması - ${formatMonthLabel(monthKey)}`,
      '',
      ...bekleyenler.map((item) => `${item.ogrenci_ad}: ${formatMoney(item.tutar)}`),
      '',
      'Ödemelerinizi zamanında tamamlamanızı rica ederiz.',
    ].join('\n')

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  async function saveExpense() {
    if (!expenseDraft.baslik.trim()) {
      setBanner('Gider başlığı zorunlu.')
      return
    }
    if (!expenseDraft.kategori_id) {
      setBanner('Kategori seçin.')
      return
    }
    const tutar = Number(expenseDraft.tutar)
    if (!Number.isFinite(tutar) || tutar <= 0) {
      setBanner('Geçerli bir tutar girin.')
      return
    }
    if (expenseDraft.tekrarli && !expenseDraft.tekrarli_periyot && !editingExpense?.tekrarli_ana_id) {
      setBanner('Tekrarlı gider için periyot seçin.')
      return
    }

    setSavingExpense(true)
    let uploadedFilePath: string | null = null
    const existingFilePath = editingExpense?.fatura_dosya_path || null
    let filePath: string | null = removeExpenseFile ? null : existingFilePath

    if (expenseDraft.file) {
      const { data, error } = await uploadFaturaDosyasi(Number(okul.id), expenseDraft.fatura_tarihi, expenseDraft.file)
      if (error) {
        setSavingExpense(false)
        setBanner(error.message)
        return
      }
      uploadedFilePath = data?.path ?? null
      filePath = uploadedFilePath
    }

    const payload = {
      okul_id: Number(okul.id),
      kategori_id: expenseDraft.kategori_id,
      tedarikci_id: expenseDraft.tedarikci_id || null,
      baslik: expenseDraft.baslik.trim(),
      aciklama: expenseDraft.aciklama.trim() || null,
      tutar,
      kdv_orani: expenseDraft.kdv_orani ? Number(expenseDraft.kdv_orani) : null,
      kdv_dahil: true,
      fatura_tarihi: expenseDraft.fatura_tarihi,
      son_odeme_tarihi: expenseDraft.son_odeme_tarihi || null,
      odeme_tarihi: null,
      odeme_yontemi: expenseDraft.odeme_yontemi || null,
      durum: expenseDraft.durum,
      fatura_no: expenseDraft.fatura_no.trim() || null,
      fatura_dosya_path: filePath,
      tekrarli: editingExpense?.tekrarli_ana_id ? true : expenseDraft.tekrarli,
      tekrarli_periyot: editingExpense?.tekrarli_ana_id
        ? editingExpense.tekrarli_periyot
        : expenseDraft.tekrarli
          ? (expenseDraft.tekrarli_periyot || 'aylik')
          : null,
      tekrarli_ana_id: editingExpense?.tekrarli_ana_id ?? null,
      kaydeden_id: editingExpense?.kaydeden_id ?? null,
    }

    const { error } = editingExpense
      ? await updateGider(editingExpense.id, payload)
      : await createGider(payload)

    setSavingExpense(false)
    if (error) {
      if (uploadedFilePath) {
        await deleteFaturaDosyasi(uploadedFilePath)
      }
      setBanner(error.message)
      return
    }

    if (existingFilePath && (removeExpenseFile || Boolean(uploadedFilePath))) {
      await deleteFaturaDosyasi(existingFilePath)
    }

    const successMessage = editingExpense ? 'Gider kaydı güncellendi.' : 'Yeni gider kaydı oluşturuldu.'
    closeExpenseModal()
    await load('refresh', successMessage)
  }

  async function handleExpenseStatus(next: 'odendi' | 'bekliyor') {
    if (!selectedGider) return

    setGiderActionLoading(true)
    const result = next === 'odendi'
      ? await markAsOdendi(selectedGider.id)
      : await markAsBekliyor(selectedGider.id)
    setGiderActionLoading(false)

    if (result.error) {
      setBanner(result.error.message)
      return
    }

    setSelectedGider(null)
    await load('refresh', next === 'odendi' ? 'Gider ödendi olarak güncellendi.' : 'Gider tekrar bekliyor durumuna alındı.')
  }

  async function handleExpenseDelete() {
    if (!selectedGider) return
    const confirmed = window.confirm(`"${selectedGider.baslik}" kaydını silmek istediğine emin misin?`)
    if (!confirmed) return

    setGiderActionLoading(true)
    const filePath = selectedGider.fatura_dosya_path
    const { error } = await deleteGider(selectedGider.id)
    if (!error && filePath) {
      await deleteFaturaDosyasi(filePath)
    }
    setGiderActionLoading(false)

    if (error) {
      setBanner(error.message)
      return
    }

    setSelectedGider(null)
    await load('refresh', 'Gider kaydı silindi.')
  }

  async function saveSupplier() {
    if (supplierDraft.ad.trim().length < 2) {
      setBanner('Tedarikçi adı en az 2 karakter olmalı.')
      return
    }

    setSavingSupplier(true)
    const { error } = await createTedarikci({
      okul_id: Number(okul.id),
      ad: supplierDraft.ad.trim(),
      telefon: supplierDraft.telefon.trim() || undefined,
      vergi_no: supplierDraft.vergi_no.trim() || undefined,
      iban: supplierDraft.iban.trim() || undefined,
      notlar: supplierDraft.notlar.trim() || undefined,
    })
    setSavingSupplier(false)

    if (error) {
      setBanner(error.message)
      return
    }

    setSupplierDraft(emptySupplierDraft())
    await load('refresh', 'Tedarikçi eklendi.')
  }

  async function saveCategory() {
    if (categoryDraft.ad.trim().length < 2) {
      setBanner('Kategori adı en az 2 karakter olmalı.')
      return
    }

    setSavingCategory(true)
    const { error } = await createKategori({
      okul_id: Number(okul.id),
      ad: categoryDraft.ad.trim(),
      ikon: categoryDraft.ikon.trim() || '📦',
      renk: categoryDraft.renk || '#64748b',
      butce_aylik: categoryDraft.butce_aylik ? Number(categoryDraft.butce_aylik) : undefined,
      sira: snapshot.kategoriler.length + 1,
    })
    setSavingCategory(false)

    if (error) {
      setBanner(error.message)
      return
    }

    setCategoryDraft(emptyCategoryDraft())
    await load('refresh', 'Kategori eklendi.')
  }

  function exportCategoryCsv() {
    const csv = buildCsv(
      categoryReport.map((row) => ({
        kategori: row.ad,
        ikon: row.ikon || '',
        toplam: row.toplam,
        adet: row.adet,
        ortalama: row.ortalama,
      })),
      [
        { key: 'kategori', label: 'Kategori' },
        { key: 'ikon', label: 'İkon' },
        { key: 'toplam', label: 'Toplam' },
        { key: 'adet', label: 'Adet' },
        { key: 'ortalama', label: 'Ortalama' },
      ]
    )
    triggerDownload(`kinderx-kategori-raporu-${reportYear}.csv`, csv, 'text/csv;charset=utf-8')
  }

  function exportSupplierCsv() {
    const csv = buildCsv(
      supplierReport.map((row) => ({
        tedarikci: row.ad,
        toplam: row.toplam,
        adet: row.adet,
        ortalama: row.ortalama,
      })),
      [
        { key: 'tedarikci', label: 'Tedarikçi' },
        { key: 'toplam', label: 'Toplam' },
        { key: 'adet', label: 'Adet' },
        { key: 'ortalama', label: 'Ortalama' },
      ]
    )
    triggerDownload(`kinderx-tedarikci-raporu-${reportYear}.csv`, csv, 'text/csv;charset=utf-8')
  }

  function exportMonthlyLedgerCsv() {
    const csv = buildCsv(
      monthlyLedger.map((row) => ({
        tip: row.tip,
        tarih: row.tarih,
        baslik: row.baslik,
        kisi: row.kisi,
        kategori: row.kategori,
        durum: row.durum,
        tutar: row.tutar,
      })),
      [
        { key: 'tip', label: 'Tip' },
        { key: 'tarih', label: 'Tarih' },
        { key: 'baslik', label: 'Başlık' },
        { key: 'kisi', label: 'Kişi' },
        { key: 'kategori', label: 'Kategori' },
        { key: 'durum', label: 'Durum' },
        { key: 'tutar', label: 'Tutar' },
      ]
    )
    triggerDownload(`kinderx-hareket-dokumu-${reportMonthKey}.csv`, csv, 'text/csv;charset=utf-8')
  }

  function printMonthlyReport() {
    const html = buildMonthlyReportHtml({
      okulAdi: okul.ad,
      monthKey: reportMonthKey,
      overview: buildFinansOverview(snapshot, reportMonthKey),
      categoryRows: buildFinansOverview(snapshot, reportMonthKey).categoryBreakdown,
      ledgerRows: buildMonthlyLedger(snapshot, reportMonthKey),
    })
    openPrintableReport(html)
  }

  function emailAccountant() {
    const overviewForMonth = buildFinansOverview(snapshot, reportMonthKey)
    const subject = encodeURIComponent(`${okul.ad} - ${formatMonthLabel(reportMonthKey)} finans özeti`)
    const body = encodeURIComponent([
      `${okul.ad} için ${formatMonthLabel(reportMonthKey)} finans özeti`,
      '',
      `Gelir: ${formatMoney(overviewForMonth.gelir)}`,
      `Gider: ${formatMoney(overviewForMonth.gider)}`,
      `Net: ${formatMoney(overviewForMonth.net)}`,
      `Bekleyen ödemeler: ${formatMoney(overviewForMonth.bekleyenOdemeler)}`,
      '',
      'CSV ve PDF raporlarını panelden ayrıca indirebilirsiniz.',
    ].join('\n'))

    window.location.href = `mailto:${encodeURIComponent(accountantEmail.trim())}?subject=${subject}&body=${body}`
  }

  if (loading) {
    return (
      <div className="rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-8 text-center text-sm text-[rgba(255,255,255,0.6)]">
        Finans modülü yükleniyor...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#4ade80]">Finansal Yönetim</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Gelir, gider ve raporlar tek ekranda</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[rgba(255,255,255,0.62)]">
              Mobildeki finans modülünün web karşılığı. Aidat tahsilatı, gider kayıtları, tedarikçiler ve yıllık raporlar aynı akıştan yönetilir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={monthKey}
              onChange={(event) => setMonthKey(event.target.value)}
              className="rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none"
            />
            <button
              onClick={() => void load('refresh')}
              className="rounded-2xl border border-[rgba(74,222,128,0.16)] px-4 py-3 text-sm font-semibold text-[rgba(255,255,255,0.72)]"
            >
              {refreshing ? 'Yenileniyor...' : 'Yenile'}
            </button>
          </div>
        </div>
      </div>

      {banner ? (
        <div className="rounded-2xl border border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.08)] px-4 py-3 text-sm text-[#d1fae5]">
          {banner}
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-5">
        {FINANCE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-[24px] border p-4 text-left transition ${activeTab === tab.id ? 'border-[#4ade80] bg-[rgba(74,222,128,0.08)]' : 'border-[rgba(74,222,128,0.14)] bg-[#0b120b]'}`}
          >
            <div className={`text-sm font-semibold ${activeTab === tab.id ? 'text-[#4ade80]' : 'text-white'}`}>{tab.label}</div>
            <div className={`mt-1 text-xs leading-6 ${activeTab === tab.id ? 'text-[#d1fae5]' : 'text-[rgba(255,255,255,0.5)]'}`}>{tab.desc}</div>
          </button>
        ))}
      </div>

      {activeTab === 'ozet' && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Gelir" value={formatMoney(overview.gelir)} tone="green" />
            <MetricCard label="Gider" value={formatMoney(overview.gider)} tone="red" />
            <MetricCard label="Net" value={formatMoney(overview.net)} tone={overview.net >= 0 ? 'green' : 'red'} />
            <MetricCard label="Bekleyen ödemeler" value={formatMoney(overview.bekleyenOdemeler)} tone="amber" />
            <MetricCard label="Bu hafta geciken" value={formatMoney(overview.buHaftaGeciken)} tone="amber" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionCard
              title={`${formatMonthLabel(monthKey)} gider dağılımı`}
              subtitle={`${overview.toplamGider} gider kaydı`}
            >
              <div className="space-y-4">
                {overview.categoryBreakdown.length ? overview.categoryBreakdown.map((row) => (
                  <div key={row.ad}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-white">{row.ikon} {row.ad}</span>
                      <span className="text-[rgba(255,255,255,0.56)]">{formatMoney(row.tutar)} · %{row.yuzde}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06]">
                      <div className="h-2 rounded-full" style={{ width: `${Math.max(row.yuzde, 6)}%`, backgroundColor: row.renk }} />
                    </div>
                  </div>
                )) : (
                  <EmptyBlock text="Bu ay için kategori bazlı gider kaydı görünmüyor." />
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Son 6 ayın trendi"
              subtitle="Gelir / gider / net görünümü"
            >
              <div className="space-y-4">
                {overview.trend.map((point) => {
                  const maxValue = Math.max(...overview.trend.map((item) => Math.max(item.gelir, item.gider, Math.abs(item.net))), 1)
                  return (
                    <div key={point.monthKey}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-white">{point.shortLabel}</span>
                        <span className="text-[rgba(255,255,255,0.56)]">Net {formatMoney(point.net)}</span>
                      </div>
                      <div className="space-y-2">
                        <TrendBar label="Gelir" value={point.gelir} maxValue={maxValue} color="#4ade80" />
                        <TrendBar label="Gider" value={point.gider} maxValue={maxValue} color="#fb7185" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Son gider hareketleri"
            subtitle={`${monthGiderler.length} kayıt`}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#0d160d]">
                    {['Başlık', 'Kategori', 'Tedarikçi', 'Durum', 'Tarih', 'Tutar'].map((head) => (
                      <th key={head} className="px-4 py-3 text-left text-xs font-semibold uppercase text-[rgba(255,255,255,0.54)]">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthGiderler.slice(0, 6).map((item) => {
                    const meta = statusMeta(item.durum)
                    return (
                      <tr key={item.id} className="border-t border-[rgba(74,222,128,0.14)]">
                        <td className="px-4 py-3 text-sm font-semibold text-white">{item.baslik}</td>
                        <td className="px-4 py-3 text-sm text-[rgba(255,255,255,0.7)]">{item.kategori?.ad || 'Diğer'}</td>
                        <td className="px-4 py-3 text-sm text-[rgba(255,255,255,0.7)]">{item.tedarikci?.ad || '—'}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span></td>
                        <td className="px-4 py-3 text-sm text-[rgba(255,255,255,0.54)]">{item.fatura_tarihi}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-white">{formatMoney(item.tutar)}</td>
                      </tr>
                    )
                  })}
                  {!monthGiderler.length ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-[rgba(255,255,255,0.35)]">Bu ay için gider kaydı bulunamadı.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'gelirler' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <button onClick={generateMonthAidatlar} className="rounded-2xl bg-[#4ade80] px-4 py-3 text-sm font-semibold text-black">Ayı oluştur</button>
            <button onClick={sendAidatReminder} className="rounded-2xl border border-[rgba(74,222,128,0.18)] px-4 py-3 text-sm font-semibold text-[#4ade80]">WhatsApp hatırlatma</button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Toplam tahakkuk" value={formatMoney(monthAidatlar.reduce((sum, row) => sum + row.tutar, 0))} tone="green" />
            <MetricCard label="Ödenen" value={formatMoney(monthAidatlar.filter((row) => row.odendi).reduce((sum, row) => sum + row.tutar, 0))} tone="green" />
            <MetricCard label="Bekleyen" value={formatMoney(monthAidatlar.filter((row) => !row.odendi).reduce((sum, row) => sum + row.tutar, 0))} tone="amber" />
            <MetricCard label="Tahsilat oranı" value={`%${monthAidatlar.length ? Math.round((monthAidatlar.filter((row) => row.odendi).length / monthAidatlar.length) * 100) : 0}`} tone="white" />
          </div>

          <SectionCard title={`${formatMonthLabel(monthKey)} aidat listesi`} subtitle={`${monthAidatlar.length} kayıt`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#0d160d]">
                    {['Öğrenci', 'Veli', 'Tutar', 'Durum', 'Son Ödeme', 'İşlem'].map((head) => (
                      <th key={head} className="px-4 py-3 text-left text-xs font-semibold uppercase text-[rgba(255,255,255,0.54)]">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthAidatlar.map((row) => {
                    const contact = primaryContacts[row.ogrenci_id]
                    return (
                      <tr key={row.id} className="border-t border-[rgba(74,222,128,0.14)]">
                        <td className="px-4 py-3 text-sm font-semibold text-white">{row.ogrenci_ad}</td>
                        <td className="px-4 py-3 text-sm text-[rgba(255,255,255,0.7)]">{contact?.ad_soyad || '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-white">{formatMoney(row.tutar)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.odendi ? 'bg-[rgba(74,222,128,0.12)] text-[#4ade80]' : 'bg-[rgba(250,204,21,0.12)] text-amber-300'}`}>
                            {row.odendi ? 'Ödendi' : 'Bekliyor'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[rgba(255,255,255,0.54)]">{row.son_odeme || '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => void toggleAidatPaid(row)}
                            className={`rounded-2xl px-3 py-2 text-xs font-semibold ${row.odendi ? 'border border-[rgba(239,68,68,0.2)] text-red-400' : 'bg-[#4ade80] text-black'}`}
                          >
                            {row.odendi ? 'Ödemeyi geri al' : 'Ödendi yap'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {!monthAidatlar.length ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-[rgba(255,255,255,0.35)]">Bu ay için aidat kaydı bulunmuyor.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'giderler' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={arama}
              onChange={(event) => setArama(event.target.value)}
              placeholder="Başlık, kategori veya tedarikçi ara..."
              className="min-w-[260px] flex-1 rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none placeholder:text-[rgba(255,255,255,0.35)]"
            />
            <button
              onClick={() => {
                openCreateExpenseModal()
              }}
              className="rounded-2xl bg-[#4ade80] px-4 py-3 text-sm font-semibold text-black"
            >
              + Yeni gider
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {DURUM_OPTIONS.map((option) => (
              <PillButton key={option.key} active={durumFilter === option.key} onClick={() => setDurumFilter(option.key)}>
                {option.label}
              </PillButton>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <PillButton active={kategoriFilter === 'tumu'} onClick={() => setKategoriFilter('tumu')}>Tüm kategoriler</PillButton>
            {snapshot.kategoriler.map((kategori) => (
              <PillButton key={kategori.id} active={kategoriFilter === kategori.id} onClick={() => setKategoriFilter(kategori.id)}>
                {kategori.ikon} {kategori.ad}
              </PillButton>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Bu ay" value={formatMoney(expenseSummary.buAyToplam)} tone="white" />
            <MetricCard label="Bekleyen" value={formatMoney(expenseSummary.bekleyenToplam)} tone="amber" />
            <MetricCard label="Geciken" value={formatMoney(expenseSummary.gecikenToplam)} tone="red" />
            <MetricCard label="Ödenen" value={formatMoney(expenseSummary.odendiToplam)} tone="green" />
          </div>

          <SectionCard title={`${formatMonthLabel(monthKey)} gider listesi`} subtitle={`${filteredGiderler.length} kayıt`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#0d160d]">
                    {['Başlık', 'Kategori', 'Tedarikçi', 'Durum', 'Tarih', 'Tutar'].map((head) => (
                      <th key={head} className="px-4 py-3 text-left text-xs font-semibold uppercase text-[rgba(255,255,255,0.54)]">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGiderler.map((gider) => {
                    const meta = statusMeta(gider.durum)
                    return (
                      <tr key={gider.id} onClick={() => setSelectedGider(gider)} className="cursor-pointer border-t border-[rgba(74,222,128,0.14)] transition hover:bg-[#0d160d]">
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-white">{gider.baslik}</div>
                          <div className="mt-1 text-xs text-[rgba(255,255,255,0.4)]">{recurringLabel(gider)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[rgba(255,255,255,0.7)]">{gider.kategori?.ad || 'Diğer'}</td>
                        <td className="px-4 py-3 text-sm text-[rgba(255,255,255,0.7)]">{gider.tedarikci?.ad || '—'}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span></td>
                        <td className="px-4 py-3 text-sm text-[rgba(255,255,255,0.54)]">{gider.fatura_tarihi}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-white">{formatMoney(gider.tutar)}</td>
                      </tr>
                    )
                  })}
                  {!filteredGiderler.length ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-[rgba(255,255,255,0.35)]">Bu filtrelere uygun gider kaydı yok.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'tedarikciler' && (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="Yeni tedarikçi" subtitle="Webden hızlı ekleme">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ad" value={supplierDraft.ad} onChange={(value) => setSupplierDraft((prev) => ({ ...prev, ad: value }))} placeholder="Örn: BEDAŞ" />
              <Field label="Telefon" value={supplierDraft.telefon} onChange={(value) => setSupplierDraft((prev) => ({ ...prev, telefon: value }))} placeholder="05xx xxx xx xx" />
              <Field label="Vergi No" value={supplierDraft.vergi_no} onChange={(value) => setSupplierDraft((prev) => ({ ...prev, vergi_no: value }))} placeholder="Opsiyonel" />
              <Field label="IBAN" value={supplierDraft.iban} onChange={(value) => setSupplierDraft((prev) => ({ ...prev, iban: value }))} placeholder="Opsiyonel" />
              <Field label="Notlar" value={supplierDraft.notlar} onChange={(value) => setSupplierDraft((prev) => ({ ...prev, notlar: value }))} placeholder="Opsiyonel not" full />
            </div>
            <button onClick={saveSupplier} className="mt-5 rounded-2xl bg-[#4ade80] px-4 py-3 text-sm font-semibold text-black">
              {savingSupplier ? 'Kaydediliyor...' : 'Tedarikçiyi ekle'}
            </button>

            <div className="mt-8 rounded-[24px] border border-[rgba(74,222,128,0.14)] bg-[#0d160d] p-4">
              <div className="text-sm font-semibold text-white">Kayıtlı tedarikçiler</div>
              <div className="mt-4 space-y-3">
                {snapshot.tedarikciler.map((tedarikci) => (
                  <div key={tedarikci.id} className="rounded-2xl border border-[rgba(74,222,128,0.12)] px-4 py-4">
                    <div className="text-sm font-semibold text-white">{tedarikci.ad}</div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[rgba(255,255,255,0.56)]">
                      {tedarikci.telefon ? <span>☎️ {tedarikci.telefon}</span> : null}
                      {tedarikci.vergi_no ? <span>Vergi no: {tedarikci.vergi_no}</span> : null}
                      {tedarikci.iban ? <span>IBAN: {tedarikci.iban}</span> : null}
                    </div>
                  </div>
                ))}
                {!snapshot.tedarikciler.length ? <EmptyBlock text="Henüz tedarikçi yok." /> : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Kategori yönetimi" subtitle="Gider başlıklarını düzenle">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Kategori adı" value={categoryDraft.ad} onChange={(value) => setCategoryDraft((prev) => ({ ...prev, ad: value }))} placeholder="Örn: Elektrik" />
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">Hazır stil</div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_PRESETS.map((preset) => (
                    <button
                      key={preset.ad}
                      onClick={() => setCategoryDraft((prev) => ({ ...prev, ikon: preset.ikon, renk: preset.renk, ad: prev.ad || preset.ad }))}
                      className="rounded-full border border-[rgba(74,222,128,0.14)] px-3 py-2 text-xs text-white"
                    >
                      {preset.ikon} {preset.ad}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="İkon" value={categoryDraft.ikon} onChange={(value) => setCategoryDraft((prev) => ({ ...prev, ikon: value }))} placeholder="📦" />
              <Field label="Renk" value={categoryDraft.renk} onChange={(value) => setCategoryDraft((prev) => ({ ...prev, renk: value }))} placeholder="#64748b" />
              <Field label="Aylık bütçe" value={categoryDraft.butce_aylik} onChange={(value) => setCategoryDraft((prev) => ({ ...prev, butce_aylik: value }))} placeholder="Opsiyonel" full />
            </div>
            <button onClick={saveCategory} className="mt-5 rounded-2xl bg-[#4ade80] px-4 py-3 text-sm font-semibold text-black">
              {savingCategory ? 'Kaydediliyor...' : 'Kategoriyi ekle'}
            </button>

            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {snapshot.kategoriler.map((kategori) => (
                <div key={kategori.id} className="rounded-[22px] border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{kategori.ikon} {kategori.ad}</div>
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: kategori.renk }} />
                  </div>
                  <div className="mt-2 text-xs text-[rgba(255,255,255,0.56)]">
                    {kategori.butce_aylik ? `Aylık bütçe: ${formatMoney(kategori.butce_aylik)}` : 'Bütçe tanımlı değil'}
                  </div>
                </div>
              ))}
              {!snapshot.kategoriler.length ? <EmptyBlock text="Henüz kategori yok." /> : null}
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'raporlar' && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label={`${reportYear} gelir`} value={formatMoney(yearSummary.gelir)} tone="green" />
            <MetricCard label={`${reportYear} gider`} value={formatMoney(yearSummary.gider)} tone="red" />
            <MetricCard label={`${reportYear} net`} value={formatMoney(yearSummary.net)} tone={yearSummary.net >= 0 ? 'green' : 'red'} />
            <MetricCard label="Bekleyen aidatlar" value={formatMoney(yearSummary.bekleyenAidatlar)} tone="amber" />
            <MetricCard label="Bekleyen giderler" value={formatMoney(yearSummary.bekleyenGiderler)} tone="amber" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <SectionCard title="Rapor araçları" subtitle="PDF, CSV ve e-posta">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">Rapor ayı</div>
                  <input type="month" value={reportMonthKey} onChange={(event) => setReportMonthKey(event.target.value)} className="w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none" />
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">Rapor yılı</div>
                  <select value={reportYear} onChange={(event) => setReportYear(Number(event.target.value))} className="w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none">
                    {years.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <ActionButton onClick={printMonthlyReport}>Aylık finans raporu PDF</ActionButton>
                <ActionButton onClick={exportMonthlyLedgerCsv}>Aylık hareket dökümü CSV</ActionButton>
                <ActionButton onClick={exportCategoryCsv}>Kategori bazlı yıllık CSV</ActionButton>
                <ActionButton onClick={exportSupplierCsv}>Tedarikçi bazlı yıllık CSV</ActionButton>
              </div>

              <div className="mt-6 rounded-[24px] border border-[rgba(74,222,128,0.14)] bg-[#0d160d] p-4">
                <div className="text-sm font-semibold text-white">Muhasebeciye e-posta</div>
                <div className="mt-3 flex flex-col gap-3 md:flex-row">
                  <input
                    value={accountantEmail}
                    onChange={(event) => setAccountantEmail(event.target.value)}
                    placeholder="muhasebe@firma.com"
                    className="flex-1 rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0b120b] px-4 py-3 text-sm text-white outline-none"
                  />
                  <button
                    onClick={emailAccountant}
                    disabled={!accountantEmail.trim()}
                    className="rounded-2xl bg-[#4ade80] px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"
                  >
                    Taslağı aç
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Rapor özet tabloları" subtitle={`${reportYear} görünümü`}>
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-white">Kategori dağılımı</div>
                  <div className="mt-3 space-y-3">
                    {categoryReport.slice(0, 6).map((row) => (
                      <div key={row.ad} className="rounded-[20px] border border-[rgba(74,222,128,0.12)] bg-[#0d160d] px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-white">{row.ikon || '📦'} {row.ad}</div>
                          <div className="text-xs text-[rgba(255,255,255,0.56)]">{row.adet} kayıt</div>
                        </div>
                        <div className="mt-2 text-sm text-[rgba(255,255,255,0.56)]">Toplam {formatMoney(row.toplam)} · Ortalama {formatMoney(row.ortalama)}</div>
                      </div>
                    ))}
                    {!categoryReport.length ? <EmptyBlock text="Bu yıl için kategori raporu verisi yok." /> : null}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-white">Tedarikçi dağılımı</div>
                  <div className="mt-3 space-y-3">
                    {supplierReport.slice(0, 6).map((row) => (
                      <div key={row.ad} className="rounded-[20px] border border-[rgba(74,222,128,0.12)] bg-[#0d160d] px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-white">{row.ad}</div>
                          <div className="text-xs text-[rgba(255,255,255,0.56)]">{row.adet} ödeme</div>
                        </div>
                        <div className="mt-2 text-sm text-[rgba(255,255,255,0.56)]">Toplam {formatMoney(row.toplam)} · Ortalama {formatMoney(row.ortalama)}</div>
                      </div>
                    ))}
                    {!supplierReport.length ? <EmptyBlock text="Bu yıl için ödenmiş tedarikçi raporu yok." /> : null}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {expenseModalOpen ? (
        <ModalShell title={expenseMode === 'edit' ? 'Gideri düzenle' : 'Yeni gider ekle'} onClose={closeExpenseModal}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Başlık" value={expenseDraft.baslik} onChange={(value) => setExpenseDraft((prev) => ({ ...prev, baslik: value }))} placeholder="Örn: Mart elektrik faturası" />
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">Kategori</div>
              <select value={expenseDraft.kategori_id} onChange={(event) => setExpenseDraft((prev) => ({ ...prev, kategori_id: event.target.value }))} className="w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none">
                <option value="">Kategori seç</option>
                {snapshot.kategoriler.map((kategori) => (
                  <option key={kategori.id} value={kategori.id}>{kategori.ikon} {kategori.ad}</option>
                ))}
              </select>
            </div>
            <Field label="Tutar" value={expenseDraft.tutar} onChange={(value) => setExpenseDraft((prev) => ({ ...prev, tutar: value }))} placeholder="0,00" type="number" />
            <Field label="KDV oranı" value={expenseDraft.kdv_orani} onChange={(value) => setExpenseDraft((prev) => ({ ...prev, kdv_orani: value }))} placeholder="Opsiyonel" type="number" />
            <Field label="Fatura tarihi" value={expenseDraft.fatura_tarihi} onChange={(value) => setExpenseDraft((prev) => ({ ...prev, fatura_tarihi: value }))} type="date" />
            <Field label="Son ödeme tarihi" value={expenseDraft.son_odeme_tarihi} onChange={(value) => setExpenseDraft((prev) => ({ ...prev, son_odeme_tarihi: value }))} type="date" />
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">Tedarikçi</div>
              <select value={expenseDraft.tedarikci_id} onChange={(event) => setExpenseDraft((prev) => ({ ...prev, tedarikci_id: event.target.value }))} className="w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none">
                <option value="">Tedarikçi seç</option>
                {snapshot.tedarikciler.map((tedarikci) => (
                  <option key={tedarikci.id} value={tedarikci.id}>{tedarikci.ad}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">Ödeme yöntemi</div>
              <select value={expenseDraft.odeme_yontemi} onChange={(event) => setExpenseDraft((prev) => ({ ...prev, odeme_yontemi: event.target.value as OdemeYontemi | '' }))} className="w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none">
                <option value="">Belirtilmedi</option>
                {ODEME_YONTEMLERI.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">Durum</div>
              <select value={expenseDraft.durum} onChange={(event) => setExpenseDraft((prev) => ({ ...prev, durum: event.target.value as GiderDurum }))} className="w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none">
                <option value="bekliyor">Bekliyor</option>
                <option value="gecikti">Gecikti</option>
                <option value="odendi">Ödendi</option>
              </select>
            </div>
            <Field label="Fatura No" value={expenseDraft.fatura_no} onChange={(value) => setExpenseDraft((prev) => ({ ...prev, fatura_no: value }))} placeholder="Opsiyonel" />
            <label className="block md:col-span-2">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">Açıklama</div>
              <textarea value={expenseDraft.aciklama} onChange={(event) => setExpenseDraft((prev) => ({ ...prev, aciklama: event.target.value }))} className="min-h-[110px] w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none" />
            </label>
            <label className="block md:col-span-2 rounded-[22px] border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={expenseDraft.tekrarli}
                  onChange={(event) => setExpenseDraft((prev) => ({
                    ...prev,
                    tekrarli: event.target.checked,
                    tekrarli_periyot: event.target.checked ? (prev.tekrarli_periyot || 'aylik') : '',
                  }))}
                  disabled={Boolean(editingExpense?.tekrarli_ana_id)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-[#0b120b] text-[#4ade80]"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">Tekrarlı gider otomasyonu</div>
                  <div className="mt-1 text-xs leading-6 text-[rgba(255,255,255,0.52)]">
                    {editingExpense?.tekrarli_ana_id
                      ? 'Bu kayıt bir şablondan üretildi. Periyot ana şablondan gelir.'
                      : 'Aktif olduğunda seçtiğin ay açıldıkça gider otomatik oluşturulur.'}
                  </div>
                  {expenseDraft.tekrarli ? (
                    <div className="mt-4 max-w-[260px]">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">Periyot</div>
                      <select
                        value={expenseDraft.tekrarli_periyot}
                        onChange={(event) => setExpenseDraft((prev) => ({ ...prev, tekrarli_periyot: event.target.value as TekrarliPeriyot | '' }))}
                        disabled={Boolean(editingExpense?.tekrarli_ana_id)}
                        className="w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0b120b] px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
                      >
                        <option value="aylik">Aylık</option>
                        <option value="yillik">Yıllık</option>
                      </select>
                    </div>
                  ) : null}
                </div>
              </div>
            </label>
            <label className="block md:col-span-2">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">Fatura dosyası</div>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => {
                  setRemoveExpenseFile(false)
                  setExpenseDraft((prev) => ({ ...prev, file: event.target.files?.[0] || null }))
                }}
                className="w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-[rgba(255,255,255,0.75)]"
              />
              {expenseDraft.file ? <div className="mt-2 text-xs text-[rgba(255,255,255,0.56)]">{expenseDraft.file.name}</div> : null}
            </label>
            {editingExpense?.fatura_dosya_path ? (
              <div className="rounded-[22px] border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-4 md:col-span-2">
                <div className="text-sm font-semibold text-white">Mevcut fatura dosyası</div>
                <div className="mt-2 text-sm text-[rgba(255,255,255,0.56)]">
                  {expenseExistingFileUrl ? <a href={expenseExistingFileUrl} target="_blank" rel="noreferrer" className="text-[#4ade80] underline">Dosyayı aç</a> : 'Dosya hazırlanıyor...'}
                </div>
                <label className="mt-4 flex items-center gap-3 text-sm text-[rgba(255,255,255,0.7)]">
                  <input
                    type="checkbox"
                    checked={removeExpenseFile}
                    onChange={(event) => setRemoveExpenseFile(event.target.checked)}
                    disabled={Boolean(expenseDraft.file)}
                    className="h-4 w-4 rounded border-white/20 bg-[#0b120b] text-[#4ade80] disabled:opacity-50"
                  />
                  Yeni dosya yüklemeden mevcut dosyayı kaldır
                </label>
              </div>
            ) : null}
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button onClick={closeExpenseModal} className="rounded-2xl border border-[rgba(74,222,128,0.16)] px-4 py-3 text-sm font-semibold text-[rgba(255,255,255,0.72)]">
              İptal
            </button>
            <button onClick={() => void saveExpense()} className="rounded-2xl bg-[#4ade80] px-4 py-3 text-sm font-semibold text-black">
              {savingExpense ? 'Kaydediliyor...' : expenseMode === 'edit' ? 'Değişiklikleri kaydet' : 'Gideri kaydet'}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {selectedGider ? (
        <ModalShell title="Gider detayı" onClose={() => setSelectedGider(null)}>
          <div className="space-y-5">
            <div className="rounded-[24px] border border-[rgba(74,222,128,0.14)] bg-[#0d160d] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-white">{selectedGider.baslik}</div>
                  <div className="mt-1 text-sm text-[rgba(255,255,255,0.56)]">{selectedGider.kategori?.ad || 'Kategori yok'} · {selectedGider.tedarikci?.ad || 'Tedarikçi yok'}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta(selectedGider.durum).className}`}>{statusMeta(selectedGider.durum).label}</span>
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">{formatMoney(selectedGider.tutar)}</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard label="Fatura tarihi" value={formatDateLabel(selectedGider.fatura_tarihi)} />
              <InfoCard label="Son ödeme" value={formatDateLabel(selectedGider.son_odeme_tarihi)} />
              <InfoCard label="Ödeme tarihi" value={formatDateLabel(selectedGider.odeme_tarihi)} />
              <InfoCard label="Fatura no" value={selectedGider.fatura_no || '—'} />
              <InfoCard label="Tekrar" value={recurringLabel(selectedGider)} />
            </div>

            {selectedGider.aciklama ? (
              <div className="rounded-[22px] border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-4 text-sm leading-7 text-[rgba(255,255,255,0.68)]">
                {selectedGider.aciklama}
              </div>
            ) : null}

            {selectedGider.fatura_dosya_path ? (
              <div className="rounded-[22px] border border-[rgba(74,222,128,0.14)] bg-[#0d160d] p-4">
                <div className="text-sm font-semibold text-white">Fatura dosyası</div>
                <div className="mt-3 text-sm text-[rgba(255,255,255,0.56)]">
                  {selectedGiderUrl ? <a href={selectedGiderUrl} target="_blank" rel="noreferrer" className="text-[#4ade80] underline">Dosyayı aç</a> : 'Dosya hazırlanıyor...'}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button onClick={() => openEditExpenseModal(selectedGider)} className="rounded-2xl border border-[rgba(74,222,128,0.24)] px-4 py-3 text-sm font-semibold text-[#4ade80]">
                Düzenle
              </button>
              {(selectedGider.durum === 'bekliyor' || selectedGider.durum === 'gecikti') ? (
                <button onClick={() => void handleExpenseStatus('odendi')} className="rounded-2xl bg-[#4ade80] px-4 py-3 text-sm font-semibold text-black">
                  {giderActionLoading ? 'Güncelleniyor...' : 'Ödendi yap'}
                </button>
              ) : null}
              {selectedGider.durum === 'odendi' ? (
                <button onClick={() => void handleExpenseStatus('bekliyor')} className="rounded-2xl border border-[rgba(250,204,21,0.24)] px-4 py-3 text-sm font-semibold text-amber-300">
                  {giderActionLoading ? 'Güncelleniyor...' : 'Bekliyor yap'}
                </button>
              ) : null}
              <button onClick={() => void handleExpenseDelete()} className="rounded-2xl border border-[rgba(239,68,68,0.24)] px-4 py-3 text-sm font-semibold text-red-400">
                {giderActionLoading ? 'Siliniyor...' : 'Kaydı sil'}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[30px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-[rgba(255,255,255,0.48)]">{subtitle}</div> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'green' | 'red' | 'amber' | 'white'
}) {
  const color = tone === 'green'
    ? 'text-[#4ade80]'
    : tone === 'red'
      ? 'text-red-400'
      : tone === 'amber'
        ? 'text-amber-300'
        : 'text-white'

  return (
    <div className="rounded-[24px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-[rgba(255,255,255,0.48)]">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-[-0.05em] ${color}`}>{value}</div>
    </div>
  )
}

function TrendBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string
  value: number
  maxValue: number
  color: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-[rgba(255,255,255,0.48)]">
        <span>{label}</span>
        <span>{formatMoney(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06]">
        <div className="h-2 rounded-full" style={{ width: `${Math.max((value / maxValue) * 100, value > 0 ? 6 : 0)}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[rgba(74,222,128,0.18)] px-5 py-8 text-center text-sm text-[rgba(255,255,255,0.45)]">
      {text}
    </div>
  )
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-[#4ade80] text-black' : 'border border-[rgba(74,222,128,0.14)] bg-[#0d160d] text-[rgba(255,255,255,0.72)]'}`}
    >
      {children}
    </button>
  )
}

function ActionButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.08)] px-4 py-3 text-left text-sm font-semibold text-[#4ade80]">
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
  full = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  full?: boolean
}) {
  return (
    <label className={full ? 'md:col-span-2' : ''}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-3 text-sm text-white outline-none placeholder:text-[rgba(255,255,255,0.35)]"
      />
    </label>
  )
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b]">
        <div className="flex items-center justify-between gap-3 border-b border-[rgba(74,222,128,0.14)] px-6 py-5">
          <div className="text-lg font-semibold text-white">{title}</div>
          <button onClick={onClose} className="text-2xl text-[rgba(255,255,255,0.48)]">×</button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[rgba(74,222,128,0.14)] bg-[#0d160d] px-4 py-4">
      <div className="text-xs uppercase tracking-[0.16em] text-[rgba(255,255,255,0.48)]">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  )
}
