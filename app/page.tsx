'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Check, Zap, MessageCircle, Camera, Banknote, BarChart2, ArrowRight } from 'lucide-react'
import { RoiCalculator } from '@/components/roi-calculator'

type MenuItem = {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}

type DropdownKey = 'features' | 'audiences' | 'resources' | null

const featureMenu: MenuItem[] = [
  { icon: <Check size={18} />, title: 'Yoklama & Devam Takibi', description: 'Saniyeler içinde sınıf bazlı devam kontrolü alın.', href: '#ozellikler' },
  { icon: <Zap size={18} />, title: 'Aktivite Kayıtları', description: 'Yemek, uyku, ilaç ve günlük notları tek akışla yönetin.', href: '#ozellikler' },
  { icon: <MessageCircle size={18} />, title: 'Veli İletişimi', description: 'Mesaj, duyuru ve push bildirimlerini tek merkezde toplayın.', href: '#ozellikler' },
  { icon: <Camera size={18} />, title: 'Fotoğraf Paylaşımı', description: 'Güvenli galeriyle özel anları ailelerle anında paylaşın.', href: '#ozellikler' },
  { icon: <Banknote size={18} />, title: 'Aidat Yönetimi', description: 'Tahsilat, hatırlatma ve gecikme takibini otomatikleştirin.', href: '#fiyatlar' },
  { icon: <BarChart2 size={18} />, title: 'Raporlar & Analizler', description: 'Devam, gelir ve operasyon verilerini canlı dashboard ile izleyin.', href: '#metrikler' },
]

const audienceMenu: MenuItem[] = [
  { icon: '👑', title: 'Anaokulu Yöneticileri', description: 'Tüm operasyonu tek ekranda toplayan üst düzey kontrol merkezi.', href: '#roller' },
  { icon: '👩‍🏫', title: 'Öğretmenler & Personel', description: 'Günlük rutinleri hızlandıran mobil iş akışlarına erişin.', href: '#roller' },
  { icon: '👨‍👩‍👧', title: 'Veliler & Aileler', description: 'Çocuğunuzun gününü canlı feed ve bildirimlerle takip edin.', href: '#roller' },
  { icon: '🏢', title: 'Zincir & Çok Şubeli', description: 'Birden fazla kampüsü ortak standartlarla yönetin.', href: '#fiyatlar' },
]

const resourceMenu: MenuItem[] = [
  { icon: '⌘', title: 'Yardım Merkezi', description: 'Kurulum, destek ve sık sorulan sorular için kaynak merkezi.', href: '#cta' },
  { icon: '✦', title: 'Blog', description: 'Anaokulu operasyonu ve dijital dönüşüm için editör seçimi içerikler.', href: '#cta' },
  { icon: '♥', title: 'Başarı Hikayeleri', description: 'KinderX ile büyüyen okulların gerçek sonuçları.', href: '#yorumlar' },
  { icon: '▶', title: 'Webinarlar', description: 'Canlı ürün turları ve sektör uzmanlarıyla online oturumlar.', href: '#cta' },
]

const stats = [
  ['512+', 'aktif okul'],
  ['48.000+', 'öğrenci profili'],
  ['%98', 'yenileme oranı'],
  ['23 saat', 'aylık zaman kazancı'],
]

const proofSchools = ['Nova Kids', 'Papatya Koleji', 'Atölye Çocuk', 'Gökkuşağı Kampüsü', 'Mimoza Akademi']

type Feature = {
  icon: React.ReactNode
  title: string
  description: string
  tag: string
  wide?: boolean
}

