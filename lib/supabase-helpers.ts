import { supabase } from '@/lib/supabase'

type SupabaseErrorLike = {
  message?: string
  code?: string
  details?: string | null
  hint?: string | null
} | null | undefined

export type ChildRecord = {
  id: number
  ad_soyad: string
  sinif?: string | null
}

type MessagePartyResult = {
  senderId: number
  receiverId: number | null
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

function errorText(error: SupabaseErrorLike) {
  return `${error?.code ?? ''} ${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase()
}

function isInvalidIntegerError(error: SupabaseErrorLike) {
  return errorText(error).includes('invalid input syntax for type integer')
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

export async function loadParentChildren(userId: string, okulId: string | number) {
  const relationQuery = await supabase
    .from('veliler')
    .select('ogrenci_id, ogrenciler(id,ad_soyad,sinif)')
    .eq('user_id', userId)
    .eq('okul_id', okulId)

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

  const veliQuery = await supabase
    .from('veliler')
    .select('ogrenci_id')
    .eq('user_id', userId)
    .eq('okul_id', okulId)

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
  const { data: veli, error: veliError } = await supabase
    .from('veliler')
    .select('id')
    .eq('user_id', userId)
    .eq('okul_id', okulId)
    .eq('ogrenci_id', ogrenciId)
    .maybeSingle()

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

  const ogretmenler = (activeTeachers || []).filter((item: { rol?: string | null }) => item.rol === 'ogretmen')
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
    },
    error: null as SupabaseErrorLike,
  }
}

export async function resolveTeacherMessageParties(userId: string, okulId: string | number, ogrenciId: number) {
  const { data: personel, error: personelError } = await supabase
    .from('personel')
    .select('id')
    .eq('user_id', userId)
    .eq('okul_id', okulId)
    .maybeSingle()

  if (personelError || !personel?.id) {
    return { data: null as MessagePartyResult | null, error: personelError ?? { message: 'Personel kaydı bulunamadı.' } }
  }

  const { data: veli, error: veliError } = await supabase
    .from('veliler')
    .select('id')
    .eq('okul_id', okulId)
    .eq('ogrenci_id', ogrenciId)
    .eq('aktif', true)
    .limit(1)

  return {
    data: {
      senderId: Number(personel.id),
      receiverId: veli?.[0]?.id ? Number(veli[0].id) : null,
    },
    error: veliError,
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
    { ...base, baslik, icerik, tarih: new Date().toISOString().split('T')[0] },
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
    data: (response.data || []).map((row) => normalizeMessage(row as Record<string, unknown>)),
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
    data: (response.data || []).map((row) => normalizeMessage(row as Record<string, unknown>)).reverse(),
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
