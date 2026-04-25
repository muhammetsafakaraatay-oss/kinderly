import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | KinderX',
  description: 'KinderX iOS uygulaması ve web platformu için gizlilik politikası.',
  alternates: {
    canonical: 'https://kinderx.app/privacy',
  },
}

const collectedData = [
  'Ad, soyad, e-posta adresi ve telefon numarası gibi iletişim bilgileri',
  'Okul, sınıf, öğrenci profili, veli bağlantısı ve kullanıcı rolü bilgileri',
  'Mesaj, duyuru, aktivite notu, ödev/evrak, fotoğraf ve video gibi kullanıcı içerikleri',
  'Yoklama, teslim alma/bırakma, günlük aktivite, sağlık notu, ilaç ve alerji gibi okul takibi bilgileri',
  'Aidat takibi için ödeme durumu, tutar, vade ve tahsilat notları',
  'Oturum, cihaz bildirimi, hata kayıtları ve temel performans verileri',
]

const purposes = [
  'Okul, öğretmen ve veli hesaplarını güvenli şekilde çalıştırmak',
  'Öğrenciye ait günlük okul akışını ilgili veli ve yetkili personele göstermek',
  'Mesajlaşma, duyuru, fotoğraf paylaşımı ve bildirim özelliklerini sunmak',
  'Yoklama, teslim, ödev, takvim ve aidat süreçlerini kayıt altında tutmak',
  'Güvenlik, hata giderme, kötüye kullanım önleme ve ürün desteği sağlamak',
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#060a06] px-[5%] py-10 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-[-120px] top-20 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.14),transparent_72%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(74,222,128,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-55" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <nav className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4ade80] font-black text-[#060a06]">
              K
            </span>
            <span>
              <span className="block text-sm font-semibold">KinderX</span>
              <span className="block text-xs text-white/55">Gizlilik Politikası</span>
            </span>
          </Link>
          <Link
            href="/support"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white"
          >
            Destek
          </Link>
        </nav>

        <article className="rounded-[32px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-12">
          <div className="mb-5 inline-flex rounded-full border border-[#4ade80]/20 bg-[#4ade80]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#4ade80]">
            Son güncelleme: 23 Nisan 2026
          </div>
          <h1 className="text-5xl font-semibold leading-[0.96] tracking-[-0.05em] md:text-7xl">
            Gizlilik Politikası
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-white/62">
            KinderX, anaokulları için geliştirilen okul yönetimi, veli iletişimi ve günlük öğrenci
            takip platformudur. Bu politika, KinderX iOS uygulaması ve kinderx.app web platformunda
            hangi verileri neden işlediğimizi açıklar.
          </p>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">Toplanan veriler</h2>
            <div className="mt-4 space-y-3">
              {collectedData.map((item) => (
                <p key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-white/62">
                  {item}
                </p>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">Verileri kullanma amaçlarımız</h2>
            <div className="mt-4 space-y-3">
              {purposes.map((item) => (
                <p key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-white/62">
                  {item}
                </p>
              ))}
            </div>
          </section>

          <section className="mt-10 space-y-5 text-sm leading-relaxed text-white/62">
            <div>
              <h2 className="mb-3 text-2xl font-semibold text-white">Veri paylaşımı</h2>
              <p>
                Veriler; uygulamanın çalışması, güvenli oturum, dosya depolama, e-posta gönderimi,
                bildirim ve teknik destek gibi hizmetleri sunan altyapı sağlayıcılarıyla sınırlı
                şekilde işlenebilir. KinderX kullanıcı verilerini reklam takibi veya üçüncü taraf
                reklam profillemesi için kullanmaz.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-2xl font-semibold text-white">Saklama ve güvenlik</h2>
              <p>
                Okul ve öğrenci kayıtları, kurum hesabı aktif olduğu sürece veya yasal/operasyonel
                gereklilikler kapsamında saklanır. Yetkilendirme kontrolleriyle öğretmenlerin yalnızca
                kendi sınıfındaki, velilerin ise yalnızca bağlı oldukları öğrencilerdeki verilere
                erişmesi amaçlanır.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-2xl font-semibold text-white">Haklarınız ve iletişim</h2>
              <p>
                Verilerinize erişim, düzeltme veya silme talepleriniz için okul yönetiminizle ya da
                KinderX destek ekibiyle iletişime geçebilirsiniz. Destek adresimiz:{' '}
                <a className="font-semibold text-[#4ade80]" href="mailto:info@kinderx.app">
                  info@kinderx.app
                </a>
                .
              </p>
            </div>
          </section>
        </article>
      </div>
    </main>
  )
}
