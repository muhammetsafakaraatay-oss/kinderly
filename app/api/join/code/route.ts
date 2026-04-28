import { NextResponse } from 'next/server'
import { authenticateRequest, createAdminClient } from '@/lib/server-auth'
import { VALID_CONTACT_TYPES, normalizeEmail } from '@/lib/join'

type JoinCodeBody = {
  code?: string
  contactType?: string
  fullName?: string
  phone?: string
}

export async function POST(request: Request) {
  try {
    const { user } = await authenticateRequest(request)
    const admin = createAdminClient()
    const body = (await request.json().catch(() => null)) as JoinCodeBody | null
    const code = body?.code?.trim() ?? ''
    const contactType = body?.contactType?.trim() ?? ''
    const email = normalizeEmail(user.email)

    if (!/^\d{10}$/.test(code)) {
      return NextResponse.json({ error: 'Gecerli bir baglanti kodu girin.' }, { status: 400 })
    }

    if (!VALID_CONTACT_TYPES.includes(contactType as (typeof VALID_CONTACT_TYPES)[number])) {
      return NextResponse.json({ error: 'Gecerli bir baglanti tipi secin.' }, { status: 400 })
    }

    const { data: ogrenci, error: ogrenciError } = await admin
      .from('ogrenciler')
      .select('id, okul_id, ad_soyad, baglanti_kodu')
      .eq('baglanti_kodu', code)
      .eq('aktif', true)
      .maybeSingle()

    if (ogrenciError || !ogrenci) {
      return NextResponse.json({ error: 'Kod bulunamadi veya gecersiz.' }, { status: 404 })
    }

    const { data: existingMembership } = await admin
      .from('veliler')
      .select('id')
      .eq('user_id', user.id)
      .eq('ogrenci_id', ogrenci.id)
      .maybeSingle()

    if (existingMembership) {
      return NextResponse.json({
        success: true,
        okulId: ogrenci.okul_id,
        role: 'veli',
        message: 'Bu ogrenci icin zaten baglisiniz.',
      })
    }

    const baseName =
      body?.fullName?.trim() ||
      user.user_metadata?.ad_soyad ||
      user.user_metadata?.full_name ||
      email ||
      'Veli'

    const { data: matchingContact } = await admin
      .from('veliler')
      .select('id, user_id, email')
      .eq('okul_id', ogrenci.okul_id)
      .eq('ogrenci_id', ogrenci.id)
      .eq('iliski_tipi', contactType)
      .or(`email.ilike.${email},user_id.eq.${user.id}`)
      .limit(1)
      .maybeSingle()

    if (matchingContact?.user_id && matchingContact.user_id !== user.id) {
      return NextResponse.json({ error: 'Bu baglanti kaydi baska bir hesaba ait.' }, { status: 409 })
    }

    if (matchingContact) {
      const { error: updateError } = await admin
        .from('veliler')
        .update({
          user_id: user.id,
          ad_soyad: baseName,
          email,
          telefon: body?.phone?.trim() || null,
          aktif: true,
        })
        .eq('id', matchingContact.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      const { error: insertError } = await admin
        .from('veliler')
        .insert({
          user_id: user.id,
          okul_id: ogrenci.okul_id,
          ogrenci_id: ogrenci.id,
          ad_soyad: baseName,
          email,
          telefon: body?.phone?.trim() || null,
          iliski_tipi: contactType,
          aktif: true,
          teslim_alabilir: contactType === 'approved_pickup',
          acil_durum_kisisi: contactType === 'emergency',
        })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    if (contactType === 'parent') {
      await admin.rpc('rotate_child_link_code', { target_ogrenci_id: ogrenci.id })
    }

    return NextResponse.json({
      success: true,
      okulId: ogrenci.okul_id,
      role: 'veli',
      message: `${ogrenci.ad_soyad} icin baglanti tamamlandi.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kod ile baglanti kurulamadi.'
    const status = message === 'Yetkilendirme gerekli.' || message === 'Geçersiz oturum.' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
