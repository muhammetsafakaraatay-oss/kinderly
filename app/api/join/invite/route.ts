import { NextResponse } from 'next/server'
import { authenticateRequest, createAdminClient } from '@/lib/server-auth'

type JoinInviteBody = {
  token?: string
}

export async function POST(request: Request) {
  try {
    const { user } = await authenticateRequest(request)
    const admin = createAdminClient()
    const body = (await request.json().catch(() => null)) as JoinInviteBody | null
    const token = body?.token?.trim() ?? ''

    if (!token) {
      return NextResponse.json({ error: 'Davet tokeni gerekli.' }, { status: 400 })
    }

    const { data: invite, error: inviteError } = await admin
      .from('organization_invites')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Davet bulunamadi.' }, { status: 404 })
    }

    if (invite.accepted_at) {
      return NextResponse.json({ error: 'Bu davet zaten kullanilmis.' }, { status: 409 })
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Davetin suresi dolmus.' }, { status: 410 })
    }

    if (invite.email && user.email?.toLowerCase() !== String(invite.email).toLowerCase()) {
      return NextResponse.json({ error: 'Bu davet baska bir e-posta adresine ait.' }, { status: 403 })
    }

    const normalizedRole = String(invite.target_role ?? '').trim().toLowerCase()

    if (normalizedRole === 'veli') {
      return NextResponse.json({ error: 'Veli davetleri icin kod ile katilim akisi kullanilmali.' }, { status: 400 })
    }

    const { data: existingPersonel } = await admin
      .from('personel')
      .select('id, user_id')
      .eq('okul_id', invite.okul_id)
      .ilike('email', invite.email)
      .limit(1)
      .maybeSingle()

    if (existingPersonel?.user_id && existingPersonel.user_id !== user.id) {
      return NextResponse.json({ error: 'Bu personel kaydi baska bir hesapla eslesmis.' }, { status: 409 })
    }

    if (existingPersonel) {
      const { error: updateError } = await admin
        .from('personel')
        .update({
          user_id: user.id,
          aktif: true,
          rol: invite.target_role,
          ad_soyad: invite.full_name || null,
          telefon: invite.phone || null,
          sinif: invite.class_name || null,
        })
        .eq('id', existingPersonel.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      const { error: insertError } = await admin
        .from('personel')
        .insert({
          user_id: user.id,
          okul_id: invite.okul_id,
          ad_soyad: invite.full_name,
          email: invite.email,
          telefon: invite.phone || null,
          rol: invite.target_role,
          sinif: invite.class_name || null,
          aktif: true,
        })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    const { error: inviteUpdateError } = await admin
      .from('organization_invites')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('id', invite.id)

    if (inviteUpdateError) {
      return NextResponse.json({ error: inviteUpdateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      okulId: invite.okul_id,
      role: invite.target_role,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Davet islenemedi.'
    const status = message === 'Yetkilendirme gerekli.' || message === 'Geçersiz oturum.' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
