import { supabase } from '@/lib/supabase'
import { isTeacherRole } from '@/lib/role-utils'
import { todayLocalKey } from '@/lib/date-utils'

type SupabaseErrorLike = {
  message?: string
  code?: string
  details?: string | null
  hint?: string | null
} | null | undefined

type MessageRowLike = {
  id?: number | string | null
  okul_id?: string | number | null
  ogrenci_id?: number | null
  gonderen_id?: string | number | null
  gonderen_rol?: string | null
  gonderen_ad?: string | null
  alici_id?: number | null
  icerik?: string | null
  mesaj?: string | null
  content?: string | null
  created_at?: string | null
}

export type ChildRecord = {
  id: number
  ad_soyad: string
  sinif?: string | null
}

type MessagePartyResult = {
  senderId: number
  receiverId: number | null
  receiverIds: number[]
}

type SendMessageCompatResult = {
  sentCount: number
  failedCount: number
  attemptedCount: number
  error: SupabaseErrorLike
  partialFailure: SupabaseErrorLike
}

export type ActivityWithPhotoDetail = {
  detay?: {
    url?: string | null
    storagePath?: string | null
    path?: string | null
    [key: string]: unknown
  } | null
  [key: string]: unknown
}

export type AnnouncementItem = {
  id: string
  baslik: string
  icerik: string
  created_at: string
}

export type NormalizedMessage = {
  id: string
  okul_id: number | string | null
  ogrenci_id: number | null
  gonderen_id: number | null
  alici_id: number | null
  gonderen_rol: string
  alici_tip: string
  content: string
  created_at: string
  okundu: boolean
}

const PHOTO_BUCKET = 'photos'
const SIGNED_URL_EXPIRES_IN = 60 * 60
const PARENT_APP_ACCESS_TYPES = ['parent', 'family']

