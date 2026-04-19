import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type PersonelBody = {
  okul_id?: number
  ad_soyad?: string
  email?: string
  telefon?: string
  rol?: string
  sinif?: string
}

const EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/

function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik.' }, { status: 500 })
    }

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Geçersiz istek formatı.' }, { status: 415 })
    }

    const body = (await request.json()) as PersonelBody
    const { okul_id, ad_soyad, email, telefon, rol, sinif } = body

    if (!okul_id || !ad_soyad?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Okul ID, ad soyad ve e-posta zorunludur.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin.' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const geciciSifre = generatePassword()

    const { data: userData, error: authError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: geciciSifre,
      email_confirm: true,
    })

    if (authError || !userData.user) {
      const msg = authError?.message ?? 'Kullanıcı oluşturulamadı.'
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı.' }, { status: 409 })
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const userId = userData.user.id

    const { error: personelError } = await admin.from('personel').insert({
      user_id: userId,
      okul_id,
      ad_soyad: ad_soyad.trim(),
      email: normalizedEmail,
      telefon: telefon?.trim() || null,
      rol: rol || 'ogretmen',
      sinif: sinif?.trim() || null,
      aktif: true,
    })

    if (personelError) {
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: personelError.message }, { status: 500 })
    }

    return NextResponse.json({ geciciSifre })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'İstek işlenemedi.' },
      { status: 500 }
    )
  }
}
