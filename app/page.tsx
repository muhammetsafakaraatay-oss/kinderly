'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Instrument_Serif, DM_Sans } from 'next/font/google'
import { RoiCalculator } from '@/components/roi-calculator'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

type MenuItem = {
  icon: string
  title: string
  description: string
  href: string
}

type DropdownKey = 'features' | 'audiences' | 'resources' | null

const featureMenu: MenuItem[] = [
  { icon: '✓', title: 'Yoklama & Devam Takibi', description: 'Saniyeler icinde sinif bazli devam kontrolu alin.', href: '#ozellikler' },
  { icon: '⚡', title: 'Aktivite Kayitlari', description: 'Yemek, uyku, ilac ve gunluk notlari tek akisla yonetin.', href: '#ozellikler' },
  { icon: '💬', title: 'Veli Iletisimi', description: 'Mesaj, duyuru ve push bildirimlerini tek merkezde toplayin.', href: '#ozellikler' },
  { icon: '📷', title: 'Fotograf Paylasimi', description: 'Guvenli galeriyle ozel anlari ailelerle aninda paylasin.', href: '#ozellikler' },
  { icon: '₺', title: 'Aidat Yonetimi', description: 'Tahsilat, hatirlatma ve gecikme takibini otomatiklestirin.', href: '#fiyatlar' },
  { icon: '◌', title: 'Raporlar & Analizler', description: 'Devam, gelir ve operasyon verilerini canli dashboard ile izleyin.', href: '#metrikler' },
]

const audienceMenu: MenuItem[] = [
  { icon: '👑', title: 'Anaokulu Yoneticileri', description: 'Tum operasyonu tek ekranda toplayan ust duzey kontrol merkezi.', href: '#roller' },
  { icon: '👩‍🏫', title: 'Ogretmenler & Personel', description: 'Gunluk rutinleri hizlandiran mobil is akislarina erisin.', href: '#roller' },
  { icon: '👨‍👩‍👧', title: 'Veliler & Aileler', description: 'Cocugunuzun gununu canli feed ve bildirimlerle takip edin.', href: '#roller' },
  { icon: '🏢', title: 'Zincir & Cok Subeli', description: 'Birden fazla kampusu ortak standartlarla yonetin.', href: '#fiyatlar' },
]

const resourceMenu: MenuItem[] = [
  { icon: '⌘', title: 'Yardim Merkezi', description: 'Kurulum, destek ve sik sorulan sorular icin kaynak merkezi.', href: '#cta' },
  { icon: '✦', title: 'Blog', description: 'Anaokulu operasyonu ve dijital donusum icin editor secimi icerikler.', href: '#cta' },
  { icon: '♥', title: 'Basari Hikayeleri', description: 'Kinderly ile buyuyen okullarin gercek sonuclari.', href: '#yorumlar' },
  { icon: '▶', title: 'Webinarlar', description: 'Canli urun turlari ve sektor uzmanlariyla online oturumlar.', href: '#cta' },
]

const stats = [
  ['512+', 'aktif okul'],
  ['48.000+', 'ogrenci profili'],
  ['%98', 'yenileme orani'],
  ['23 saat', 'aylik zaman kazanci'],
]

const proofSchools = ['Nova Kids', 'Papatya Koleji', 'Atolye Cocuk', 'Gokkusagi Kampusu', 'Mimoza Akademi']

const features = [
  {
    icon: '✓',
    title: 'Anlik Yoklama',
    description: 'Sinifa girer girmez devam durumunu kaydedin, aileler bildirimle ayni anda haberdar olsun.',
    tag: 'Operasyon',
    wide: true,
  },
  {
    icon: '⚡',
    title: 'Aktivite Akisi',
    description: 'Yemek, uyku, ilac ve gunluk notlari bir feed mantigiyla kaydedin.',
    tag: 'Ogretmen deneyimi',
  },
  {
    icon: '💬',
    title: 'Veli Iletisimi',
    description: 'Mesaj, duyuru ve toplu bilgilendirme modulleriyle WhatsApp daginikligini bitirin.',
    tag: 'Iletisim',
  },
  {
    icon: '📷',
    title: 'Premium Galeri',
    description: 'Her sinif icin filtrelenebilir, guvenli ve zarif bir fotograf deneyimi sunun.',
    tag: 'Deneyim',
  },
  {
    icon: '₺',
    title: 'Finans Komut Merkezi',
    description: 'Aidat takibi, hatirlatma ve tahsilat raporlarini tek bakista yonetin.',
    tag: 'Gelir',
    wide: true,
  },
]

