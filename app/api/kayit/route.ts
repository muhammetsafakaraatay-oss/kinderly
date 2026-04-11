import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidSlug, slugifySchoolName } from '@/lib/slug'

type SignupBody = {
  okulAdi?: string
  slug?: string
  adSoyad?: string
  email?: string
  sifre?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Sunucu Supabase ayarlari eksik. Vercel ortam degiskenlerini kontrol edin.' },
        { status: 500 }
      )
    }

    const body = (await request.json()) as SignupBody
    const okulAdi = body.okulAdi?.trim() ?? ''
    const adSoyad = body.adSoyad?.trim() ?? ''
    const rawEmail = typeof body.email === 'string' ? body.email : ''
    const email = rawEmail.trim().toLowerCase()
    const sifre = body.sifre?.trim() ?? ''
    const normalizedSlug = slugifySchoolName(body.slug ?? '')

    console.log('Request body:', {
      okulAd: okulAdi,
      slug: normalizedSlug,
      adSoyad,
      email,
    })

    if (!okulAdi || !adSoyad || !email || !sifre || !normalizedSlug) {
      return NextResponse.json({ error: 'Tum alanlar zorunludur.' }, { status: 400 })
    }

    if (!isValidSlug(normalizedSlug)) {
      return NextResponse.json(
        { error: 'Okul kodu sadece kucuk harf, rakam ve tire icerebilir.' },
        { status: 400 }
      )
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Gecerli bir email adresi girin.' }, { status: 400 })
    }

    if (sifre.length < 8) {
      return NextResponse.json({ error: 'Sifre en az 8 karakter olmali.' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: existingSchool } = await admin
      .from('okullar')
      .select('id')
      .eq('slug', normalizedSlug)
      .maybeSingle()

    if (existingSchool) {
      return NextResponse.json({ error: 'Bu okul kodu kullaniliyor.' }, { status: 409 })
    }

    const { data: userData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: sifre,
      email_confirm: true,
    })

    if (authError || !userData.user) {
      console.log('Supabase error:', authError)
      return NextResponse.json(
        {
          error: authError?.message ?? 'Admin kullanicisi olusturulamadi.',
          details: authError,
        },
        { status: 400 }
      )
    }

    const userId = userData.user.id

    try {
      const { data: schoolData, error: schoolError } = await admin
        .from('okullar')
        .insert({
          ad: okulAdi,
          slug: normalizedSlug,
          aktif: true,
        })
        .select('id, slug')
        .single()

      if (schoolError || !schoolData) {
        throw schoolError ?? new Error('Okul kaydi olusturulamadi.')
      }

      const { error: personelError } = await admin
        .from('personel')
        .insert({
          user_id: userId,
          okul_id: schoolData.id,
          ad_soyad: adSoyad,
          email,
          rol: 'admin',
          aktif: true,
        })

      if (personelError) {
        throw personelError
      }

      return NextResponse.json({ slug: schoolData.slug, email })
    } catch (error) {
      await admin.auth.admin.deleteUser(userId)

      const message =
        error instanceof Error ? error.message : 'Kayit olusturulurken beklenmeyen bir hata olustu.'

      if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')) {
        return NextResponse.json({ error: 'Bu okul kodu kullaniliyor.' }, { status: 409 })
      }

      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Kayit istegi islenemedi.',
      },
      { status: 500 }
    )
  }
}
