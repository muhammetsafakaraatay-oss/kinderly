import Link from 'next/link'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import { RoiCalculator } from '@/components/roi-calculator'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

const schools = ['Ata Cocuk Akademisi', 'Mavi Dusler Anaokulu', 'Mini Kasmir Kids', 'Orman Evim', 'Gunes Kampusu']

const features = [
  {
    title: 'Yoklama akisini dakikalara indir',
    body: 'Sabah karsilama, sinif bazli durum takibi ve veli bilgilendirmesi ayni akista ilerler.',
    icon: '✓',
    span: 'md:col-span-2',
  },
  {
    title: 'Gunluk aktivite kayitlari',
    body: 'Yemek, uyku, ilac, not ve gunluk raporlar tek panelden kaydolur.',
    icon: '⚡',
  },
  {
    title: 'Mesajlasma tek yerde',
    body: 'Ogretmen, veli ve yonetim ayni konusma duzeninde iletisim kurar.',
    icon: '💬',
  },
  {
    title: 'Fotograf paylasimi',
    body: 'Sinif anlarini guvenli sekilde velilere ulastir, arsivi da kaybetme.',
    icon: '📷',
  },
  {
    title: 'Aidat takibi ve tahsilat',
    body: 'Geciken odemeleri gor, veliyi bilgilendir, okul gelirini anlik takip et.',
    icon: '₺',
    span: 'md:col-span-2',
  },
]

const personas = [
  {
    title: 'Yonetici',
    body: 'Tum okul operasyonunu, siniflari, personeli ve geliri tek dashboard uzerinden gorur.',
  },
  {
    title: 'Ogretmen',
    body: 'Gun icindeki her kaydi telefonundan girer, veliyi ekstra efor harcamadan bilgilendirir.',
  },
  {
    title: 'Veli',
    body: 'Cocugunun gununu, fotograflarini, mesajlarini ve odemelerini tek uygulamada takip eder.',
  },
]

const testimonials = [
  {
    quote: 'Kinderly ile sabah yoklama ve veli bilgilendirmesi icin ayirdigimiz sure yari yariya azaldi.',
    author: 'Seda Hanim',
    role: 'Kurucu Mudur',
  },
  {
    quote: 'Ogretmenler artik WhatsApp ile kaybolmuyor. Tum iletisim okulun kendi akisinda toplandi.',
    author: 'Mert Bey',
    role: 'Kampus Yoneticisi',
  },
  {
    quote: 'Veliler en cok fotograf ve gunluk rapor akisindan memnun. Destek talebi de ciddi sekilde dustu.',
    author: 'Elif Hanim',
    role: 'Anaokulu Sahibi',
  },
]