const features: Feature[] = [
  {
    icon: <Check size={28} />,
    title: 'Anlık Yoklama',
    description: 'Sınıfa girer girmez devam durumunu kaydedin, aileler bildirimle aynı anda haberdar olsun.',
    tag: 'Operasyon',
    wide: true,
  },
  {
    icon: <Zap size={28} />,
    title: 'Aktivite Akışı',
    description: 'Yemek, uyku, ilaç ve günlük notları bir feed mantığıyla kaydedin.',
    tag: 'Öğretmen deneyimi',
  },
  {
    icon: <MessageCircle size={28} />,
    title: 'Veli İletişimi',
    description: 'Mesaj, duyuru ve toplu bilgilendirme modülleriyle WhatsApp dağınıklığını bitirin.',
    tag: 'İletişim',
  },
  {
    icon: <Camera size={28} />,
    title: 'Premium Galeri',
    description: 'Her sınıf için filtrelenebilir, güvenli ve zarif bir fotoğraf deneyimi sunun.',
    tag: 'Deneyim',
  },
  {
    icon: <Banknote size={28} />,
    title: 'Finans Komut Merkezi',
    description: 'Aidat takibi, hatırlatma ve tahsilat raporlarını tek bakışta yönetin.',
    tag: 'Gelir',
    wide: true,
  },
]

const roleCards = [
  {
    icon: '👑',
    title: 'Yöneticiler',
    description: 'Satış, finans, devamsızlık ve ekip görünürlüğünü tek ekrandan alın.',
    bullets: ['Canlı kampüs genel görünümü', 'Tahsilat ve raporlama', 'Personel ve sınıf yönetimi'],
  },
  {
    icon: '👩‍🏫',
    title: 'Öğretmenler',
    description: 'Gün boyunca hızlı veri girişi, daha az tekrar ve daha fazla odak.',
    bullets: ['Tek dokunuşla aktivite kaydı', 'Günlük rapor akışı', 'Aile ile kontrollü mesajlaşma'],
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Veliler',
    description: 'Çocuğunuzun gününü sakin, güvenli ve premium bir uygulama deneyimiyle izleyin.',
    bullets: ['Canlı feed ve bildirimler', 'Aidat ve duyuru ekranları', 'Fotoğraf ve mesajlaşma'],
  },
]

const timeline = [
  { step: '01', title: 'Okulu kur', description: 'Dakikalar içinde kurumunu aç, sınıfları ve planını tanımla.' },
  { step: '02', title: 'Ekip davet et', description: 'Öğretmenleri, personeli ve aileleri rolleriyle sisteme al.' },
  { step: '03', title: 'Başla', description: 'Yoklama, mesaj, aidat ve raporları aynı gün kullanmaya başla.' },
]

const testimonials = [
  {
    quote: 'KinderX ile sabah operasyonu ilk kez sakin hissettirdi. Her şeyin tek akışta olması ekibi doğrudan rahatlattı.',
    name: 'Ayşe H.',
    role: 'Müdür, Nova Kids',
  },
  {
    quote: 'Velilerden gelen geri bildirim tek kelimeyle premium. Uygulama okul markamızın bir parçası gibi hissettiriyor.',
    name: 'Fatma K.',
    role: 'Öğretmen, Papatya Koleji',
  },
  {
    quote: 'Tahsilat ve duyuru tarafında kaybettiğimiz günleri geri aldık. Yönetim paneli gerçekten gelir yaratan bir araç oldu.',
    name: 'Mehmet A.',
    role: 'Kurucu, Gökkuşağı Kampüsü',
  },
]

