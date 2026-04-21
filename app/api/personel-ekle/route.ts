import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPersonelWelcomeEmail } from '@/lib/email'

type PersonelBody = {
  okul_id?: number
  ad_soyad?: string
  email?: string
  telefon?: string
  rol?: string
  sinif?: string
}

const VALID_ROLES = ['admin', 'ogretmen', 'mudur', 'yardimci'] as const
type ValidRole = (typeof VALID_ROLES)[number]

const EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/

function generatePassword(): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const digits = '23456789'
  const special = '!@#$%&*'
  const all = lower + upper + digits + special
  const required = [
    lower[Math.floor(Math.random() * lower.length)],
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ]
  const rest = Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)])
  return [...required, ...rest].sort(() => Math.random() - 0.5).join('')
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Sunucu yapılandırması eksik.' }, { status: 500 })
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
    if (!token) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli.' }, { status: 401 })
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

    const normalizedRol: ValidRole = (VALID_ROLES as readonly string[]).includes(rol ?? '') ? (rol as ValidRole) : 'ogretmen'
    if (rol && !(VALID_ROLES as readonly string[]).includes(rol)) {
      return NextResponse.json({ error: 'Geçersiz rol. Geçerli değerler: admin, ogretmen, mudur, yardimci.' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Caller kimlik doğrulama
    const { data: { user: caller }, error: callerError } = await admin.auth.getUser(token)
    if (callerError || !caller) {
      return NextResponse.json({ error: 'Geçersiz oturum.' }, { status: 401 })
    }

    // Caller bu okul için admin mi?
    const { data: callerPersonel } = await admin
      .from('personel')
      .select('rol')
      .eq('user_id', caller.id)
      .eq('okul_id', okul_id)
      .eq('aktif', true)
      .maybeSingle()

    if (!callerPersonel || callerPersonel.rol !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
    }

    // Bu okul için zaten kayıtlı mı?
    const { data: existingPersonel } = await admin
      .from('personel')
      .select('id')
      .ilike('email', normalizedEmail)
      .eq('okul_id', okul_id)
      .maybeSingle()

    if (existingPersonel) {
      return NextResponse.json({ error: 'Bu personel zaten bu okula kayıtlı.' }, { status: 409 })
    }

    const { data: okulData } = await admin
      .from('okullar')
      .select('ad, slug')
      .eq('id', okul_id)
      .single()

    const geciciSifre = generatePassword()
    let userId: string
    let isNewAuthUser = false

    const { data: userData, error: authError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: geciciSifre,
      email_confirm: true,
    })

    if (authError) {
      const msg = authError.message ?? ''
      const isAlreadyRegistered =
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already been registered')

      if (!isAlreadyRegistered) {
        if (msg.toLowerCase().includes('password')) {
          return NextResponse.json({ error: 'Otomatik şifre oluşturulurken sorun oldu, tekrar deneyin.' }, { status: 400 })
        }
        return NextResponse.json(
          { error: process.env.NODE_ENV === 'development' ? `Personel eklenemedi: ${msg}` : 'Personel eklenemedi.' },
          { status: 400 }
        )
      }

      // Auth'ta kayıtlı — başka okulda personel kaydı var mı? user_id'yi oradan al
      const { data: anyPersonel } = await admin
        .from('personel')
        .select('user_id')
        .ilike('email', normalizedEmail)
        .limit(1)
        .maybeSingle()

      if (!anyPersonel?.user_id) {
        return NextResponse.json(
          { error: 'Bu e-posta adresi zaten kayıtlı. Farklı bir e-posta deneyin.' },
          { status: 409 }
        )
      }

      userId = anyPersonel.user_id
    } else {
      if (!userData.user) {
        return NextResponse.json({ error: 'Kullanıcı oluşturulamadı.' }, { status: 400 })
      }
      userId = userData.user.id
      isNewAuthUser = true
    }

    const { error: personelError } = await admin.from('personel').insert({
      user_id: userId,
      okul_id,
      ad_soyad: ad_soyad.trim(),
      email: normalizedEmail,
      telefon: telefon?.trim() || null,
      rol: normalizedRol,
      sinif: sinif?.trim() || null,
      aktif: true,
    })

    if (personelError) {
      if (isNewAuthUser) {
        try { await admin.auth.admin.deleteUser(userId) } catch { /* cleanup best-effort */ }
      }
      return NextResponse.json(
        { error: process.env.NODE_ENV === 'development' ? personelError.message : 'Personel kaydı oluşturulamadı.' },
        { status: 500 }
      )
    }

    if (okulData && isNewAuthUser) {
      await sendPersonelWelcomeEmail({
        email: normalizedEmail,
        ad_soyad: ad_soyad.trim(),
        okul_ad: okulData.ad,
        slug: okulData.slug,
        sifre: geciciSifre,
      })
    }

    return NextResponse.json({
      success: true,
      message: `${ad_soyad.trim()} başarıyla eklendi.${okulData && isNewAuthUser ? ' Davet e-postası gönderildi.' : ''}`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'İstek işlenemedi.' },
      { status: 500 }
    )
  }
}