const roleCards = [
  {
    icon: '👑',
    title: 'Yoneticiler',
    description: 'Satis, finans, devamsizlik ve ekip gorunurlugunu tek ekrandan alin.',
    bullets: ['Canli kampus genel gorunumu', 'Tahsilat ve raporlama', 'Personel ve sinif yonetimi'],
  },
  {
    icon: '👩‍🏫',
    title: 'Ogretmenler',
    description: 'Gun boyunca hizli veri girisi, daha az tekrar ve daha fazla odak.',
    bullets: ['Tek dokunusla aktivite kaydi', 'Gunluk rapor akisi', 'Aile ile kontrollu mesajlasma'],
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Veliler',
    description: 'Cocugunuzun gununu sakin, guvenli ve premium bir uygulama deneyimiyle izleyin.',
    bullets: ['Canli feed ve bildirimler', 'Aidat ve duyuru ekranlari', 'Fotograf ve mesajlasma'],
  },
]

const timeline = [
  { step: '01', title: 'Okulu kur', description: 'Dakikalar icinde kurumunu ac, siniflari ve planini tanimla.' },
  { step: '02', title: 'Ekip davet et', description: 'Ogretmenleri, personeli ve aileleri rolleriyle sisteme al.' },
  { step: '03', title: 'Basla', description: 'Yoklama, mesaj, aidat ve raporlari ayni gun kullanmaya basla.' },
]

const testimonials = [
  {
    quote: 'Kinderly ile sabah operasyonu ilk kez sakin hissettirdi. Her seyin tek akista olmasi ekibi dogrudan rahatlatti.',
    name: 'Ayse H.',
    role: 'Mudur, Nova Kids',
  },
  {
    quote: 'Velilerden gelen geri bildirim tek kelimeyle premium. Uygulama okul markamizin bir parcasi gibi hissettiriyor.',
    name: 'Fatma K.',
    role: 'Ogretmen, Papatya Koleji',
  },
  {
    quote: 'Tahsilat ve duyuru tarafinda kaybettigimiz gunleri geri aldik. Yonetim paneli gercekten gelir yaratan bir arac oldu.',
    name: 'Mehmet A.',
    role: 'Kurucu, Gokkusagi Kampusu',
  },
]