const pricing = [
  {
    name: 'Starter',
    price: 'Ücretsiz',
    detail: 'ilk kampüsünü açan okullar',
    featured: false,
    items: ['50 öğrenciye kadar', 'Temel yoklama ve mesajlaşma', 'Mobil veli deneyimi', 'Standart destek'],
  },
  {
    name: 'Pro',
    price: '₺1.000',
    detail: '/ ay',
    featured: true,
    items: ['Sınırsız öğrenci', 'Tüm modül ve rol ekranları', 'Aidat ve fotoğraf yönetimi', 'Premium destek ve onboarding'],
  },
  {
    name: 'Scale',
    price: 'Özel',
    detail: 'çok şubeli kurumlar',
    featured: false,
    items: ['Çoklu şube yönetimi', 'Kurumsal raporlama', 'Özel entegrasyonlar', 'SLA ve öncelikli çözüm ekibi'],
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
    <main className="min-h-screen bg-[#060a06] font-sans text-white">
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
              <div className="text-base font-semibold tracking-tight text-white">KinderX</div>
              <div className="text-xs text-[var(--muted)]">Premium anaokulu operasyon sistemi</div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            <MegaMenu
              title="Özellikler"
              items={featureMenu}
              active={activeDropdown === 'features'}
              onEnter={() => setActiveDropdown('features')}
              onLeave={() => setActiveDropdown(null)}
            />
            <MegaMenu
              title="Kim İçin"
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
              Giriş Yap
            </Link>
            <Link
              href="/kayit"
              className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-bold text-[#060a06] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(74,222,128,0.22)]"
            >
              Ücretsiz Başla
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
              { label: 'Özellikler', items: featureMenu },
              { label: 'Kim İçin', items: audienceMenu },
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
                Giriş Yap
              </Link>
              <Link href="/kayit" className="flex-1 rounded-full bg-[var(--green)] px-5 py-3 text-center text-sm font-bold text-[#060a06]">
                Ücretsiz Başla
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
              Türkiye&apos;nin #1 Anaokulu Platformu
            </div>
            <h1 className="serif max-w-[720px] text-[clamp(3.7rem,8vw,7.2rem)] leading-[0.9] tracking-[-0.05em] text-white">
              Okulunuzu
              <br />
              güvenle yönetin,
              <br />
              aileleri sakince
              <br />
              yanınızda tutun.
            </h1>
            <p className="mt-8 max-w-[620px] text-lg leading-relaxed text-[var(--muted)] md:text-xl">
              KinderX; yönetim, öğretmen ve veli deneyimini tek bir premium sistemde birleştirir.
              Daha az operasyon stresi, daha güçlü marka algısı ve daha yüksek gelir görünürlüğü sunar.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/kayit"
                className="group inline-flex items-center rounded-full bg-[var(--green)] px-7 py-4 text-sm font-bold text-[#060a06] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(74,222,128,0.2)]"
              >
                Ücretsiz Başla
                <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/giris"
                className="rounded-full border border-[var(--border)] px-7 py-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/5"
              >
                Panele Giriş Yap
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
                  kinderx.app/admin
                </div>
              </div>

              <div className="grid gap-5 p-5 xl:grid-cols-[210px_1fr]">
                <div className="rounded-[24px] border border-[var(--border)] bg-black/20 p-4">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--green)] font-black text-[#060a06]">K</div>
                    <div>
                      <div className="text-sm font-semibold text-white">KinderX</div>
                      <div className="text-xs text-[var(--muted)]">Mimoza Kampüsü</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {['Dashboard', 'Öğrenciler', 'Mesajlar', 'Aidatlar', 'Fotoğraflar'].map((item, index) => (
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
                      ['32', 'bugün aktivite'],
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
                          <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Günlük operasyon</div>
                          <div className="mt-1 serif text-2xl text-white">Bugünün nabzı</div>
                        </div>
                        <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--green)]">canlı</div>
                      </div>
                      <div className="space-y-3">
                        {[
                          ['✓', 'Yoklama tamamlandı', '08:47', '26 öğrenci işaretlendi'],
                          ['⚡', 'Aktivite akışı güncellendi', '10:12', '14 yeni feed kaydı'],
                          ['💬', 'Toplu veli mesajı gönderildi', '11:05', '18 aileye teslim edildi'],
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
                      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Tahsilat sağlığı</div>
                      <div className="mt-2 serif text-4xl text-[var(--green)]">₺1.2M</div>
                      <div className="mt-2 text-sm text-[var(--muted)]">12 aylık tahmini yıllık gelir görünürlüğü</div>
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
                            <div className="text-[var(--muted)]">Otomatik hatırlatma</div>
                            <div className="mt-1 font-semibold text-white">bugün 09:00</div>
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
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Bize güvenen okullar</div>
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
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Özellikler</div>
            <h2 className="serif mt-5 max-w-[760px] text-[clamp(2.8rem,5vw,4.8rem)] leading-[0.95] tracking-[-0.04em] text-white">
              Operasyon gücünü
              <br />
              premium bir ürün deneyimine çevirin.
            </h2>
            <p className="mt-5 max-w-[660px] text-lg leading-relaxed text-[var(--muted)]">
              Her modülü, kurumunuza daha fazla sakinlik, görünürlük ve profesyonellik vermek için tasarladık.
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
                    <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[var(--border)] bg-[var(--green-dim)] text-[var(--green)] transition-transform group-hover:-translate-y-1">
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
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Nasıl çalışır?</div>
            <h2 className="serif mt-4 text-[clamp(2.5rem,4.4vw,4.4rem)] leading-[0.95] tracking-[-0.04em] text-white">
              Kurulumdan canlı kullanıma
              <br />
              kadar tek akış.
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
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Kim için</div>
            <h2 className="serif mt-4 text-[clamp(2.5rem,4.5vw,4.5rem)] leading-[0.95] tracking-[-0.04em] text-white">
              Her rolde aynı seviye
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
            ['18 dakika', 'ortalama sabah check-in süresi'],
            ['%82', 'aidat tahsilat görünürlüğü'],
            ['3.4x', 'veli uygulama etkileşimi'],
            ['0 dağınık araç', 'tek platform operasyonu'],
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
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Müşteri görüşleri</div>
            <h2 className="serif mt-4 text-[clamp(2.5rem,4.5vw,4.5rem)] leading-[0.95] tracking-[-0.04em] text-white">
              Ürünün kalitesi,
              <br />
              ekiplerin gününe yansıyor.
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
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Fiyatlandırma</div>
            <h2 className="serif mt-4 text-[clamp(2.5rem,4.5vw,4.5rem)] leading-[0.95] tracking-[-0.04em] text-white">
              Büyürken değil,
              <br />
              kullanırken mutlu eden planlar.
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
                      en popüler
                    </div>
                  )}
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--green)]">{plan.name}</div>
                  <div className="mt-6 serif text-6xl tracking-tight text-white">{plan.price}</div>
                  <div className="mt-2 text-sm text-[var(--muted)]">{plan.detail}</div>
                  <div className="mt-8 space-y-3">
                    {plan.items.map((item) => (
                      <div key={item} className="flex items-start gap-3 text-sm text-[var(--muted)]">
                        <Check size={14} className="mt-0.5 flex-shrink-0 text-[var(--green)]" />
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
                    {plan.name === 'Scale' ? 'Teklif Al' : 'Başlayın'}
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
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--green)]">Hazırsanız</div>
            <h2 className="serif mt-5 text-[clamp(2.8rem,5vw,5.4rem)] leading-[0.92] tracking-[-0.05em]">
              <span className="glow-text">Okulunuzun premium</span>
              <br />
              operasyon dönemine geçin.
            </h2>
            <p className="mx-auto mt-5 max-w-[700px] text-lg leading-relaxed text-[var(--muted)]">
              Kurulum 5 dakika sürer. Ekip ve aileler aynı gün içinde kullanmaya başlar. Ürün, markanızın kalite algısını ilk girişte hissettirir.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/kayit"
                className="rounded-full bg-[var(--green)] px-7 py-4 text-sm font-bold text-[#060a06] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(74,222,128,0.2)]"
              >
                Ücretsiz Başla
              </Link>
              <a
                href="mailto:info@kinderx.app"
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
              <div className="text-sm font-semibold text-white">KinderX</div>
              <div className="text-sm text-[var(--muted)]">Anaokullları için premium operasyon platformu</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-[var(--muted)]">
           <a href="#ozellikler" className="transition-colors hover:text-white">Özellikler</a>
            <a href="#roller" className="transition-colors hover:text-white">Roller</a>
            <a href="#fiyatlar" className="transition-colors hover:text-white">Fiyatlar</a>
            <a href="mailto:info@kinderx.app" className="transition-colors hover:text-white">İletişim</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
