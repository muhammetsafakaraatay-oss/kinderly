import type { ContactType, VeliRecord } from '@/lib/types'

export type ContactKey = { kind: 'email' | 'phone'; value: string } | null

export const CONTACT_TYPES: Record<ContactType, {
  label: string
  desc: string
  canInvite: boolean
  color: string
  bg: string
}> = {
  parent: {
    label: 'Veli',
    desc: 'Mesaj, günlük akış ve aidat erişimi',
    canInvite: true,
    color: '#b45309',
    bg: '#fef3c7',
  },
  family: {
    label: 'Aile',
    desc: 'Günlük akış ve mesaj erişimi',
    canInvite: true,
    color: '#be185d',
    bg: '#fce7f3',
  },
  approved_pickup: {
    label: 'Teslim Yetkilisi',
    desc: 'Çocuğu teslim alma kaydı',
    canInvite: false,
    color: '#0369a1',
    bg: '#e0f2fe',
  },
  emergency: {
    label: 'Acil Durum',
    desc: 'Acil durumda aranacak kişi',
    canInvite: false,
    color: '#b91c1c',
    bg: '#fee2e2',
  },
}

export function normalizeEmail(value: string | null | undefined) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR')
}

export function isValidEmail(value: string | null | undefined) {
  const normalized = normalizeEmail(value)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export function normalizePhone(value: string | null | undefined) {
  return String(value || '').replace(/[^\d+]/g, '')
}

export function getContactType(value: string | null | undefined): ContactType {
  if (value === 'family' || value === 'approved_pickup' || value === 'emergency') {
    return value
  }
  return 'parent'
}

export function contactKeyFromValues(email: string | null | undefined, phone: string | null | undefined): ContactKey {
  const normalizedEmail = normalizeEmail(email)
  if (normalizedEmail) return { kind: 'email', value: normalizedEmail }

  const normalizedPhone = normalizePhone(phone)
  if (normalizedPhone) return { kind: 'phone', value: normalizedPhone }

  return null
}

export function contactKey(item: Pick<VeliRecord, 'email' | 'telefon'>): ContactKey {
  return contactKeyFromValues(item.email, item.telefon)
}

export function sameContact(a: ContactKey, b: ContactKey) {
  return Boolean(a && b && a.kind === b.kind && a.value === b.value)
}

export function isJoinedContact(item: Pick<VeliRecord, 'user_id' | 'son_davet_durumu'> | null | undefined) {
  if (!item?.user_id) return false

  return [
    'joined-from-signup',
    'joined-with-child-code',
    'linked-existing-user',
  ].includes(String(item.son_davet_durumu || ''))
}

export function statusFor(item: VeliRecord) {
  const type = CONTACT_TYPES[getContactType(item.iliski_tipi)]

  if (item.aktif === false) {
    return { label: 'Pasif', color: '#64748b', bg: '#f1f5f9' }
  }

  if (isJoinedContact(item)) {
    return { label: 'Hesap aktif', color: '#047857', bg: '#d1fae5' }
  }

  if (!type.canInvite) {
    return { label: 'Kişi kaydı', color: '#475569', bg: '#f1f5f9' }
  }

  if (item.son_davet_durumu === 'invite-email-failed') {
    return { label: 'Kodla devam et', color: '#b45309', bg: '#fffbeb' }
  }

  if (item.email?.trim()) {
    return item.davet_gonderildi_at
      ? { label: 'Davet gönderildi', color: '#b45309', bg: '#fef3c7' }
      : { label: 'Davet bekliyor', color: '#b45309', bg: '#fef3c7' }
  }

  return { label: 'Telefon kaydı', color: '#0369a1', bg: '#e0f2fe' }
}

export function formatChildCode(value: string | null | undefined) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length !== 10) return String(value || '')
  return `${digits.slice(0, 5)} ${digits.slice(5)}`
}

export function firstActiveContact(contacts: VeliRecord[], ogrenciId: number) {
  const prioritized = contacts
    .filter((item) => item.aktif !== false && Number(item.ogrenci_id) === Number(ogrenciId))
    .sort((a, b) => {
      const typeA = getContactType(a.iliski_tipi)
      const typeB = getContactType(b.iliski_tipi)
      const rankA = typeA === 'parent' ? 0 : typeA === 'family' ? 1 : typeA === 'approved_pickup' ? 2 : 3
      const rankB = typeB === 'parent' ? 0 : typeB === 'family' ? 1 : typeB === 'approved_pickup' ? 2 : 3
      return rankA - rankB
    })

  return prioritized[0] ?? null
}