const pricing = [
  {
    name: 'Starter',
    price: 'Ucretsiz',
    detail: 'ilk kampusunu acan okullar',
    featured: false,
    items: ['50 ogrenciye kadar', 'Temel yoklama ve mesajlasma', 'Mobil veli deneyimi', 'Standart destek'],
  },
  {
    name: 'Pro',
    price: '₺1.000',
    detail: '/ ay',
    featured: true,
    items: ['Sinirsiz ogrenci', 'Tum modul ve rol ekranlari', 'Aidat ve fotograf yonetimi', 'Premium destek ve onboarding'],
  },
  {
    name: 'Scale',
    price: 'Ozel',
    detail: 'cok subeli kurumlar',
    featured: false,
    items: ['Coklu sube yonetimi', 'Kurumsal raporlama', 'Ozel entegrasyonlar', 'SLA ve oncelikli cozum ekibi'],
  },
]

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.18 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`${className} transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {children}
    </div>
  )
}

function MegaMenu({
  title,
  items,
  active,
  onEnter,
  onLeave,
}: {
  title: string
  items: MenuItem[]
  active: boolean
  onEnter: () => void
  onLeave: () => void
}) {
  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white">
        {title}
        <span className={`text-[10px] transition-transform ${active ? 'rotate-180 text-[var(--green)]' : ''}`}>▼</span>
      </button>
      <div
        className={`absolute left-1/2 top-full z-50 mt-4 w-[680px] -translate-x-1/2 rounded-[24px] border border-[var(--border)] bg-[rgba(11,18,11,0.92)] p-4 shadow-[0_32px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-200 ${
          active ? 'pointer-events-auto opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-2'
        }`}
      >
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="group rounded-[18px] border border-transparent bg-white/[0.02] p-4 transition-all hover:border-[var(--border)] hover:bg-[var(--green-dim)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[#0f170f] text-lg text-[var(--green)] transition-transform group-hover:-translate-y-0.5">
                  {item.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white transition-colors group-hover:text-[var(--green)]">
                    {item.title}
                  </div>
                  <div className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{item.description}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const close = () => setActiveDropdown(null)
    window.addEventListener('scroll', close)
    return () => window.removeEventListener('scroll', close)
  }, [])

  return (
    <main className={`${serif.variable} ${sans.variable} min-h-screen bg-[#060a06] font-sans text-white`}>
      <style>{`
        :root {
          --green: #4ade80;
          --green-dim: rgba(74, 222, 128, 0.1);
          --border: rgba(74, 222, 128, 0.14);
          --surface: #0b120b;
          --muted: rgba(255, 255, 255, 0.54);
        }
        .serif {
          font-family: var(--font-serif);
        }
        .noise {
          background-image:
            linear-gradient(rgba(74, 222, 128, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74, 222, 128, 0.05) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(circle at center, black 40%, transparent 88%);
        }
        .glow-text {
          background: linear-gradient(135deg, #f4fff7 0%, #4ade80 50%, #d7ffe6 100%);
          -webkit-background-clip: text;
          color: transparent;
        }
        .hero-shadow {
          box-shadow: 0 40px 120px rgba(0, 0, 0, 0.45), 0 0 80px rgba(74, 222, 128, 0.07);
        }
        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(24px);
        }
        .nav-sheen::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
          opacity: 0;
          transition: opacity 180ms ease;
        }
        .nav-sheen:hover::after {
          opacity: 1;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 noise opacity-70" />
        <div className="absolute left-1/2 top-0 h-[480px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.16),transparent_68%)] blur-3xl" />
        <div className="absolute right-[-120px] top-[240px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.10),transparent_72%)] blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(6,10,6,0.78)] backdrop-blur-xl">
        <nav className="mx-auto flex h-20 w-full max-w-[1400px] items-center justify-between px-[5%]">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--green)] text-base font-black text-[#060a06] transition-transform group-hover:-translate-y-0.5">
              K
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight text-white">Kinderly</div>
              <div className="text-xs text-[var(--muted)]">Premium anaokulu operasyon sistemi</div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            <MegaMenu
              title="Ozellikler"
              items={featureMenu}
              active={activeDropdown === 'features'}
              onEnter={() => setActiveDropdown('features')}
              onLeave={() => setActiveDropdown(null)}
            />
            <MegaMenu
              title="Kim Icin"
              items={audienceMenu}
              active={activeDropdown === 'audiences'}
              onEnter={() => setActiveDropdown('audiences')}
              onLeave={() => setActiveDropdown(null)}
            />
            <MegaMenu
              title="Kaynaklar"
              items={resourceMenu}
              active={activeDropdown === 'resources'}
              onEnter={() => setActiveDropdown('resources')}
              onLeave={() => setActiveDropdown(null)}
            />
            <a href="#fiyatlar" className="text-sm text-[var(--muted)] transition-colors hover:text-white">
              Fiyatlar
            </a>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/giris"
              className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-white/5"
            >
              Giris Yap
            </Link>
            <Link
              href="/kayit"
              className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-bold text-[#060a06] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(74,222,128,0.22)]"
            >
              Ucretsiz Basla
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] text-white lg:hidden"
          >
            {mobileOpen ? '×' : '☰'}
          </button>
        </nav>

        <div
          className={`overflow-hidden border-t border-[var(--border)] bg-[rgba(11,18,11,0.94)] transition-[max-height] duration-300 lg:hidden ${
            mobileOpen ? 'max-h-[520px]' : 'max-h-0'
          }`}
        >
          <div className="space-y-6 px-[5%] py-6">
            {[
              { label: 'Ozellikler', items: featureMenu },
              { label: 'Kim Icin', items: audienceMenu },
              { label: 'Kaynaklar', items: resourceMenu },
            ].map((section) => (
              <div key={section.label}>
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{section.label}</div>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <a key={item.title} href={item.href} className="block rounded-2xl border border-[var(--border)] bg-white/[0.03] p-4">
                      <div className="text-sm font-semibold text-white">{item.title}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{item.description}</div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <Link href="/giris" className="flex-1 rounded-full border border-[var(--border)] px-5 py-3 text-center text-sm font-medium text-white">
                Giris Yap
              </Link>
              <Link href="/kayit" className="flex-1 rounded-full bg-[var(--green)] px-5 py-3 text-center text-sm font-bold text-[#060a06]">
                Ucretsiz Basla
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-[5%] pb-24 pt-10 md:pt-16">
        <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-[1.03fr_0.97fr] lg:items-center">
          <Reveal className="pt-10">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--green-dim)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--green)]">
              <span className="h-2 w-2 rounded-full bg-[var(--green)] shadow-[0_0_16px_#4ade80]" />
              Turkiye&apos;nin #1 Anaokulu Platformu
            </div>
            <h1 className="serif max-w-[720px] text-[clamp(3.7rem,8vw,7.2rem)] leading-[0.9] tracking-[-0.05em] text-white">
              Okulunuzu
              <br />
              guvenle yonetin,
              <br />
              aileleri sakince
              <br />
              yaninizda tutun.
            </h1>
            <p className="mt-8 max-w-[620px] text-lg leading-relaxed text-[var(--muted)] md:text-xl">
              Kinderly; yonetim, ogretmen ve veli deneyimini tek bir premium sistemde birlestirir.
              Daha az operasyon stresi, daha guclu marka algisi ve daha yuksek gelir gorunurlugu sunar.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/kayit"
                className="group rounded-full bg-[var(--green)] px-7 py-4 text-sm font-bold text-[#060a06] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(74,222,128,0.2)]"
              >
                Ucretsiz Basla
                <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/giris"
                className="rounded-full border border-[var(--border)] px-7 py-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/5"
              >
                Panele Giris Yap
              </Link>
            </div>
            <div className="mt-14 grid gap-6 border-t border-[var(--border)] pt-8 sm:grid-cols-4">
              {stats.map(([value, label], index) => (
                <Reveal key={label} delay={index * 80}>
                  <div className="serif text-4xl tracking-tight text-white">{value}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120} className="relative">
            <div className="absolute -left-10 top-16 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.18),transparent_70%)] blur-2xl" />
            <div className="hero-shadow relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[rgba(11,18,11,0.88)] backdrop-blur-xl">
              <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[#0f170f] px-5 py-4">
                <span className="h-3 w-3 rounded-full bg-[#f87171]" />
                <span className="h-3 w-3 rounded-full bg-[#facc15]" />
                <span className="h-3 w-3 rounded-full bg-[#4ade80]" />
                <div className="ml-3 flex-1 rounded-full border border-[var(--border)] bg-white/[0.03] px-4 py-1 text-center text-xs text-[var(--muted)]">
                  kinderly.app/admin
                </div>
              </div>

              <div className="grid gap-5 p-5 xl:grid-cols-[210px_1fr]">
                <div className="rounded-[24px] border border-[var(--border)] bg-black/20 p-4">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--green)] font-black text-[#060a06]">K</div>
                    <div>
                      <div className="text-sm font-semibold text-white">Kinderly</div>
                      <div className="text-xs text-[var(--muted)]">Mimoza Kampusu</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {['Dashboard', 'Ogrenciler', 'Mesajlar', 'Aidatlar', 'Fotograflar'].map((item, index) => (
                      <div
                        key={item}
                        className={`rounded-2xl border px-3 py-3 text-sm transition-all ${
                          index === 0
                            ? 'border-[var(--border)] bg-[var(--green-dim)] text-[var(--green)]'
                            : 'border-transparent bg-white/[0.03] text-[var(--muted)] hover:border-[var(--border)] hover:text-white'
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-4">
                    {[
                      ['94%', 'devam'],
                      ['18', 'yeni mesaj'],
                      ['₺84K', 'bekleyen tahsilat'],
                      ['32', 'bugun aktivite'],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-[rgba(74,222,128,0.28)]">
                        <div className="serif text-3xl text-white">{value}</div>
                        <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 backdrop-blur-xl transition-all hover:border-[rgba(74,222,128,0.28)]">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Gunluk operasyon</div>
                          <div className="mt-1 serif text-2xl text-white">Bugunun nabzi</div>
                        </div>
                        <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--green)]">canli</div>
                      </div>
                      <div className="space-y-3">
                        {[
                          ['✓', 'Yoklama tamamlandi', '08:47', '26 ogrenci isaretlendi'],
                          ['⚡', 'Aktivite akisi guncellendi', '10:12', '14 yeni feed kaydi'],
                          ['💬', 'Toplu veli mesaji gonderildi', '11:05', '18 aileye teslim edildi'],
                        ].map(([icon, title, time, note]) => (
                          <div key={title} className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-white/[0.02] px-4 py-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--green-dim)] text-lg text-[var(--green)]">
                              {icon}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-white">{title}</div>
                              <div className="text-sm text-[var(--muted)]">{note}</div>
                            </div>
                            <div className="text-xs text-[var(--muted)]">{time}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(74,222,128,0.14),rgba(74,222,128,0.03))] p-5 backdrop-blur-xl transition-all hover:-translate-y-1">
                      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Tahsilat sagligi</div>
                      <div className="mt-2 serif text-4xl text-[var(--green)]">₺1.2M</div>
                      <div className="mt-2 text-sm text-[var(--muted)]">12 aylik tahmini yillik gelir gorunurlugu</div>
                      <div className="mt-6 rounded-[20px] border border-[var(--border)] bg-black/20 p-4">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-[var(--muted)]">Tahsil edilen</span>
                          <span className="text-white">%82</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/[0.06]">
                          <div className="h-2 w-[82%] rounded-full bg-[var(--green)]" />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl border border-[var(--border)] bg-white/[0.03] p-3">
                            <div className="text-[var(--muted)]">Bekleyen</div>
                            <div className="mt-1 font-semibold text-white">₺216K</div>
                          </div>
                          <div className="rounded-2xl border border-[var(--border)] bg-white/[0.03] p-3">
                            <div className="text-[var(--muted)]">Otomatik hatirlatma</div>
                            <div className="mt-1 font-semibold text-white">bugun 09:00</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Reveal className="border-y border-[var(--border)] bg-white/[0.02] px-[5%] py-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-8">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Bize guvenen okullar</div>
          <div className="flex flex-1 flex-wrap items-center gap-6 text-sm text-white/28">
            {proofSchools.map((school) => (
              <span key={school} className="transition-colors hover:text-white/70">
                {school}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm">
            <span className="text-[var(--green)]">★★★★★</span>
            <span className="text-[var(--muted)]">4.9 / 5 ortalama memnuniyet</span>
          </div>
        </div>
      </Reveal>

      <section id="ozellikler" className="px-[5%] py-24">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Ozellikler</div>
            <h2 className="serif mt-5 max-w-[760px] text-[clamp(2.8rem,5vw,4.8rem)] leading-[0.95] tracking-[-0.04em] text-white">
              Operasyon gucunu
              <br />
              premium bir urun deneyimine cevirin.
            </h2>
            <p className="mt-5 max-w-[660px] text-lg leading-relaxed text-[var(--muted)]">
              Her modulu, kurumunuza daha fazla sakinlik, gorunurluk ve profesyonellik vermek icin tasarladik.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {features.map((feature, index) => (
              <Reveal
                key={feature.title}
                delay={index * 80}
                className={`${feature.wide ? 'md:col-span-2' : ''}`}
              >
                <article className="group rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-7 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-[rgba(74,222,128,0.28)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
                  <div className={`grid gap-6 ${feature.wide ? 'md:grid-cols-[120px_1fr]' : ''}`}>
                    <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[var(--border)] bg-[var(--green-dim)] text-3xl text-[var(--green)] transition-transform group-hover:-translate-y-1">
                      {feature.icon}
                    </div>
                    <div>
                      <div className="mb-4 inline-flex rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                        {feature.tag}
                      </div>
                      <h3 className="serif text-3xl tracking-tight text-white">{feature.title}</h3>
                      <p className="mt-3 max-w-[720px] text-[15px] leading-relaxed text-[var(--muted)]">{feature.description}</p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-[5%] pb-24">
        <div className="mx-auto max-w-[1400px] rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 backdrop-blur-xl md:p-10">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Nasil calisir?</div>
            <h2 className="serif mt-4 text-[clamp(2.5rem,4.4vw,4.4rem)] leading-[0.95] tracking-[-0.04em] text-white">
              Kurulumdan canli kullanima
              <br />
              kadar tek akis.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {timeline.map((item, index) => (
              <Reveal key={item.step} delay={index * 90}>
                <div className="relative rounded-[20px] border border-[var(--border)] bg-white/[0.02] p-6 transition-all hover:-translate-y-1 hover:border-[rgba(74,222,128,0.28)]">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="serif text-4xl text-[var(--green)]">{item.step}</div>
                    {index < timeline.length - 1 && <div className="hidden h-px flex-1 bg-[var(--border)] lg:block" />}
                  </div>
                  <h3 className="serif text-3xl tracking-tight text-white">{item.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="roller" className="px-[5%] pb-24">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Kim icin</div>
            <h2 className="serif mt-4 text-[clamp(2.5rem,4.5vw,4.5rem)] leading-[0.95] tracking-[-0.04em] text-white">
              Her rolde ayni seviye
              <br />
              kalite hissi.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {roleCards.map((role, index) => (
              <Reveal key={role.title} delay={index * 90}>
                <article className="glass rounded-[20px] border border-[var(--border)] p-8 transition-all hover:-translate-y-1 hover:border-[rgba(74,222,128,0.3)]">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] border border-[var(--border)] bg-[var(--green-dim)] text-3xl">
                    {role.icon}
                  </div>
                  <h3 className="serif text-3xl text-white">{role.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">{role.description}</p>
                  <div className="mt-7 space-y-3">
                    {role.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-start gap-3 text-sm text-[var(--muted)]">
                        <span className="mt-0.5 text-[var(--green)]">•</span>
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="metrikler" className="px-[5%] pb-24">
        <div className="mx-auto grid max-w-[1400px] gap-4 md:grid-cols-4">
          {[
            ['18 dakika', 'ortalama sabah check-in suresi'],
            ['%82', 'aidat tahsilat gorunurlugu'],
            ['3.4x', 'veli uygulama etkilesimi'],
            ['0 daginik arac', 'tek platform operasyonu'],
          ].map(([value, label], index) => (
            <Reveal key={label} delay={index * 60}>
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-7 text-center backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-[rgba(74,222,128,0.28)]">
                <div className="serif text-[clamp(2.4rem,4vw,4rem)] leading-none text-[var(--green)]">{value}</div>
                <div className="mt-4 text-sm leading-relaxed text-[var(--muted)]">{label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <RoiCalculator />

      <section id="yorumlar" className="px-[5%] py-24">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Musteri gorusleri</div>
            <h2 className="serif mt-4 text-[clamp(2.5rem,4.5vw,4.5rem)] leading-[0.95] tracking-[-0.04em] text-white">
              Urunun kalitesi,
              <br />
              ekiplerin gunune yansiyor.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {testimonials.map((item, index) => (
              <Reveal key={item.name} delay={index * 90}>
                <article className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-[rgba(74,222,128,0.28)]">
                  <div className="mb-6 text-sm tracking-[0.3em] text-[var(--green)]">★★★★★</div>
                  <blockquote className="serif text-3xl leading-[1.14] tracking-tight text-white">
                    &quot;{item.quote}&quot;
                  </blockquote>
                  <div className="mt-8 border-t border-[var(--border)] pt-5">
                    <div className="text-sm font-semibold text-white">{item.name}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{item.role}</div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="fiyatlar" className="px-[5%] pb-24">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Fiyatlandirma</div>
            <h2 className="serif mt-4 text-[clamp(2.5rem,4.5vw,4.5rem)] leading-[0.95] tracking-[-0.04em] text-white">
              Buyurken degil,
              <br />
              kullanirken mutlu eden planlar.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {pricing.map((plan, index) => (
              <Reveal key={plan.name} delay={index * 90}>
                <article
                  className={`relative rounded-[20px] border p-8 backdrop-blur-xl transition-all hover:-translate-y-1 ${
                    plan.featured
                      ? 'border-[var(--green)] bg-[linear-gradient(180deg,rgba(74,222,128,0.14),rgba(74,222,128,0.04))] shadow-[0_24px_80px_rgba(74,222,128,0.14)]'
                      : 'border-[var(--border)] bg-[var(--surface)]'
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--green)] px-4 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#060a06]">
                      en populer
                    </div>
                  )}
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--green)]">{plan.name}</div>
                  <div className="mt-6 serif text-6xl tracking-tight text-white">{plan.price}</div>
                  <div className="mt-2 text-sm text-[var(--muted)]">{plan.detail}</div>
                  <div className="mt-8 space-y-3">
                    {plan.items.map((item) => (
                      <div key={item} className="flex items-start gap-3 text-sm text-[var(--muted)]">
                        <span className="text-[var(--green)]">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/kayit"
                    className={`mt-10 flex items-center justify-center rounded-full px-5 py-4 text-sm font-bold transition-all ${
                      plan.featured
                        ? 'bg-[var(--green)] text-[#060a06] hover:-translate-y-0.5'
                        : 'border border-[var(--border)] text-white hover:bg-white/5'
                    }`}
                  >
                    {plan.name === 'Scale' ? 'Teklif Al' : 'Baslayin'}
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="px-[5%] pb-24">
        <Reveal className="mx-auto max-w-[1200px]">
          <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-10 text-center backdrop-blur-xl md:p-16">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Hazirsaniz</div>
            <h2 className="serif mt-5 text-[clamp(2.8rem,5vw,5.4rem)] leading-[0.92] tracking-[-0.05em]">
              <span className="glow-text">Okulunuzun premium</span>
              <br />
              operasyon donemine gecin.
            </h2>
            <p className="mx-auto mt-5 max-w-[700px] text-lg leading-relaxed text-[var(--muted)]">
              Kurulum 5 dakika surer. Ekip ve aileler ayni gun icinde kullanmaya baslar. Urun, markanizin kalite algisini ilk giriste hissettirir.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/kayit"
                className="rounded-full bg-[var(--green)] px-7 py-4 text-sm font-bold text-[#060a06] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(74,222,128,0.2)]"
              >
                Ucretsiz Basla
              </Link>
              <a
                href="mailto:info@kinderly.app"
                className="rounded-full border border-[var(--border)] px-7 py-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/5"
              >
                Demo Planla
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-[var(--border)] px-[5%] py-10">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--green)] font-black text-[#060a06]">
              K
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Kinderly</div>
              <div className="text-sm text-[var(--muted)]">Anaokullari icin premium operasyon platformu</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-[var(--muted)]">
            <a href="#ozellikler" className="transition-colors hover:text-white">Ozellikler</a>
            <a href="#roller" className="transition-colors hover:text-white">Roller</a>
            <a href="#fiyatlar" className="transition-colors hover:text-white">Fiyatlar</a>
            <a href="mailto:info@kinderly.app" className="transition-colors hover:text-white">Iletisim</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
