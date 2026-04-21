import { Resend } from 'resend'

export async function sendPersonelWelcomeEmail({
  email,
  ad_soyad,
  okul_ad,
  slug,
  sifre,
}: {
  email: string
  ad_soyad: string
  okul_ad: string
  slug: string
  sifre: string
}): Promise<{ success: boolean; error?: unknown }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kinderly.app'
  const loginUrl = `${appUrl}/giris?redirect=${encodeURIComponent(`/${slug}/ogretmen`)}`

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Kinderly <noreply@kinderly.app>',
      to: email,
      subject: `${okul_ad} - Kinderly Personel Hesabınız Oluşturuldu`,
      html: `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f9fafb;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:24px;box-shadow:0 4px 12px rgba(0,0,0,0.06);overflow:hidden;">

    <div style="background:#10b981;padding:32px 28px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">${okul_ad}</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px;">Hoş geldiniz!</p>
    </div>

    <div style="padding:32px 28px;">
      <p style="font-size:16px;color:#111827;margin:0 0 20px;">
        Merhaba <strong>${ad_soyad}</strong>,
      </p>
      <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 28px;">
        <strong>${okul_ad}</strong> yönetimi tarafından Kinderly sistemine personel olarak eklendiniz.
        Aşağıdaki bilgilerle giriş yapabilirsiniz.
      </p>

      <div style="background:#f3f4f6;border-radius:16px;padding:22px;margin-bottom:24px;">
        <div style="margin-bottom:18px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:.08em;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">Giriş Linki</div>
          <a href="${loginUrl}" style="color:#10b981;font-size:14px;word-break:break-all;text-decoration:none;">${loginUrl}</a>
        </div>

        <div style="margin-bottom:18px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:.08em;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">E-posta</div>
          <div style="font-size:15px;color:#111827;">${email}</div>
        </div>

        <div>
          <div style="font-size:11px;font-weight:600;letter-spacing:.08em;color:#6b7280;text-transform:uppercase;margin-bottom:8px;">Geçici Şifre</div>
          <div style="background:#fff;display:inline-block;padding:10px 20px;border-radius:12px;font-family:monospace;font-size:22px;font-weight:700;letter-spacing:3px;color:#10b981;border:1px solid #d1fae5;">${sifre}</div>
        </div>
      </div>

      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:8px;margin-bottom:28px;">
        <p style="margin:0;font-size:13px;color:#78350f;line-height:1.5;">
          <strong>Önemli:</strong> Bu şifre geçicidir. İlk girişinizden sonra Ayarlar bölümünden şifrenizi değiştirmenizi öneririz.
        </p>
      </div>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
        İyi çalışmalar,<br>
        <strong>${okul_ad} Yönetimi</strong>
      </p>
    </div>

  </div>
</body>
</html>`,
    })

    if (error) {
      console.error('[email] Gönderme hatası:', error)
      return { success: false, error }
    }

    console.log('[email] Gönderildi:', email)
    return { success: true }
  } catch (err) {
    console.error('[email] Beklenmeyen hata:', err)
    return { success: false, error: err }
  }
}
