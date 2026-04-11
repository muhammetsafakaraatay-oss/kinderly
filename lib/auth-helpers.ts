import type { Role } from '@/lib/auth'

export function rolePath(role: Role) {
  if (role === 'admin') return 'admin'
  if (role === 'ogretmen') return 'ogretmen'
  if (role === 'veli') return 'veli'
  return null
}
