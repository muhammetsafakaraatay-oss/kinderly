import { localMonthKey, toLocalDateKey } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase'

export type KategoriRow = {
  id: string
  okul_id: number
  ad: string
  ikon: string
  renk: string
  butce_aylik: number | null
  sira: number
  aktif: boolean
  created_at: string
}

export type TedarikciRow = {
  id: string
  okul_id: number
  ad: string
  telefon: string | null
  vergi_no: string | null
  iban: string | null
  notlar: string | null
  aktif: boolean
  created_at: string
}

export type GiderDurum = 'bekliyor' | 'odendi' | 'gecikti' | 'iptal'
export type OdemeYontemi = 'nakit' | 'kart' | 'havale' | 'cek'
export type TekrarliPeriyot = 'aylik' | 'yillik'

export type GiderRow = {
  id: string
  okul_id: number
  kategori_id: string
  tedarikci_id: string | null
  baslik: string
  aciklama: string | null
  tutar: number
  kdv_orani: number | null
  kdv_dahil: boolean
  fatura_tarihi: string
  son_odeme_tarihi: string | null
  odeme_tarihi: string | null
  odeme_yontemi: OdemeYontemi | null
  durum: GiderDurum
  fatura_no: string | null
  fatura_dosya_path: string | null
  tekrarli: boolean
  tekrarli_periyot: TekrarliPeriyot | null
  tekrarli_ana_id: string | null
  kaydeden_id: string | null
  created_at: string
  updated_at: string
  kategori?: { ad: string; ikon: string; renk: string } | null
  tedarikci?: { ad: string } | null
}

export type AidatFinanceRow = {
  id: number
  okul_id: number
  ogrenci_id: number
  ogrenci_ad: string
  ay: string | null
  donem: string | null
  yil: number | null
  tutar: number
  odendi: boolean
  son_odeme: string | null
  odeme_tarihi: string | null
  odenen_miktar: number | null
  aciklama: string | null
}

export type FinansSnapshot = {
  aidatlar: AidatFinanceRow[]
  giderler: GiderRow[]
  kategoriler: KategoriRow[]
  tedarikciler: TedarikciRow[]
}

export type FinansCategorySlice = {
  ad: string
  ikon: string
  renk: string
  tutar: number
  yuzde: number
}

export type FinansTrendPoint = {
  monthKey: string
  label: string
  shortLabel: string
  gelir: number
  gider: number
  net: number
}

export type FinansOverview = {
  monthKey: string
  monthLabel: string
  gelir: number
  gider: number
  net: number
  toplamAidat: number
  toplamGider: number
  categoryBreakdown: FinansCategorySlice[]
  trend: FinansTrendPoint[]
  bekleyenOdemeler: number
  buHaftaGeciken: number
}

export type FinansAggregateRow = {
  ad: string
  ikon?: string
  renk?: string
  toplam: number
  adet: number
  ortalama: number
}

export type FinansLedgerRow = {
  tip: 'Gelir' | 'Gider'
  tarih: string
  baslik: string
  kisi: string
  kategori: string
  durum: string
  tutar: number
}

export type FinansYearSummary = {
  gelir: number
  gider: number
  net: number
  bekleyenAidatlar: number
  bekleyenGiderler: number
}

export type GiderInsert = Omit<GiderRow, 'id' | 'created_at' | 'updated_at' | 'kategori' | 'tedarikci'>

export type GiderFilters = {
  durum?: GiderDurum
  kategoriId?: string
  tedarikciId?: string
  ay?: string
  arama?: string
}

const FATURA_BUCKET = 'fatura-dosyalari'
const SIGNED_URL_EXPIRES_IN = 60 * 60
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

function padMonth(value: number | string): string {
  return String(value).padStart(2, '0')
}

function formatIsoDate(date: Date): string {
  return toLocalDateKey(date)
}

function getMonthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${padMonth(date.getMonth() + 1)}`
}

function getYearFromMonthKey(monthKey: string): number {
  return parseInt(monthKey.split('-')[0] || '0', 10)
}

function getMonthIndex(monthKey: string): number {
  return parseInt(monthKey.split('-')[1] || '1', 10) - 1
}

function normalizeMonthKey(value: string | null | undefined): string | null {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (/^\d{4}-\d{2}$/.test(raw)) return raw
  if (/^\d{4}\/\d{2}$/.test(raw)) {
    const [yil, ay] = raw.split('/')
    return `${yil}-${ay}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 7)
  return null
}

function parseDonemMonthKey(value: string | null | undefined): string | null {
  const raw = String(value || '').trim()
  if (!raw) return null
  const lower = raw.toLocaleLowerCase('tr-TR')

  for (let index = 0; index < AYLAR.length; index += 1) {
    const ay = AYLAR[index]
    if (!lower.includes(ay.toLocaleLowerCase('tr-TR'))) continue
    const yilMatch = raw.match(/\b(20\d{2})\b/)
    if (!yilMatch) return null
    return `${yilMatch[1]}-${padMonth(index + 1)}`
  }

  return null
}

export function resolveAidatMonthKey(row: Pick<AidatFinanceRow, 'ay' | 'donem' | 'yil' | 'son_odeme' | 'odeme_tarihi'>): string | null {
  const fromAy = normalizeMonthKey(row.ay)
  if (fromAy) return fromAy

  const ayRaw = String(row.ay || '').trim()
  if (row.yil && ayRaw && /^\d{1,2}$/.test(ayRaw)) {
    return `${row.yil}-${padMonth(parseInt(ayRaw, 10))}`
  }

  const fromDonem = parseDonemMonthKey(row.donem)
  if (fromDonem) return fromDonem

  const fromSonOdeme = normalizeMonthKey(row.son_odeme)
  if (fromSonOdeme) return fromSonOdeme

  const fromOdeme = normalizeMonthKey(row.odeme_tarihi)
  if (fromOdeme) return fromOdeme

  return null
}

export function resolveGiderMonthKey(row: Pick<GiderRow, 'fatura_tarihi'>): string | null {
  return normalizeMonthKey(row.fatura_tarihi)
}

function isSayilabilirGider(gider: GiderRow): boolean {
  return gider.durum !== 'iptal'
}

function monthStart(monthKey: string): Date {
  return new Date(getYearFromMonthKey(monthKey), getMonthIndex(monthKey), 1)
}

function shiftMonth(monthKey: string, offset: number): string {
  const date = monthStart(monthKey)
  date.setMonth(date.getMonth() + offset)
  return getMonthKeyFromDate(date)
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  const diff = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - diff)
  return copy
}

