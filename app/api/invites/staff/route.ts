import { NextResponse } from 'next/server'
import { sendJoinInviteEmail } from '@/lib/email'
import { generateInviteToken, getInviteAcceptUrl, VALID_TARGET_ROLES, normalizeEmail } from '@/lib/join'
import { authenticateRequest, createAdminClient } from '@/lib/server-auth'

type StaffInviteBody = {
  okul_id?: number
  ad_soyad?: string
  email?: string
  telefon?: string
  rol?: string
  sinif?: string
}

export async function POST(request: Request) {
  try {
    const { user } = await authenticateRequest(request)
    const admin = createAdminClient()
    const body = (await request.json().catch(() => null)) as StaffInviteBody | null

    const okulId = body?.okul_id
    const adSoyad = body?.ad_soyad?.trim() ?? ''
    const email = normalizeEmail(body?.email)
    const telefon = body?.telefon?.trim() ?? ''
    const rol = body?.rol?.trim() ?? 'ogretmen'
    const sinif = body?.sinif?.trim() ?? ''

    if (!okulId || !adSoyad || !email) {
      return NextResponse.json({ error: 'Okul, ad soyad ve e-posta zorunludur.' }, { status: 400 })
    }

    if (!VALID_TARGET_ROLES.includes(rol as (typeof VALID_TARGET_ROLES)[number]) || rol === 'veli') {
      return NextResponse.json({ error: 'Gecerli bir personel rolu secin.' }, { status: 400 })
    }

    const { data: callerPersonel } = await admin
      .from('personel')
      .select('rol')
      .eq('user_id', user.id)
      .eq('okul_id', okulId)
      .eq('aktif', true)
      .maybeSingle()

    if (!callerPersonel || callerPersonel.rol !== 'admin') {
      return NextResponse.json({ error: 'Bu islem icin yetkiniz yok.' }, { status: 403 })
    }

    const { data: okul } = await admin
      .from('okullar')
      .select('ad')
      .eq('id', okulId)
      .maybeSingle()

    if (!okul) {
      return NextResponse.json({ error: 'Okul bulunamadi.' }, { status: 404 })
    }

    const token = generateInviteToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error: inviteError } = await admin
      .from('organization_invites')
      .insert({
        okul_id: okulId,
        invite_type: 'staff',
        email,
        phone: telefon || null,
        target_role: rol,
        token,
        expires_at: expiresAt,
        created_by: user.id,
        full_name: adSoyad,
        class_name: sinif || null,
      })

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    await sendJoinInviteEmail({
      email,
      adSoyad,
      okulAd: okul.ad,
      inviteUrl: getInviteAcceptUrl(token),
      roleLabel: rol,
    })

    return NextResponse.json({
      success: true,
      message: 'Personel daveti olusturuldu.',
      token,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Personel daveti olusturulamadi.'
    const status = message === 'Yetkilendirme gerekli.' || message === 'Geçersiz oturum.' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
