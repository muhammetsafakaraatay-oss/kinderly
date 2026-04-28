export const VALID_CONTACT_TYPES = ['parent', 'family', 'approved_pickup', 'emergency'] as const
export type JoinContactType = (typeof VALID_CONTACT_TYPES)[number]

export const VALID_INVITE_TYPES = ['staff', 'organization'] as const
export type InviteType = (typeof VALID_INVITE_TYPES)[number]

export const VALID_TARGET_ROLES = ['admin', 'ogretmen', 'mudur', 'yardimci', 'veli'] as const
export type TargetRole = (typeof VALID_TARGET_ROLES)[number]

export function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return ''

  return value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase()
}

export function generateInviteToken() {
  return crypto.randomUUID().replace(/-/g, '')
}

export function getInviteAcceptUrl(token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kinderx.app'
  return `${appUrl}/giris?join_token=${encodeURIComponent(token)}`
}
