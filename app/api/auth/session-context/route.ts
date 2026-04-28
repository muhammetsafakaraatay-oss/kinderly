import { NextResponse } from 'next/server'
import { authenticateRequest, createAdminClient } from '@/lib/server-auth'
import { normalizeRole } from '@/lib/role-utils'

type SchoolRow = {
  id: number | string
  ad: string
  slug: string
  plan?: string | null
  plan_bitis?: string | null
}

type StaffMembershipRow = {
  okul_id: number | string
  rol: string
  aktif?: boolean | null
}

type ParentMembershipRow = {
  okul_id: number | string
  iliski_tipi?: string | null
  aktif?: boolean | null
}

async function loadMembershipRows(admin: ReturnType<typeof createAdminClient>, userId: string, normalizedEmail: string) {
  const [{ data: personelRowsByUserId }, { data: veliRowsByUserId }] = await Promise.all([
    admin
      .from('personel')
      .select('okul_id, rol, aktif')
      .eq('user_id', userId)
      .eq('aktif', true),
    admin
      .from('veliler')
      .select('okul_id, iliski_tipi, aktif')
      .eq('user_id', userId)
      .eq('aktif', true),
  ])

  if (personelRowsByUserId?.length || veliRowsByUserId?.length || !normalizedEmail) {
    return {
      personelRows: (personelRowsByUserId ?? []) as StaffMembershipRow[],
      veliRows: (veliRowsByUserId ?? []) as ParentMembershipRow[],
    }
  }

  const [personelRowsByEmail, veliRowsByEmail] = await Promise.all([
    admin
      .from('personel')
      .select('okul_id, rol, aktif')
      .ilike('email', normalizedEmail)
      .eq('aktif', true)
      .then(({ data }) => (data ?? []) as StaffMembershipRow[]),
    admin
      .from('veliler')
      .select('okul_id, iliski_tipi, aktif')
      .ilike('email', normalizedEmail)
      .eq('aktif', true)
      .then(({ data }) => (data ?? []) as ParentMembershipRow[]),
  ])

  return {
    personelRows: personelRowsByEmail,
    veliRows: veliRowsByEmail,
  }
}

async function loadSchoolMap(admin: ReturnType<typeof createAdminClient>, schoolIds: Array<number | string>) {
  const schoolMap = new Map<string, SchoolRow>()
  if (!schoolIds.length) return schoolMap

  const { data: schools } = await admin
    .from('okullar')
    .select('id, ad, slug')
    .in('id', schoolIds)

  for (const school of schools ?? []) {
    schoolMap.set(String(school.id), school)
  }

  return schoolMap
}

export async function GET(request: Request) {
  try {
    const { user } = await authenticateRequest(request)
    const admin = createAdminClient()
    const normalizedEmail = user.email?.trim().toLocaleLowerCase('tr-TR') ?? ''

    const { personelRows, veliRows } = await loadMembershipRows(admin, user.id, normalizedEmail)
    const schoolIds = Array.from(new Set(
      [...personelRows, ...veliRows]
        .map((row) => row.okul_id)
        .filter((value): value is number | string => value !== null && value !== undefined)
    ))

    const schoolMap = await loadSchoolMap(admin, schoolIds)

    const staffMemberships = personelRows.flatMap((row) => {
      const okul = schoolMap.get(String(row.okul_id))
      const role = normalizeRole(row.rol)

      if (!okul || !role) return []

      return [{
        organizationId: String(okul.id),
        organizationType: 'school' as const,
        role,
        membershipStatus: 'active' as const,
        okul,
      }]
    })

    const parentMemberships = veliRows.flatMap((row) => {
      const okul = schoolMap.get(String(row.okul_id))
      if (!okul) return []

      return [{
        organizationId: String(okul.id),
        organizationType: 'school' as const,
        role: 'veli' as const,
        membershipStatus: 'active' as const,
        okul,
      }]
    })

    const memberships = [...staffMemberships, ...parentMemberships]
    const activeMembership = memberships[0] ?? null

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      memberships,
      activeSchool: activeMembership?.okul ?? null,
      role: activeMembership?.role ?? null,
      membershipStatus: activeMembership?.membershipStatus ?? 'inactive',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Oturum baglami alinmadi.' },
      { status: 401 }
    )
  }
}
