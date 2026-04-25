import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Destek | KinderX',
  description: 'KinderX destek, geri bildirim ve App Store inceleme iletişim bilgileri.',
  alternates: {
    canonical: 'https://kinderx.app/support',
  },
}

const supportTopics = [
  {
    title: 'Giriş ve hesap erişimi',
    description:
      'Okul yöneticisi, öğretmen veya veli hesabınızla giriş yapamıyorsanız hesap e-postanızı ve okul adınızı paylaşın.',
  },
  {
    title: 'Davet ve okul bağlantısı',
    description:
      'Veli veya personel daveti, okul kodu ve hesap eşleştirme sorunlarında davet edilen e-posta adresini gönderin.',
  },
  {
    title: 'Fotoğraf, aktivite ve bildirimler',
    description:
      'Fotoğraf görüntüleme, günlük aktivite kaydı, yoklama ve push bildirimleriyle ilgili teknik sorunları inceleyelim.',
  },
]

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#060a06] px-[5%] py-10 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.16),transparent_68%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(74,222,128,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-60" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <nav className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4ade80] font-black text-[#060a06]">
              K
            </span>
            <span>
              <span className="block text-sm font-semibold">KinderX</span>
              <span className="block text-xs text-white/55">Destek Merkezi</span>
            </span>
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white"
          >
            Ana sayfa
          </Link>
        </nav>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-12">
          <div className="mb-5 inline-flex rounded-full border border-[#4ade80]/20 bg-[#4ade80]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#4ade80]">
            KinderX Destek
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[0.96] tracking-[-0.05em] md:text-7xl">
            Yardım için buradayız.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/62">
            KinderX; anaokulu yöneticileri, öğretmenler ve veliler için okul iletişimi, yoklama,
            aktivite paylaşımı, fotoğraf galerisi ve aidat takibi sunar. Destek taleplerine
            genellikle 1 iş günü içinde dönüş yaparız.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <a
              href="mailto:info@kinderx.app"
              className="rounded-[24px] border border-[#4ade80]/20 bg-[#4ade80]/10 p-6 transition hover:-translate-y-1 hover:border-[#4ade80]/40"
            >
              <span className="block text-xs font-bold uppercase tracking-[0.22em] text-[#4ade80]">E-posta</span>
              <span className="mt-3 block text-2xl font-semibold">info@kinderx.app</span>
              <span className="mt-2 block text-sm leading-relaxed text-white/58">
                Hesap, teknik destek, veri veya App Store inceleme soruları için ana iletişim adresimiz.
              </span>
            </a>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-6">
              <span className="block text-xs font-bold uppercase tracking-[0.22em] text-white/45">Uygulama</span>
              <span className="mt-3 block text-2xl font-semibold">KinderX iOS</span>
              <span className="mt-2 block text-sm leading-relaxed text-white/58">
                App Store incelemesi için test hesabı gerekiyorsa lütfen App Review Notes alanındaki
                okul, kullanıcı ve şifre bilgileriyle giriş yapın.
              </span>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {supportTopics.map((topic) => (
            <article key={topic.title} className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6">
              <h2 className="text-lg font-semibold">{topic.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/58">{topic.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[24px] border border-white/10 bg-black/20 p-6 text-sm leading-relaxed text-white/60">
          <h2 className="mb-3 text-lg font-semibold text-white">App Store inceleme notu</h2>
          <p>
            KinderX, okul tarafından davet edilen veya okul koduyla bağlanan yetkili kullanıcılar
            için tasarlanmıştır. Yeni bir okul oluşturma, okula bağlanma, öğretmen hesabı ve veli
            hesabı akışları uygulama içinde bulunur. İnceleme sırasında eksik veri görülürse lütfen
            App Review Notes alanındaki demo okul hesabını kullanın.
          </p>
        </section>
      </div>
    </main>
  )
}