function errorText(error: SupabaseErrorLike) {
  return `${error?.code ?? ''} ${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase()
}

function isInvalidIntegerError(error: SupabaseErrorLike) {
  return errorText(error).includes('invalid input syntax for type integer')
}

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLocaleLowerCase('tr-TR')
}

function messageText(row: MessageRowLike) {
  return `${row.content ?? row.icerik ?? row.mesaj ?? ''}`.trim()
}

function messageTimestamp(row: MessageRowLike) {
  const value = row.created_at ? Date.parse(row.created_at) : Number.NaN
  return Number.isFinite(value) ? value : null
}

function isStaffFanoutDuplicate(a: MessageRowLike, b: MessageRowLike) {
  if (!a || !b) return false
  if (!['admin', 'ogretmen'].includes(a.gonderen_rol ?? '')) return false
  if (!['admin', 'ogretmen'].includes(b.gonderen_rol ?? '')) return false
  if ((a.gonderen_rol ?? null) !== (b.gonderen_rol ?? null)) return false
  if ((a.ogrenci_id ?? null) !== (b.ogrenci_id ?? null)) return false
  if (`${a.gonderen_id ?? ''}` !== `${b.gonderen_id ?? ''}`) return false
  if (messageText(a) !== messageText(b)) return false

  const senderRecipient = a.alici_id == null ? null : String(a.alici_id)
  const candidateRecipient = b.alici_id == null ? null : String(b.alici_id)

  if (!senderRecipient || !candidateRecipient || senderRecipient === candidateRecipient) {
    return false
  }

  const firstTs = messageTimestamp(a)
  const secondTs = messageTimestamp(b)

  if (firstTs == null || secondTs == null) return false

  return Math.abs(firstTs - secondTs) <= 3000
}

export function dedupeThreadMessages<T extends MessageRowLike>(rows: T[]) {
  const deduped: T[] = []

  for (const row of rows) {
    const previous = deduped[deduped.length - 1]
    if (previous && isStaffFanoutDuplicate(previous, row)) {
      continue
    }
    deduped.push(row)
  }

  return deduped
}

export function isMissingColumnError(error: SupabaseErrorLike, columns: string[]) {
  const text = errorText(error)
  return columns.some((column) => text.includes(column.toLowerCase())) &&
    (
      text.includes('does not exist') ||
      text.includes('could not find') ||
      text.includes('schema cache') ||
      error?.code === '42703' ||
      error?.code === 'PGRST204'
    )
}

export function getSupabaseErrorMessage(error: SupabaseErrorLike, fallback = 'Bir hata oluştu.') {
  return error?.message || fallback
}

export function getUserFacingErrorMessage(error: SupabaseErrorLike, fallback = 'İşlem şu anda tamamlanamadı. Lütfen tekrar deneyin.') {
  if (!isProduction()) {
    return getSupabaseErrorMessage(error, fallback)
  }
  return fallback
}

async function selectActiveParentRows(okulId: string | number, ogrenciId: number) {
  const scoped = await supabase
    .from('veliler')
    .select('id,iliski_tipi')
    .eq('okul_id', okulId)
    .eq('ogrenci_id', ogrenciId)
    .eq('aktif', true)
    .in('iliski_tipi', PARENT_APP_ACCESS_TYPES)
    .limit(10)

  if (!scoped.error || !isMissingColumnError(scoped.error, ['iliski_tipi'])) {
    return scoped
  }

  return supabase
    .from('veliler')
    .select('id')
    .eq('okul_id', okulId)
    .eq('ogrenci_id', ogrenciId)
    .eq('aktif', true)
    .limit(10)
}

async function selectParentChildrenRows(userId: string, okulId: string | number) {
  const scoped = await supabase
    .from('veliler')
    .select('ogrenci_id, ogrenciler(id,ad_soyad,sinif)')
    .eq('user_id', userId)
    .eq('okul_id', okulId)
    .eq('aktif', true)
    .in('iliski_tipi', PARENT_APP_ACCESS_TYPES)

  if (!scoped.error || !isMissingColumnError(scoped.error, ['iliski_tipi'])) {
    return scoped
  }

  return supabase
    .from('veliler')
    .select('ogrenci_id, ogrenciler(id,ad_soyad,sinif)')
    .eq('user_id', userId)
    .eq('okul_id', okulId)
    .eq('aktif', true)
}

async function selectParentChildIds(userId: string, okulId: string | number) {
  const scoped = await supabase
    .from('veliler')
    .select('ogrenci_id')
    .eq('user_id', userId)
    .eq('okul_id', okulId)
    .eq('aktif', true)
    .in('iliski_tipi', PARENT_APP_ACCESS_TYPES)

  if (!scoped.error || !isMissingColumnError(scoped.error, ['iliski_tipi'])) {
    return scoped
  }

  return supabase
    .from('veliler')
    .select('ogrenci_id')
    .eq('user_id', userId)
    .eq('okul_id', okulId)
    .eq('aktif', true)
}

async function selectParentMessageRows(userId: string, okulId: string | number, ogrenciId: number) {
  const scoped = await supabase
    .from('veliler')
    .select('id')
    .eq('user_id', userId)
    .eq('okul_id', okulId)
    .eq('ogrenci_id', ogrenciId)
    .eq('aktif', true)
    .in('iliski_tipi', PARENT_APP_ACCESS_TYPES)
    .limit(1)

  if (!scoped.error || !isMissingColumnError(scoped.error, ['iliski_tipi'])) {
    return scoped
  }

  return supabase
    .from('veliler')
    .select('id')
    .eq('user_id', userId)
    .eq('okul_id', okulId)
    .eq('ogrenci_id', ogrenciId)
    .eq('aktif', true)
    .limit(1)
}

export async function loadParentChildren(userId: string, okulId: string | number) {
  const relationQuery = await selectParentChildrenRows(userId, okulId)

  const relationRows = (relationQuery.data || [])
    .map((item) => {
      const relation = (item as { ogrenciler?: ChildRecord | ChildRecord[] | null }).ogrenciler
      if (Array.isArray(relation)) return relation[0] ?? null
      return relation ?? null
    })
    .filter((child): child is ChildRecord => Boolean(child))

  if (!relationQuery.error && relationRows.length > 0) {
    return { data: relationRows, error: null as SupabaseErrorLike }
  }

  const veliQuery = await selectParentChildIds(userId, okulId)

  if (veliQuery.error) {
    return { data: [] as ChildRecord[], error: veliQuery.error }
  }

  const ids = (veliQuery.data || [])
    .map((item: { ogrenci_id?: number | null }) => item.ogrenci_id)
    .filter(Boolean) as number[]

  if (!ids.length) {
    return { data: [] as ChildRecord[], error: relationQuery.error }
  }

  const ogrQuery = await supabase
    .from('ogrenciler')
    .select('id,ad_soyad,sinif')
    .in('id', ids)
    .order('ad_soyad')

  return {
    data: (ogrQuery.data || []) as ChildRecord[],
    error: ogrQuery.error ?? relationQuery.error,
  }
}

export async function resolveParentMessageParties(userId: string, okulId: string | number, ogrenciId: number) {
  const { data: veliRows, error: veliError } = await selectParentMessageRows(userId, okulId, ogrenciId)

  const veli = veliRows?.[0]
  if (veliError || !veli?.id) {
    return { data: null as MessagePartyResult | null, error: veliError ?? { message: 'Veli kaydı bulunamadı.' } }
  }

  const { data: ogrenci, error: ogrenciError } = await supabase
    .from('ogrenciler')
    .select('sinif')
    .eq('id', ogrenciId)
    .maybeSingle()

  if (ogrenciError) {
    return { data: null as MessagePartyResult | null, error: ogrenciError }
  }

  const { data: activeTeachers, error: personelError } = await supabase
    .from('personel')
    .select('id,sinif,rol')
    .eq('okul_id', okulId)
    .eq('aktif', true)

  if (personelError) {
    return { data: null as MessagePartyResult | null, error: personelError }
  }

  const ogretmenler = (activeTeachers || []).filter((item: { rol?: string | null }) => isTeacherRole(item.rol))
  const sameClass = ogrenci?.sinif
    ? ogretmenler.filter((item: { sinif?: string | null }) => item.sinif === ogrenci.sinif)
    : []

  const resolvedTeacher =
    sameClass.length === 1 ? sameClass[0]
      : ogretmenler.length === 1 ? ogretmenler[0]
        : null

  if (!resolvedTeacher?.id) {
    return {
      data: null as MessagePartyResult | null,
      error: { message: 'Bu öğrenci için net bir öğretmen eşleşmesi bulunamadı.' },
    }
  }

  return {
    data: {
      senderId: Number(veli.id),
      receiverId: Number(resolvedTeacher.id),
      receiverIds: [Number(resolvedTeacher.id)],
    },
    error: null as SupabaseErrorLike,
  }
}

export async function resolveTeacherMessageParties(userId: string, okulId: string | number, ogrenciId: number) {
  const { data: user, error: userError } = await supabase.auth.getUser()
  if (userError) {
    return { data: null as MessagePartyResult | null, error: userError }
  }

  let personel: { id: number; rol?: string | null; sinif?: string | null } | null = null

  const { data: personelByUserId, error: personelError } = await supabase
    .from('personel')
    .select('id,rol,sinif')
    .eq('user_id', userId)
    .eq('okul_id', okulId)
    .eq('aktif', true)
    .maybeSingle()

  personel = personelByUserId

  if (!personel?.id && user?.user?.email) {
    const email = normalizeEmail(user.user.email)
    const { data: personelByEmailRows, error: emailError } = await supabase
      .from('personel')
      .select('id,email,rol,sinif')
      .eq('okul_id', okulId)
      .ilike('email', email)
      .eq('aktif', true)
      .limit(5)

    if (emailError) {
      return { data: null as MessagePartyResult | null, error: emailError }
    }

    const personelByEmail = personelByEmailRows?.find((row) => normalizeEmail(row.email) === email)
    personel = personelByEmail ? { id: Number(personelByEmail.id), rol: personelByEmail.rol, sinif: personelByEmail.sinif } : null
  }

  if (personelError || !personel?.id) {
    return { data: null as MessagePartyResult | null, error: personelError ?? { message: 'Personel kaydı bulunamadı.' } }
  }

  if (isTeacherRole(personel.rol)) {
    const teacherClass = typeof personel.sinif === 'string' ? personel.sinif.trim() : ''
    if (!teacherClass) {
      return { data: null as MessagePartyResult | null, error: { message: 'Bu öğretmene sınıf atanmamış.' } }
    }

    const { data: childClass, error: childClassError } = await supabase
      .from('ogrenciler')
      .select('id,sinif')
      .eq('okul_id', okulId)
      .eq('id', ogrenciId)
      .eq('aktif', true)
      .maybeSingle()

    if (childClassError || !childClass) {
      return { data: null as MessagePartyResult | null, error: childClassError ?? { message: 'Öğrenci kaydı bulunamadı.' } }
    }

    if (childClass.sinif !== teacherClass) {
      return { data: null as MessagePartyResult | null, error: { message: 'Bu öğrenci öğretmenin atanmış sınıfında değil.' } }
    }
  }

  const { data: veli, error: veliError } = await selectActiveParentRows(okulId, ogrenciId)

  const receiverIds = Array.from(
    new Set((veli || []).map((item) => Number(item.id)).filter((id) => Number.isFinite(id)))
  )

  if (!receiverIds.length) {
    return {
      data: null as MessagePartyResult | null,
      error: veliError ?? { message: 'Bu öğrenci için aktif veli kaydı bulunamadı.' },
    }
  }

  return {
    data: {
      senderId: Number(personel.id),
      receiverId: receiverIds[0] ?? null,
      receiverIds,
    },
    error: veliError,
  }
}

export async function sendMessageToRecipientsCompat(base: Record<string, unknown>, receiverIds: number[], content: string): Promise<SendMessageCompatResult> {
  const uniqueReceiverIds = Array.from(new Set(receiverIds)).filter((id) => Number.isFinite(id))

  if (!uniqueReceiverIds.length) {
    return {
      sentCount: 0,
      failedCount: 0,
      attemptedCount: 0,
      error: { message: 'Mesaj gönderilecek alıcı bulunamadı.' } as SupabaseErrorLike,
      partialFailure: null as SupabaseErrorLike,
    }
  }

  let lastError: SupabaseErrorLike = null
  let sentCount = 0
  let failedCount = 0

  for (const receiverId of uniqueReceiverIds) {
    const { error } = await insertMessageCompat({ ...base, alici_id: receiverId }, content)
    if (error) {
      lastError = error
      failedCount += 1
      continue
    }
    sentCount += 1
  }

  return {
    sentCount,
    failedCount,
    attemptedCount: uniqueReceiverIds.length,
    error: sentCount > 0 ? null as SupabaseErrorLike : lastError,
    partialFailure: failedCount > 0 ? lastError : null as SupabaseErrorLike,
  }
}

export async function insertMessageCompat(base: Record<string, unknown>, content: string) {
  const attempts: Record<string, unknown>[] = [
    { ...base, gonderen_tip: base.gonderen_rol, icerik: content },
    { ...base, gonderen_tip: base.gonderen_rol, mesaj: content },
    { ...base, icerik: content },
    { ...base, mesaj: content },
  ]

  let lastError: SupabaseErrorLike = null

  for (let index = 0; index < attempts.length; index += 1) {
    const payload = attempts[index]
    const { error } = await supabase.from('mesajlar').insert(payload)
    if (!error) return { error: null as SupabaseErrorLike }
    lastError = error

    if ('gonderen_id' in payload && isInvalidIntegerError(error)) {
      attempts.splice(index + 1, 0, Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'gonderen_id')))
      continue
    }

    if (!isMissingColumnError(error, ['icerik', 'mesaj'])) {
      return { error }
    }
  }

  return { error: lastError }
}

export function normalizeAnnouncement(row: Record<string, unknown>): AnnouncementItem {
  return {
    id: String(row.id ?? `${row.created_at ?? Date.now()}`),
    baslik: String(row.baslik ?? row.title ?? 'Duyuru'),
    icerik: String(row.icerik ?? row.mesaj ?? row.aciklama ?? ''),
    created_at: String(row.created_at ?? row.tarih ?? new Date().toISOString()),
  }
}

export async function loadAnnouncementsCompat(okulId: string | number, limit = 50) {
  const orderedQuery = await supabase
    .from('duyurular')
    .select('*')
    .eq('okul_id', okulId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!orderedQuery.error) {
    return {
      data: (orderedQuery.data || []).map((row) => normalizeAnnouncement(row as Record<string, unknown>)),
      error: null as SupabaseErrorLike,
    }
  }

  if (!isMissingColumnError(orderedQuery.error, ['created_at'])) {
    return { data: [] as AnnouncementItem[], error: orderedQuery.error }
  }

  const fallbackQuery = await supabase
    .from('duyurular')
    .select('*')
    .eq('okul_id', okulId)
    .order('id', { ascending: false })
    .limit(limit)

  return {
    data: (fallbackQuery.data || []).map((row) => normalizeAnnouncement(row as Record<string, unknown>)),
    error: fallbackQuery.error,
  }
}

export async function insertAnnouncementCompat(base: Record<string, unknown>, baslik: string, icerik: string) {
  const attempts: Record<string, unknown>[] = [
    { ...base, baslik, icerik, created_at: new Date().toISOString() },
    { ...base, baslik, icerik, tarih: todayLocalKey() },
    { ...base, baslik, mesaj: icerik, created_at: new Date().toISOString() },
    { ...base, baslik, aciklama: icerik, created_at: new Date().toISOString() },
  ]

  let lastError: SupabaseErrorLike = null

  for (const payload of attempts) {
    const { error } = await supabase.from('duyurular').insert(payload)
    if (!error) return { error: null as SupabaseErrorLike }
    lastError = error

    if (!isMissingColumnError(error, ['icerik', 'mesaj', 'aciklama', 'created_at', 'tarih'])) {
      return { error }
    }
  }

  return { error: lastError }
}

export async function upsertAttendanceCompat(
  okulId: string | number,
  tarih: string,
  rows: Array<{ ogrenci_id: number; durum: string }>
) {
  if (!rows.length) return { error: null as SupabaseErrorLike }

  const payload = rows.map((row) => ({
    okul_id: okulId,
    ogrenci_id: row.ogrenci_id,
    tarih,
    durum: row.durum,
  }))

  const upsertQuery = await supabase
    .from('yoklama')
    .upsert(payload, { onConflict: 'okul_id,ogrenci_id,tarih' })

  if (!upsertQuery.error) {
    return { error: null as SupabaseErrorLike }
  }

  await supabase.from('yoklama').delete().eq('okul_id', okulId).eq('tarih', tarih)
  const insertQuery = await supabase.from('yoklama').insert(payload)
  return { error: insertQuery.error ?? upsertQuery.error }
}

export async function insertActivityCompat(base: Record<string, unknown>) {
  const attempts: Record<string, unknown>[] = [
    { ...base, created_at: new Date().toISOString() },
    { ...base, olusturuldu: new Date().toISOString() },
    { ...base },
  ]

  let lastError: SupabaseErrorLike = null

  for (const payload of attempts) {
    const { error } = await supabase.from('aktiviteler').insert(payload)
    if (!error) return { error: null as SupabaseErrorLike }
    lastError = error

    if (!isMissingColumnError(error, ['created_at', 'olusturuldu'])) {
      return { error }
    }
  }

  return { error: lastError }
}

export function normalizeMessage(row: Record<string, unknown>): NormalizedMessage {
  const gonderenRol = String(row.gonderen_rol ?? row.gonderen_tip ?? '')
  const aliciTip = String(row.alici_tip ?? '')
  const content = String(row.icerik ?? row.mesaj ?? '')
  const createdAt = String(row.olusturuldu ?? row.created_at ?? new Date().toISOString())

  return {
    id: String(row.id ?? `${row.ogrenci_id ?? 'mesaj'}-${createdAt}`),
    okul_id: (row.okul_id as number | string | null | undefined) ?? null,
    ogrenci_id: typeof row.ogrenci_id === 'number' ? row.ogrenci_id : row.ogrenci_id ? Number(row.ogrenci_id) : null,
    gonderen_id: typeof row.gonderen_id === 'number' ? row.gonderen_id : row.gonderen_id ? Number(row.gonderen_id) : null,
    alici_id: typeof row.alici_id === 'number' ? row.alici_id : row.alici_id ? Number(row.alici_id) : null,
    gonderen_rol: gonderenRol,
    alici_tip: aliciTip,
    content,
    created_at: createdAt,
    okundu: Boolean(row.okundu),
  }
}

export async function loadSchoolMessagesCompat(okulId: string | number, limit = 200) {
  const primary = await supabase
    .from('mesajlar')
    .select('*')
    .eq('okul_id', okulId)
    .limit(limit)
    .order('olusturuldu', { ascending: false })

  const response =
    primary.error && isMissingColumnError(primary.error, ['olusturuldu'])
      ? await supabase
        .from('mesajlar')
        .select('*')
        .eq('okul_id', okulId)
        .limit(limit)
        .order('created_at', { ascending: false })
      : primary

  return {
    data: dedupeThreadMessages((response.data || []).map((row) => normalizeMessage(row as Record<string, unknown>))),
    error: response.error,
  }
}

export async function loadStudentMessagesCompat(okulId: string | number, ogrenciId: number, limit = 200) {
  const primary = await supabase
    .from('mesajlar')
    .select('*')
    .eq('okul_id', okulId)
    .eq('ogrenci_id', ogrenciId)
    .limit(limit)
    .order('olusturuldu', { ascending: false })

  const response =
    primary.error && isMissingColumnError(primary.error, ['olusturuldu'])
      ? await supabase
        .from('mesajlar')
        .select('*')
        .eq('okul_id', okulId)
        .eq('ogrenci_id', ogrenciId)
        .limit(limit)
        .order('created_at', { ascending: false })
      : primary

  return {
    data: dedupeThreadMessages((response.data || []).map((row) => normalizeMessage(row as Record<string, unknown>)).reverse()),
    error: response.error,
  }
}

export async function markMessagesReadCompat(okulId: string | number, ogrenciId: number, aliciId?: number | null) {
  let query = supabase
    .from('mesajlar')
    .update({ okundu: true })
    .eq('okul_id', okulId)
    .eq('ogrenci_id', ogrenciId)
    .eq('okundu', false)

  if (typeof aliciId === 'number') {
    query = query.eq('alici_id', aliciId)
  }

  const { error } = await query
  return { error }
}

export async function createSignedPhotoUrl(storagePath: string, expiresIn = 60 * 60) {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(storagePath, expiresIn)
  return {
    data: data?.signedUrl ?? null,
    error,
  }
}

export function getPhotoStoragePath(detay: ActivityWithPhotoDetail['detay']) {
  if (detay?.storagePath || detay?.path) {
    return detay.storagePath || detay.path || null
  }

  const rawUrl = typeof detay?.url === 'string' ? detay.url : null
  if (!rawUrl) return null
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) return rawUrl

  try {
    const url = new URL(rawUrl)
    const markers = [
      `/object/public/${PHOTO_BUCKET}/`,
      `/object/sign/${PHOTO_BUCKET}/`,
      `/object/authenticated/${PHOTO_BUCKET}/`,
      `/${PHOTO_BUCKET}/`,
    ]

    for (const marker of markers) {
      const markerIndex = url.pathname.indexOf(marker)
      if (markerIndex >= 0) {
        return decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
      }
    }
  } catch {
    return null
  }

  return null
}

export async function withSignedPhotoUrls<T extends ActivityWithPhotoDetail>(rows: T[]) {
  return Promise.all(
    rows.map(async (row) => {
      const storagePath = getPhotoStoragePath(row.detay)
      const existingUrl = typeof row.detay?.url === 'string' ? row.detay.url : null
      if (!storagePath) return row

      const signed = await createSignedPhotoUrl(storagePath, SIGNED_URL_EXPIRES_IN)

      return {
        ...row,
        detay: {
          ...row.detay,
          url: signed.data || existingUrl || null,
          storagePath,
        },
      }
    })
  )
}

export async function createSignedStorageUrl(bucket: string, storagePath: string, expiresIn = 60 * 60) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, expiresIn)
  return {
    data: data?.signedUrl ?? null,
    error,
  }
}