function endOfWeek(date: Date): Date {
  const copy = startOfWeek(date)
  copy.setDate(copy.getDate() + 6)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function sortAggregate(rows: FinansAggregateRow[]): FinansAggregateRow[] {
  return rows.sort((a, b) => b.toplam - a.toplam || a.ad.localeCompare(b.ad, 'tr'))
}

export function formatMoney(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function getCurrentMonthKey(): string {
  return localMonthKey()
}

export function formatMonthLabel(monthKey: string): string {
  const ayIndex = getMonthIndex(monthKey)
  const yil = getYearFromMonthKey(monthKey)
  return `${AYLAR[ayIndex] || monthKey} ${yil}`
}

export function formatMonthShortLabel(monthKey: string): string {
  const ayIndex = getMonthIndex(monthKey)
  return (AYLAR[ayIndex] || monthKey).slice(0, 3)
}

export function getRecentMonthKeys(count = 6, anchorMonth = getCurrentMonthKey()): string[] {
  return Array.from({ length: count }, (_, index) => shiftMonth(anchorMonth, index - (count - 1)))
}

export async function loadAidatlar(okulId: number) {
  const { data, error } = await supabase
    .from('aidatlar')
    .select('id, okul_id, ogrenci_id, odendi, tutar, ay, donem, yil, son_odeme, odeme_tarihi, odenen_miktar, aciklama, ogrenciler(ad_soyad)')
    .eq('okul_id', okulId)
    .order('son_odeme', { ascending: true })

  const rows = ((data ?? []) as any[]).map((item) => ({
    id: Number(item.id),
    okul_id: Number(item.okul_id),
    ogrenci_id: Number(item.ogrenci_id),
    ogrenci_ad: item.ogrenciler?.ad_soyad || 'Öğrenci bilgisi yok',
    odendi: Boolean(item.odendi),
    tutar: typeof item.tutar === 'number' ? item.tutar : Number(item.tutar || 0),
    ay: item.ay ?? null,
    donem: item.donem ?? null,
    yil: item.yil ? Number(item.yil) : null,
    son_odeme: item.son_odeme ?? null,
    odeme_tarihi: item.odeme_tarihi ?? null,
    odenen_miktar: item.odenen_miktar == null ? null : Number(item.odenen_miktar),
    aciklama: item.aciklama ?? null,
  })) as AidatFinanceRow[]

  return { data: rows, error }
}

export async function loadKategoriler(okulId: number) {
  const { data, error } = await supabase
    .from('gider_kategorileri')
    .select('*')
    .eq('okul_id', okulId)
    .eq('aktif', true)
    .order('sira')

  return { data: (data ?? []) as KategoriRow[], error }
}

export async function createKategori(data: {
  okul_id: number
  ad: string
  ikon?: string
  renk?: string
  butce_aylik?: number
  sira?: number
}) {
  const { data: result, error } = await supabase
    .from('gider_kategorileri')
    .insert(data)
    .select('*')
    .single()

  return { data: result as KategoriRow | null, error }
}

export async function loadTedarikciler(okulId: number, sadeceAktif = true) {
  let query = supabase
    .from('tedarikciler')
    .select('*')
    .eq('okul_id', okulId)

  if (sadeceAktif) {
    query = query.eq('aktif', true)
  }

  const { data, error } = await query.order('ad')
  return { data: (data ?? []) as TedarikciRow[], error }
}

export async function createTedarikci(data: {
  okul_id: number
  ad: string
  telefon?: string
  vergi_no?: string
  iban?: string
  notlar?: string
}) {
  const { data: result, error } = await supabase
    .from('tedarikciler')
    .insert(data)
    .select('*')
    .single()

  return { data: result as TedarikciRow | null, error }
}

export async function updateTedarikci(id: string, patch: Partial<TedarikciRow>) {
  const { data: result, error } = await supabase
    .from('tedarikciler')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  return { data: result as TedarikciRow | null, error }
}

function lastDayOfMonth(yil: number, ay: number): string {
  return formatIsoDate(new Date(yil, ay, 0))
}

export async function loadGiderler(okulId: number, filters?: GiderFilters) {
  let query = supabase
    .from('giderler')
    .select('*, kategori:gider_kategorileri(ad,ikon,renk), tedarikci:tedarikciler(ad)')
    .eq('okul_id', okulId)

  if (filters?.durum) query = query.eq('durum', filters.durum)
  if (filters?.kategoriId) query = query.eq('kategori_id', filters.kategoriId)
  if (filters?.tedarikciId) query = query.eq('tedarikci_id', filters.tedarikciId)

  if (filters?.ay) {
    const [yilStr, ayStr] = filters.ay.split('-')
    const yil = parseInt(yilStr, 10)
    const ayNo = parseInt(ayStr, 10)
    query = query
      .gte('fatura_tarihi', `${filters.ay}-01`)
      .lte('fatura_tarihi', lastDayOfMonth(yil, ayNo))
  }

  if (filters?.arama) query = query.ilike('baslik', `%${filters.arama}%`)

  const { data, error } = await query.order('fatura_tarihi', { ascending: false })
  return { data: (data ?? []) as GiderRow[], error }
}

function todayStr(): string {
  return toLocalDateKey(new Date())
}

function normalizeRecurringPatch(patch: Partial<GiderInsert>) {
  const next = { ...patch }
  const today = todayStr()

  if (next.durum === 'bekliyor' && next.son_odeme_tarihi && next.son_odeme_tarihi < today) {
    next.durum = 'gecikti'
  }

  if (next.durum === 'odendi' && !next.odeme_tarihi) {
    next.odeme_tarihi = today
  }

  if ((next.durum === 'bekliyor' || next.durum === 'gecikti' || next.durum === 'iptal') && next.odeme_tarihi === undefined) {
    next.odeme_tarihi = null
  }

  if (!next.tekrarli) {
    next.tekrarli_periyot = null
  }

  return next
}

export async function createGider(data: GiderInsert) {
  const payload = normalizeRecurringPatch(data)

  const { data: result, error } = await supabase
    .from('giderler')
    .insert(payload)
    .select('*, kategori:gider_kategorileri(ad,ikon,renk), tedarikci:tedarikciler(ad)')
    .single()

  return { data: result as GiderRow | null, error }
}

export async function updateGider(id: string, patch: Partial<GiderInsert>) {
  const payload = normalizeRecurringPatch(patch)
  const { data: result, error } = await supabase
    .from('giderler')
    .update(payload)
    .eq('id', id)
    .select('*, kategori:gider_kategorileri(ad,ikon,renk), tedarikci:tedarikciler(ad)')
    .single()

  return { data: result as GiderRow | null, error }
}

export async function deleteGider(id: string) {
  const { error } = await supabase
    .from('giderler')
    .delete()
    .eq('id', id)

  return { error }
}

export async function markAsOdendi(id: string, odemeYontemi?: OdemeYontemi) {
  return updateGider(id, {
    durum: 'odendi',
    odeme_tarihi: todayStr(),
    odeme_yontemi: odemeYontemi ?? null,
  })
}

export async function markAsBekliyor(id: string) {
  return updateGider(id, {
    durum: 'bekliyor',
    odeme_tarihi: null,
  })
}

export async function uploadFaturaDosyasi(okulId: number, faturaTarihi: string, file: File) {
  const tarih = new Date(faturaTarihi)
  const yil = Number.isNaN(tarih.getTime()) ? new Date().getFullYear() : tarih.getFullYear()
  const ay = Number.isNaN(tarih.getTime()) ? new Date().getMonth() + 1 : tarih.getMonth() + 1
  const ext = file.name.split('.').pop()?.toLocaleLowerCase('tr-TR') || 'bin'
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const storagePath = `${okulId}/${yil}/${padMonth(ay)}/${uniqueSuffix}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from(FATURA_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
    })

  if (error) return { data: null, error }
  return { data: { path: storagePath }, error: null }
}

export async function createSignedFaturaUrl(path: string | null, expiresIn = SIGNED_URL_EXPIRES_IN) {
  if (!path) return { data: null, error: null }
  const { data, error } = await supabase.storage
    .from(FATURA_BUCKET)
    .createSignedUrl(path, expiresIn)

  return { data: data?.signedUrl ? { signedUrl: data.signedUrl } : null, error }
}

export async function deleteFaturaDosyasi(path: string) {
  const { error } = await supabase.storage.from(FATURA_BUCKET).remove([path])
  return { error }
}

export async function loadFinansSnapshot(okulId: number) {
  const [aidatRes, giderRes, kategoriRes, tedarikciRes] = await Promise.all([
    loadAidatlar(okulId),
    loadGiderler(okulId),
    loadKategoriler(okulId),
    loadTedarikciler(okulId),
  ])

  return {
    data: {
      aidatlar: aidatRes.data,
      giderler: giderRes.data,
      kategoriler: kategoriRes.data,
      tedarikciler: tedarikciRes.data,
    } satisfies FinansSnapshot,
    error: aidatRes.error ?? giderRes.error ?? kategoriRes.error ?? tedarikciRes.error ?? null,
  }
}

function alignDateToMonth(source: string, monthKey: string) {
  const [yearStr, monthStr] = monthKey.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Math.max(1, Number(source.slice(8, 10)) || 1)
  const maxDay = new Date(year, month, 0).getDate()
  return `${monthKey}-${padMonth(Math.min(day, maxDay))}`
}

function shouldGenerateRecurringExpense(template: GiderRow, targetMonthKey: string) {
  const templateMonthKey = resolveGiderMonthKey(template)
  if (!templateMonthKey || !template.tekrarli || !template.tekrarli_periyot) return false
  if (targetMonthKey < templateMonthKey) return false
  if (template.tekrarli_periyot === 'aylik') return true
  return getMonthIndex(templateMonthKey) === getMonthIndex(targetMonthKey)
}

export async function ensureRecurringExpensesForMonth(okulId: number, monthKey: string) {
  const { data: giderler, error } = await loadGiderler(okulId)
  if (error) return { data: { created: 0 }, error }

  const templates = giderler.filter((gider) => gider.tekrarli && !gider.tekrarli_ana_id && gider.tekrarli_periyot)
  let created = 0

  for (const template of templates) {
    if (!shouldGenerateRecurringExpense(template, monthKey)) continue

    const existingForMonth = giderler.some((gider) => {
      if (resolveGiderMonthKey(gider) !== monthKey) return false
      return gider.id === template.id || gider.tekrarli_ana_id === template.id
    })

    if (existingForMonth) continue

    const { error: createError } = await createGider({
      okul_id: template.okul_id,
      kategori_id: template.kategori_id,
      tedarikci_id: template.tedarikci_id,
      baslik: template.baslik,
      aciklama: template.aciklama,
      tutar: template.tutar,
      kdv_orani: template.kdv_orani,
      kdv_dahil: template.kdv_dahil,
      fatura_tarihi: alignDateToMonth(template.fatura_tarihi, monthKey),
      son_odeme_tarihi: template.son_odeme_tarihi ? alignDateToMonth(template.son_odeme_tarihi, monthKey) : null,
      odeme_tarihi: null,
      odeme_yontemi: template.odeme_yontemi,
      durum: 'bekliyor',
      fatura_no: null,
      fatura_dosya_path: null,
      tekrarli: true,
      tekrarli_periyot: template.tekrarli_periyot,
      tekrarli_ana_id: template.id,
      kaydeden_id: template.kaydeden_id,
    })

    if (createError) {
      return { data: { created }, error: createError }
    }

    created += 1
  }

  return { data: { created }, error: null }
}

export function computeGiderSummary(giderler: GiderRow[]) {
  const thisMonth = getCurrentMonthKey()

  let buAyToplam = 0
  let bekleyenToplam = 0
  let gecikenToplam = 0
  let gecikenAdet = 0
  let odendiToplam = 0
  let odendiAdet = 0

  for (const g of giderler) {
    if (g.fatura_tarihi.startsWith(thisMonth)) buAyToplam += g.tutar
    if (g.durum === 'bekliyor') bekleyenToplam += g.tutar
    else if (g.durum === 'gecikti') {
      gecikenToplam += g.tutar
      gecikenAdet += 1
    } else if (g.durum === 'odendi') {
      odendiToplam += g.tutar
      odendiAdet += 1
    }
  }

  return { buAyToplam, bekleyenToplam, gecikenToplam, gecikenAdet, odendiToplam, odendiAdet }
}

export function buildFinansOverview(snapshot: FinansSnapshot, monthKey: string): FinansOverview {
  const trendKeys = getRecentMonthKeys(6, monthKey)
  const aylikAidatlar = snapshot.aidatlar.filter((aidat) => resolveAidatMonthKey(aidat) === monthKey)
  const aylikGiderler = snapshot.giderler.filter((gider) => resolveGiderMonthKey(gider) === monthKey && isSayilabilirGider(gider))

  const gelir = aylikAidatlar.reduce((sum, item) => sum + item.tutar, 0)
  const gider = aylikGiderler.reduce((sum, item) => sum + item.tutar, 0)
  const net = gelir - gider

  const categoryTotal = aylikGiderler.reduce((sum, item) => sum + item.tutar, 0) || 1
  const categoryMap = new Map<string, FinansCategorySlice>()

  aylikGiderler.forEach((giderItem) => {
    const key = giderItem.kategori?.ad ?? 'Diğer'
    const current = categoryMap.get(key) ?? {
      ad: giderItem.kategori?.ad ?? 'Diğer',
      ikon: giderItem.kategori?.ikon ?? '📦',
      renk: giderItem.kategori?.renk ?? '#94a3b8',
      tutar: 0,
      yuzde: 0,
    }

    current.tutar += giderItem.tutar
    categoryMap.set(key, current)
  })

  const categoryBreakdown = [...categoryMap.values()]
    .map((row) => ({
      ...row,
      yuzde: row.tutar <= 0 ? 0 : Math.round((row.tutar / categoryTotal) * 100),
    }))
    .sort((a, b) => b.tutar - a.tutar)

  const trend = trendKeys.map((key) => {
    const gelirToplam = snapshot.aidatlar
      .filter((aidat) => resolveAidatMonthKey(aidat) === key)
      .reduce((sum, item) => sum + item.tutar, 0)

    const giderToplam = snapshot.giderler
      .filter((giderItem) => resolveGiderMonthKey(giderItem) === key && isSayilabilirGider(giderItem))
      .reduce((sum, item) => sum + item.tutar, 0)

    return {
      monthKey: key,
      label: formatMonthLabel(key),
      shortLabel: formatMonthShortLabel(key),
      gelir: gelirToplam,
      gider: giderToplam,
      net: gelirToplam - giderToplam,
    }
  })

  const now = new Date()
  const weekStart = formatIsoDate(startOfWeek(now))
  const weekEnd = formatIsoDate(endOfWeek(now))
  const today = formatIsoDate(now)

  const bekleyenOdemeler = snapshot.aidatlar
    .filter((aidat) => !aidat.odendi)
    .reduce((sum, item) => sum + item.tutar, 0)

  const buHaftaGeciken = snapshot.giderler
    .filter((giderItem) => {
      if (!isSayilabilirGider(giderItem)) return false
      if (giderItem.durum === 'odendi') return false
      if (!giderItem.son_odeme_tarihi) return false
      return giderItem.son_odeme_tarihi >= weekStart &&
        giderItem.son_odeme_tarihi <= weekEnd &&
        giderItem.son_odeme_tarihi <= today
    })
    .reduce((sum, item) => sum + item.tutar, 0)

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    gelir,
    gider,
    net,
    toplamAidat: aylikAidatlar.length,
    toplamGider: aylikGiderler.length,
    categoryBreakdown,
    trend,
    bekleyenOdemeler,
    buHaftaGeciken,
  }
}

export function getAvailableYears(snapshot: FinansSnapshot): number[] {
  const years = new Set<number>([new Date().getFullYear()])

  snapshot.aidatlar.forEach((aidat) => {
    const monthKey = resolveAidatMonthKey(aidat)
    if (monthKey) years.add(getYearFromMonthKey(monthKey))
    else if (aidat.yil) years.add(aidat.yil)
  })

  snapshot.giderler.forEach((gider) => {
    const monthKey = resolveGiderMonthKey(gider)
    if (monthKey) years.add(getYearFromMonthKey(monthKey))
  })

  return [...years].sort((a, b) => b - a)
}

export function buildFinansYearSummary(snapshot: FinansSnapshot, year: number): FinansYearSummary {
  const gelir = snapshot.aidatlar
    .filter((aidat) => {
      const monthKey = resolveAidatMonthKey(aidat)
      return monthKey ? getYearFromMonthKey(monthKey) === year : aidat.yil === year
    })
    .reduce((sum, item) => sum + item.tutar, 0)

  const gider = snapshot.giderler
    .filter((giderItem) => {
      const monthKey = resolveGiderMonthKey(giderItem)
      return monthKey ? getYearFromMonthKey(monthKey) === year && isSayilabilirGider(giderItem) : false
    })
    .reduce((sum, item) => sum + item.tutar, 0)

  const bekleyenAidatlar = snapshot.aidatlar
    .filter((aidat) => !aidat.odendi)
    .reduce((sum, item) => sum + item.tutar, 0)

  const bekleyenGiderler = snapshot.giderler
    .filter((giderItem) => giderItem.durum === 'bekliyor' || giderItem.durum === 'gecikti')
    .reduce((sum, item) => sum + item.tutar, 0)

  return { gelir, gider, net: gelir - gider, bekleyenAidatlar, bekleyenGiderler }
}

export function buildCategoryReport(snapshot: FinansSnapshot, year: number): FinansAggregateRow[] {
  const map = new Map<string, FinansAggregateRow>()

  snapshot.giderler.forEach((giderItem) => {
    const monthKey = resolveGiderMonthKey(giderItem)
    if (!monthKey || getYearFromMonthKey(monthKey) !== year || !isSayilabilirGider(giderItem)) return

    const key = giderItem.kategori?.ad ?? 'Diğer'
    const current = map.get(key) ?? {
      ad: giderItem.kategori?.ad ?? 'Diğer',
      ikon: giderItem.kategori?.ikon ?? '📦',
      renk: giderItem.kategori?.renk ?? '#94a3b8',
      toplam: 0,
      adet: 0,
      ortalama: 0,
    }

    current.toplam += giderItem.tutar
    current.adet += 1
    current.ortalama = current.toplam / current.adet
    map.set(key, current)
  })

  return sortAggregate([...map.values()])
}

export function buildSupplierReport(snapshot: FinansSnapshot, year: number): FinansAggregateRow[] {
  const map = new Map<string, FinansAggregateRow>()

  snapshot.giderler.forEach((giderItem) => {
    const monthKey = resolveGiderMonthKey(giderItem)
    if (!monthKey || getYearFromMonthKey(monthKey) !== year || !isSayilabilirGider(giderItem) || giderItem.durum !== 'odendi') return

    const key = giderItem.tedarikci?.ad ?? 'Tedarikçi belirtilmedi'
    const current = map.get(key) ?? { ad: key, toplam: 0, adet: 0, ortalama: 0 }
    current.toplam += giderItem.tutar
    current.adet += 1
    current.ortalama = current.toplam / current.adet
    map.set(key, current)
  })

  return sortAggregate([...map.values()])
}

export function buildMonthlyLedger(snapshot: FinansSnapshot, monthKey: string): FinansLedgerRow[] {
  const incomeRows: FinansLedgerRow[] = snapshot.aidatlar
    .filter((aidat) => resolveAidatMonthKey(aidat) === monthKey)
    .map((aidat) => ({
      tip: 'Gelir',
      tarih: aidat.odeme_tarihi || aidat.son_odeme || `${monthKey}-01`,
      baslik: aidat.aciklama?.trim() || `${formatMonthLabel(monthKey)} aidatı`,
      kisi: aidat.ogrenci_ad,
      kategori: 'Aidat',
      durum: aidat.odendi ? 'Ödendi' : 'Bekliyor',
      tutar: aidat.tutar,
    }))

  const expenseRows: FinansLedgerRow[] = snapshot.giderler
    .filter((giderItem) => resolveGiderMonthKey(giderItem) === monthKey && isSayilabilirGider(giderItem))
    .map((giderItem) => ({
      tip: 'Gider',
      tarih: giderItem.odeme_tarihi || giderItem.fatura_tarihi,
      baslik: giderItem.baslik,
      kisi: giderItem.tedarikci?.ad ?? 'Tedarikçi belirtilmedi',
      kategori: giderItem.kategori?.ad ?? 'Diğer',
      durum: giderItem.durum === 'odendi' ? 'Ödendi' : giderItem.durum === 'gecikti' ? 'Gecikti' : 'Bekliyor',
      tutar: giderItem.tutar,
    }))

  return [...incomeRows, ...expenseRows].sort((a, b) => b.tarih.localeCompare(a.tarih))
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function buildCsv<T extends Record<string, string | number | null | undefined>>(
  rows: T[],
  columns: { key: keyof T; label: string }[]
): string {
  const header = columns.map((column) => csvEscape(column.label)).join(',')
  const body = rows.map((row) => columns.map((column) => csvEscape(row[column.key])).join(',')).join('\n')
  return `\uFEFF${header}\n${body}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildMonthlyReportHtml(params: {
  okulAdi: string
  monthKey: string
  overview: FinansOverview
  categoryRows: FinansCategorySlice[]
  ledgerRows: FinansLedgerRow[]
}) {
  const { okulAdi, monthKey, overview, categoryRows, ledgerRows } = params

  const kategoriRowsHtml = categoryRows.length > 0
    ? categoryRows.map((row) => `
        <tr>
          <td>${escapeHtml(row.ad)}</td>
          <td>${escapeHtml(row.ikon)}</td>
          <td>${formatMoney(row.tutar)}</td>
          <td>%${row.yuzde}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4">Bu ay için kategori verisi bulunmuyor.</td></tr>'

  const ledgerRowsHtml = ledgerRows.length > 0
    ? ledgerRows.map((row) => `
        <tr>
          <td>${escapeHtml(row.tarih)}</td>
          <td>${escapeHtml(row.tip)}</td>
          <td>${escapeHtml(row.baslik)}</td>
          <td>${escapeHtml(row.kisi)}</td>
          <td>${escapeHtml(row.kategori)}</td>
          <td>${escapeHtml(row.durum)}</td>
          <td>${formatMoney(row.tutar)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="7">Bu ay için hareket bulunmuyor.</td></tr>'

  return `
    <!DOCTYPE html>
    <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(okulAdi)} - ${escapeHtml(formatMonthLabel(monthKey))}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #0f172a; }
          .hero { background: linear-gradient(135deg, #0f172a, #5b21b6); color: #fff; padding: 24px; border-radius: 20px; margin-bottom: 24px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; }
          .muted { color: #64748b; font-size: 12px; }
          .value { font-size: 24px; font-weight: 800; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 10px 8px; font-size: 12px; }
          th { color: #475569; background: #f8fafc; }
          h2 { margin-top: 28px; }
        </style>
      </head>
      <body>
        <section class="hero">
          <div class="muted">${escapeHtml(okulAdi)}</div>
          <h1>${escapeHtml(formatMonthLabel(monthKey))} Finansal Rapor</h1>
          <div class="summary">
            <div class="card">
              <div class="muted">Gelir</div>
              <div class="value">${formatMoney(overview.gelir)}</div>
            </div>
            <div class="card">
              <div class="muted">Gider</div>
              <div class="value">${formatMoney(overview.gider)}</div>
            </div>
            <div class="card">
              <div class="muted">Net</div>
              <div class="value">${formatMoney(overview.net)}</div>
            </div>
          </div>
        </section>

        <h2>Kategori Dağılımı</h2>
        <table>
          <thead>
            <tr>
              <th>Kategori</th>
              <th>İkon</th>
              <th>Tutar</th>
              <th>Pay</th>
            </tr>
          </thead>
          <tbody>${kategoriRowsHtml}</tbody>
        </table>

        <h2>Hareket Dökümü</h2>
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Tip</th>
              <th>Başlık</th>
              <th>Kişi</th>
              <th>Kategori</th>
              <th>Durum</th>
              <th>Tutar</th>
            </tr>
          </thead>
          <tbody>${ledgerRowsHtml}</tbody>
        </table>
      </body>
    </html>
  `
}
