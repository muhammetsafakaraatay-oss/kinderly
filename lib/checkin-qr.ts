export type CheckInQrPayload = {
  type: 'kinderx-checkin'
  version: 1
  okul_id: string
}

export function buildCheckInQrPayload(okulId: string | number): string {
  const payload: CheckInQrPayload = {
    type: 'kinderx-checkin',
    version: 1,
    okul_id: String(okulId),
  }

  return JSON.stringify(payload)
}

export function parseCheckInQrPayload(value: string): CheckInQrPayload | null {
  try {
    const payload = JSON.parse(value) as Partial<CheckInQrPayload>
    if (payload.type !== 'kinderx-checkin') return null
    if (!payload.okul_id) return null

    return {
      type: 'kinderx-checkin',
      version: 1,
      okul_id: String(payload.okul_id),
    }
  } catch {
    return null
  }
}