export default function Home() {
  return (
    <main className={`min-h-screen bg-[#060a06] text-white ${dmSans.className}`}>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.14),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(74,222,128,0.08),transparent_24%)]" />

      <nav className="sticky top-0 z-50 border-b border-[rgba(74,222,128,0.16)] bg-[rgba(6,10,6,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.10)] text-[#4ade80]">
              ✦
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.24em] text-[#4ade80]">KINDERLY</div>
              <div className={`${instrumentSerif.className} text-xl leading-none text-white`}>School OS</div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-white/68 md:flex">
            <a href="#features" className="transition-colors hover:text-[#4ade80]">Ozellikler</a>
            <a href="#roller" className="transition-colors hover:text-[#4ade80]">Roller</a>
            <a href="#pricing" className="transition-colors hover:text-[#4ade80]">Fiyatlar</a>
            <a href="#yorumlar" className="transition-colors hover:text-[#4ade80]">Yorumlar</a>
          </div>

          <Link
            href="/kayit"
            className="rounded-full border border-[#4ade80] bg-[#4ade80] px-5 py-2.5 text-sm font-bold text-[#060a06] transition-transform hover:-translate-y-0.5"
          >
            Ucretsiz Basla
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden px-5 pb-20 pt-16 md:px-8 md:pt-24">
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(74,222,128,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.08)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#92f2b3]">
              Premium okul yonetim platformu
            </div>
            <h1 className={`${instrumentSerif.className} max-w-4xl text-[clamp(54px,8vw,102px)] leading-[0.95] tracking-tight text-white`}>
              Anaokulunu
              <br />
              karanlikta degil,
              <br />
              veriyle yonet.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68 md:text-xl">
              Kinderly; yoklama, veli iletisimi, fotograf paylasimi ve aidat takibini tek akista birlestirir.
              Ekibin daha az zaman kaybeder, veliler daha guvenli hisseder.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/kayit"
                className="rounded-full bg-[#4ade80] px-7 py-4 text-sm font-bold text-[#060a06] transition-transform hover:-translate-y-0.5"
              >
                Ucretsiz Basla
              </Link>
              <Link
                href="/kayit"
                className="rounded-full border border-[rgba(74,222,128,0.22)] bg-[rgba(255,255,255,0.03)] px-7 py-4 text-sm font-bold text-white transition-colors hover:border-[#4ade80] hover:text-[#4ade80]"
              >
                Demo Talep Et
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[36px] bg-[radial-gradient(circle,rgba(74,222,128,0.16),transparent_65%)] blur-2xl" />
            <div className="relative rounded-[28px] border border-[rgba(74,222,128,0.18)] bg-[#0b120b] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between rounded-[22px] border border-[rgba(74,222,128,0.16)] bg-[#0f170f] px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#f87171]" />
                  <span className="h-3 w-3 rounded-full bg-[#facc15]" />
                  <span className="h-3 w-3 rounded-full bg-[#4ade80]" />
                </div>
                <div className="rounded-full border border-[rgba(74,222,128,0.16)] px-4 py-1 text-xs text-white/54">
                  panel.kinderly.app
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-[rgba(74,222,128,0.14)] bg-[#081008] p-5">
                <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-[22px] border border-[rgba(74,222,128,0.14)] bg-[#0d150d] p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[#92f2b3]">Bugun</div>
                    <div className="mt-2 text-5xl font-black text-white">87%</div>
                    <p className="mt-2 text-sm leading-6 text-white/58">Devam orani 26/30 ogrenci. 3 aile yeni duyuruyu okudu.</p>
                    <div className="mt-5 grid gap-3">
                      {[
                        ['Mesajlar', '12'],
                        ['Fotograf', '24'],
                        ['Aidat', '4'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-2xl border border-[rgba(74,222,128,0.10)] bg-[#101910] px-4 py-3">
                          <span className="text-sm text-white/64">{label}</span>
                          <span className="text-lg font-bold text-[#4ade80]">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-[rgba(74,222,128,0.14)] bg-[#0d150d] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-[#92f2b3]">Canli akis</div>
                        <div className="mt-1 text-xl font-bold text-white">Mavi Kelebekler Sinifi</div>
                      </div>
                      <div className="rounded-full border border-[rgba(74,222,128,0.14)] px-3 py-1 text-xs text-[#4ade80]">
                        2 dk once
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {[
                        ['✓', 'Yoklama tamamlandi', '3 veliye bildirim gitti'],
                        ['📷', 'Fotograf paylasildi', 'Ayse ogleden sonra etkinligi'],
                        ['💬', 'Yeni mesaj geldi', 'Ogretmen veli sorusunu yanitladi'],
                      ].map(([icon, title, body]) => (
                        <div key={title} className="rounded-2xl border border-[rgba(74,222,128,0.10)] bg-[#101910] p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(74,222,128,0.10)] text-[#4ade80]">
                              {icon}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{title}</div>
                              <div className="text-sm text-white/54">{body}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-[28px] border border-[rgba(74,222,128,0.16)] bg-[#0b120b] px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.18em] text-[#92f2b3]">Guvenilen okullar</div>
            <div className="mt-2 text-white/64">Turkiye genelinde modern okul ekipleri tarafindan kullaniliyor.</div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-white/72">
            {schools.map((school) => (
              <span key={school}>{school}</span>
            ))}
            <span className="rounded-full border border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.08)] px-4 py-2 text-[#4ade80]">
              ★ 4.9 / 5 okul memnuniyeti
            </span>
          </div>
        </div>
      </section>

      <section id="features" className="px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <div className="text-sm uppercase tracking-[0.18em] text-[#92f2b3]">Ozellikler</div>
            <h2 className={`${instrumentSerif.className} mt-4 text-[clamp(40px,6vw,72px)] leading-[0.96] text-white`}>
              Okulun tum akislarini
              <br />
              tek panelde birlestir.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-7 ${feature.span ?? ''}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(74,222,128,0.16)] bg-[rgba(74,222,128,0.10)] text-xl text-[#4ade80]">
                  {feature.icon}
                </div>
                <h3 className="mt-6 text-2xl font-bold text-white">{feature.title}</h3>
                <p className="mt-3 max-w-xl text-base leading-7 text-white/62">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="roller" className="px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <div className="text-sm uppercase tracking-[0.18em] text-[#92f2b3]">Kimler icin</div>
            <h2 className={`${instrumentSerif.className} mt-4 text-[clamp(40px,6vw,68px)] leading-[0.98] text-white`}>
              Her rol icin ayrilmis,
              <br />
              ortak bir deneyim.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {personas.map((persona) => (
              <div key={persona.title} className="rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-7">
                <div className="text-sm uppercase tracking-[0.18em] text-[#92f2b3]">{persona.title}</div>
                <p className="mt-5 text-lg leading-8 text-white/68">{persona.body}</p>
                <Link
                  href="/kayit"
                  className="mt-8 inline-flex items-center rounded-full border border-[rgba(74,222,128,0.18)] px-5 py-3 text-sm font-bold text-white transition-colors hover:border-[#4ade80] hover:text-[#4ade80]"
                >
                  Ucretsiz basla
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-4">
          {[
            ['500+', 'aktif okul'],
            ['50K+', 'ogrenci'],
            ['98%', 'memnuniyet'],
            ['20sa', 'haftalik tasarruf'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-7 text-center">
              <div className={`${instrumentSerif.className} text-6xl leading-none text-[#4ade80]`}>{value}</div>
              <div className="mt-4 text-sm uppercase tracking-[0.18em] text-white/52">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <RoiCalculator />

      <section id="yorumlar" className="px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <div className="text-sm uppercase tracking-[0.18em] text-[#92f2b3]">Yorumlar</div>
            <h2 className={`${instrumentSerif.className} mt-4 text-[clamp(40px,6vw,68px)] leading-[0.98] text-white`}>
              Ekibin hissettigi fark
              <br />
              raporlardan da buyuk.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((item) => (
              <div key={item.author} className="rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-7">
                <div className="text-[#4ade80]">★★★★★</div>
                <p className={`${instrumentSerif.className} mt-5 text-3xl leading-[1.18] text-white`}>
                  “{item.quote}”
                </p>
                <div className="mt-8 text-sm text-white/58">
                  <div className="font-bold text-white">{item.author}</div>
                  <div>{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <div className="text-sm uppercase tracking-[0.18em] text-[#92f2b3]">Fiyatlandirma</div>
            <h2 className={`${instrumentSerif.className} mt-4 text-[clamp(40px,6vw,68px)] leading-[0.98] text-white`}>
              Kucuk okuldan
              <br />
              kurumsal yapilara kadar.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-8">
              <div className="text-sm uppercase tracking-[0.18em] text-[#92f2b3]">Ucretsiz</div>
              <div className={`${instrumentSerif.className} mt-5 text-6xl text-white`}>₺0</div>
              <div className="mt-2 text-white/48">Temel baslangic paketi</div>
              <ul className="mt-8 space-y-3 text-white/68">
                <li>50 ogrenciye kadar</li>
                <li>Yoklama takibi</li>
                <li>Temel mesajlasma</li>
                <li>Mobil erisim</li>
              </ul>
              <Link href="/kayit" className="mt-8 inline-flex rounded-full border border-[rgba(74,222,128,0.18)] px-5 py-3 text-sm font-bold text-white transition-colors hover:border-[#4ade80] hover:text-[#4ade80]">
                Basla
              </Link>
            </div>

            <div className="rounded-[28px] border border-[#4ade80] bg-[linear-gradient(180deg,#101a10_0%,#0b120b_100%)] p-8 shadow-[0_24px_80px_rgba(74,222,128,0.10)]">
              <div className="inline-flex rounded-full bg-[#4ade80] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#060a06]">
                En populer
              </div>
              <div className="mt-4 text-sm uppercase tracking-[0.18em] text-[#92f2b3]">Pro</div>
              <div className={`${instrumentSerif.className} mt-5 text-6xl text-white`}>₺499</div>
              <div className="mt-2 text-white/48">aylik tam paket</div>
              <ul className="mt-8 space-y-3 text-white/68">
                <li>Sinirsiz ogrenci</li>
                <li>Fotograf ve duyuru akisi</li>
                <li>Aidat yonetimi</li>
                <li>Raporlar ve oncelikli destek</li>
              </ul>
              <Link href="/kayit" className="mt-8 inline-flex rounded-full bg-[#4ade80] px-5 py-3 text-sm font-bold text-[#060a06] transition-transform hover:-translate-y-0.5">
                Hemen basla
              </Link>
            </div>

            <div className="rounded-[28px] border border-[rgba(74,222,128,0.14)] bg-[#0b120b] p-8">
              <div className="text-sm uppercase tracking-[0.18em] text-[#92f2b3]">Kurumsal</div>
              <div className={`${instrumentSerif.className} mt-5 text-6xl text-white`}>Ozel</div>
              <div className="mt-2 text-white/48">Cok subeli yapilar icin</div>
              <ul className="mt-8 space-y-3 text-white/68">
                <li>Coklu sube yonetimi</li>
                <li>Ozel onboarding</li>
                <li>Raporlama ve entegrasyon</li>
                <li>Dedicated destek</li>
              </ul>
              <Link href="/kayit" className="mt-8 inline-flex rounded-full border border-[rgba(74,222,128,0.18)] px-5 py-3 text-sm font-bold text-white transition-colors hover:border-[#4ade80] hover:text-[#4ade80]">
                Teklif al
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl rounded-[36px] border border-[rgba(74,222,128,0.16)] bg-[#0b120b] px-8 py-16 text-center md:px-14">
          <div className="text-sm uppercase tracking-[0.18em] text-[#92f2b3]">Son adim</div>
          <h2 className={`${instrumentSerif.className} mt-5 text-[clamp(42px,6vw,74px)] leading-[0.96] text-white`}>
            Okulun icin daha premium
            <br />
            bir isletim sistemi kur.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/64">
            Kinderly ile ekibin zamani geri kazanir, velin daha hizli bilgilendirilir ve okulun daha duzenli buyur.
          </p>
          <Link
            href="/kayit"
            className="mt-10 inline-flex rounded-full bg-[#4ade80] px-8 py-4 text-sm font-bold text-[#060a06] transition-transform hover:-translate-y-0.5"
          >
            Ucretsiz Basla
          </Link>
        </div>
      </section>

      <footer className="border-t border-[rgba(74,222,128,0.12)] px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.18em] text-[#92f2b3]">Kinderly</div>
            <div className="mt-2 text-white/52">© 2026 Kinderly. Tum haklari saklidir.</div>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-white/54">
            <Link href="/kayit" className="transition-colors hover:text-[#4ade80]">Kayit Ol</Link>
            <Link href="/giris" className="transition-colors hover:text-[#4ade80]">Panele Gir</Link>
            <a href="mailto:info@kinderly.app" className="transition-colors hover:text-[#4ade80]">Iletisim</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
