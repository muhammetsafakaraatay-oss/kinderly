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

export async function GET(request: Request) {
  try {
    const { user } = await authenticateRequest(request)
    const admin = createAdminClient()
    const normalizedEmail = user.email?.trim().toLocaleLowerCase('tr-TR') ?? ''

    const [{ data: personelRowsByUserId }, { data: veliRowsByUserId }] = await Promise.all([
      admin
        .from('personel')
        .select('okul_id, rol, aktif')
        .eq('user_id', user.id)
        .eq('aktif', true),
      admin
        .from('veliler')
        .select('okul_id, iliski_tipi, aktif')
        .eq('user_id', user.id)
        .eq('aktif', true),
    ])

    const [personelRowsByEmail, veliRowsByEmail] =
      !personelRowsByUserId?.length && !veliRowsByUserId?.length && normalizedEmail
        ? await Promise.all([
            admin
              .from('personel')
              .select('okul_id, rol, aktif')
              .ilike('email', normalizedEmail)
              .eq('aktif', true)
              .then(({ data }) => data ?? []),
            admin
              .from('veliler')
              .select('okul_id, iliski_tipi, aktif')
              .ilike('email', normalizedEmail)
              .eq('aktif', true)
              .then(({ data }) => data ?? []),
          ])
        : [[], []]

    const personelRows = (personelRowsByUserId?.length ? personelRowsByUserId : personelRowsByEmail) ?? []
    const veliRows = (veliRowsByUserId?.length ? veliRowsByUserId : veliRowsByEmail) ?? []
    const schoolIds = Array.from(new Set(
      [...personelRows, ...veliRows]
        .map((row) => row.okul_id)
        .filter((value): value is number | string => value !== null && value !== undefined)
    ))

    const schoolMap = new Map<string, SchoolRow>()

    if (schoolIds.length) {
      const { data: schools } = await admin
        .from('okullar')
        .select('id, ad, slug, plan, plan_bitis')
        .in('id', schoolIds)

      for (const school of schools ?? []) {
        schoolMap.set(String(school.id), school)
      }
    }

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
