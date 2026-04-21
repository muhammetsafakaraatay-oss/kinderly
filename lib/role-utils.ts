import type { Role } from '@/lib/auth'

export function normalizeRole(value: string | null | undefined): Role {
  if (!value) return null

  const normalized = value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ö/g, 'o')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')

  if (
    normalized === 'admin' ||
    normalized.includes('admin') ||
    normalized.includes('yonet') ||
    normalized.includes('mudur') ||
    normalized.includes('owner') ||
    normalized.includes('kurucu')
  ) return 'admin'

  if (
    normalized.includes('ogretmen') ||
    normalized.includes('teacher') ||
    normalized.includes('yardimci') ||
    normalized.includes('assistant') ||
    normalized.includes('staff')
  ) return 'ogretmen'
  if (normalized.includes('veli') || normalized.includes('parent')) return 'veli'

  return null
}

export function isTeacherRole(value: string | null | undefined) {
  return normalizeRole(value) === 'ogretmen'
}
