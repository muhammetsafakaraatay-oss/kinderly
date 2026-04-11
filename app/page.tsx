import Link from 'next/link'
import { RoiCalculator } from '@/components/roi-calculator'
import { Instrument_Serif, DM_Sans } from 'next/font/google'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-sans' })

export default function Home() {
  return (
    <main className={`${serif.variable} ${sans.variable} min-h-screen bg-[#060a06] text-white font-sans`}>
      <style>{`
        :root { --green: #4ade80; --green-dim: rgba(74,222,128,0.1); --border: rgba(74,222,128,0.14); --surface: #0b120b; --muted: rgba(255,255,255,0.54); }
        .serif { font-family: var(--font-serif); }
        .fade-in { animation: fadeIn 0.8s ease forwards; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* GLOW */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[radial-gradient(ellipse,rgba(74,222,128,0.08)_0%,transparent_70%)]" />
      </div>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-[5%] bg-[rgba(6,10,6,0.85)] backdrop-blur-xl border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--green)] flex items-center justify-center text-[#060a06] font-black text-sm">K</div>
          <span className="font-semibold tracking-tight">Kinderly</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm text-[var(--muted)]">
          <a href="#ozellikler" className="hover:text-white transition-colors">Özellikler</a>
          <a href="#roller" className="hover:text-white transition-colors">Roller</a>
          <a href="#fiyatlar" className="hover:text-white transition-colors">Fiyatlar</a>
        </div>
        <Link href="/kayit" className="bg-[var(--green)] text-[#060a06] font-bold text-sm px-5 py-2.5 rounded-full hover:-translate-y-px transition-transform">
          Ücretsiz Başla
        </Link>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-24 pb-20 px-[5%] overflow-hidden">
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(74,222,128,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,0.05)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
        <div className="relative z-10 max-w-[680px]">
          <div className="inline-flex items-center gap-2 border border-[var(--border)] bg-[var(--green-dim)] rounded-full px-4 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
            <span className="text-xs font-bold text-[var(--green)] uppercase tracking-wide">Türkiye'nin #1 Anaokulu Platformu</span>
          </div>
          <h1 className="serif text-[clamp(52px,7.5vw,96px)] leading-[0.95] tracking-[-3px] mb-6">
            Anaokulu<br />yönetimini<br /><em className="text-[var(--green)]">yeniden</em><br />keşfet.
          </h1>
          <p className="text-lg text-[var(--muted)] leading-relaxed mb-10 max-w-[500px] font-light">
            Yoklama, aktivite takibi, veli iletişimi ve aidat yönetimi — hepsi tek platformda. Kağıt işleri tarihe karıştı.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/kayit" className="bg-[var(--green)] text-[#060a06] font-bold px-8 py-4 rounded-full hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(74,222,128,0.25)] transition-all">
              Ücretsiz Başla →
            </Link>
            <Link href="/giris" className="text-[var(--muted)] text-sm hover:text-white transition-colors">
              Zaten hesabım var ↗
            </Link>
          </div>
          <div className="flex gap-10 mt-14 pt-10 border-t border-[var(--border)]">
            {[['500+','Okul'],['50K+','Öğrenci'],['98%','Memnuniyet'],['20sa','Tasarruf/ay']].map(([v,l]) => (
              <div key={l}>
                <div className="serif text-3xl text-white tracking-tight">{v}</div>
                <div className="text-xs text-[var(--muted)] mt-1 font-medium">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MOCKUP */}
        <div className="hidden xl:block absolute right-[4%] top-1/2 -translate-y-1/2 w-[42%] max-w-[500px]">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6),0_0_80px_rgba(74,222,128,0.04)]">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0f170f] border-b border-[var(--border)]">
              <span className="w-3 h-3 rounded-full bg-[#f87171]" /><span className="w-3 h-3 rounded-full bg-[#facc15]" /><span className="w-3 h-3 rounded-full bg-[#4ade80]" />
              <div className="flex-1 text-center text-xs text-[var(--muted)] bg-[rgba(255,255,255,0.04)] rounded-full py-1">panel.kinderly.app</div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-lg bg-[var(--green)] flex items-center justify-center text-[#060a06] font-black text-xs">K</div><span className="text-sm font-semibold">Kinderly</span></div>
                <span className="text-xs text-[var(--muted)]">11 Nisan</span>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--green-dim)] p-4 flex items-center justify-between mb-3">
                <div><div className="serif text-4xl text-[var(--green)]">87%</div><div className="text-xs text-[var(--muted)] mt-1">Devam · 26/30 öğrenci</div></div>
                <div className="w-10 h-10 rounded-xl bg-[rgba(74,222,128,0.1)] flex items-center justify-center text-lg">🏫</div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[['26','Geldi'],['14','Aktivite'],['3','Mesaj'],['2','Duyuru']].map(([v,l]) => (
                  <div key={l} className="rounded-xl bg-[#0f170f] border border-[var(--border)] p-2.5 text-center">
                    <div className="font-black text-lg text-white">{v}</div>
                    <div className="text-[9px] text-[var(--muted)]">{l}</div>
                  </div>
                ))}
              </div>
              {[['🍎','Ayşe K.','Öğle yemeği'],['😴','Ali D.','Uyku 90dk'],['⭐','Zeynep Ç.','Tebrik!']].map(([e,n,d]) => (
                <div key={n} className="flex items-center gap-2.5 py-2 border-b border-[var(--border)] last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--green-dim)] flex items-center justify-center text-sm">{e}</div>
                  <div><div className="text-xs font-semibold text-white">{n}</div><div className="text-[10px] text-[var(--muted)]">{d}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <div className="border-y border-[var(--border)] px-[5%] py-5 flex items-center gap-8 flex-wrap">
        <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Güvenilen okullar</span>
        <div className="flex gap-8 flex-wrap">
          {['Güneş Anaokulu','Papatya Koleji','Yıldız Yuvası','Pembe Bulut','Gökkuşağı'].map(s => (
            <span key={s} className="text-sm text-white/20 font-medium">{s}</span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[var(--green)] text-sm">★★★★★</span>
          <span className="text-xs text-[var(--muted)]">4.9 · 100+ okul</span>
        </div>
      </div>

      {/* FEATURES */}
      <section id="ozellikler" className="py-24 px-[5%]">
        <div className="text-xs font-bold text-[var(--green)] uppercase tracking-[2px] mb-4">Özellikler</div>
        <div className="serif text-[clamp(36px,5vw,60px)] leading-tight tracking-tight mb-4">Her şey,<br />tek ekranda.</div>
        <div className="text-[var(--muted)] text-lg font-light max-w-md mb-14">Farklı araçlar arasında gidip gelmek yok. Okulunuzun tüm operasyonu tek noktadan.</div>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            {icon:'✅',title:'Dijital Yoklama',desc:'Saniyeler içinde tüm sınıfın yoklamasını alın. Veliler anında bildirim alır.',wide:true},
            {icon:'⚡',title:'Aktivite Takibi',desc:'Yemek, uyku, tuvalet, sağlık — her aktiviteyi kaydedin.'},
            {icon:'💬',title:'Veli İletişimi',desc:'Mesajlaşma, duyurular ve push notification. WhatsApp karmaşasına son.'},
            {icon:'📷',title:'Fotoğraf Paylaşımı',desc:'Özel anları güvenle velilerle paylaşın.'},
            {icon:'💰',title:'Aidat Yönetimi',desc:'Ödeme takibi, gecikmiş faturalar. Para takibinde kayıp yok.',wide:true},
          ].map(f => (
            <div key={f.title} className={`rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 hover:border-[rgba(74,222,128,0.3)] hover:-translate-y-1 transition-all ${f.wide ? 'md:col-span-2 flex items-center gap-10' : ''}`}>
              <div className="text-3xl mb-4 flex-shrink-0">{f.icon}</div>
              <div>
                <div className="serif text-2xl text-white mb-2">{f.title}</div>
                <div className="text-[var(--muted)] text-sm leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ROLES */}
      <section id="roller" className="py-24 px-[5%]">
        <div className="text-xs font-bold text-[var(--green)] uppercase tracking-[2px] mb-4">Kim İçin</div>
        <div className="serif text-[clamp(36px,5vw,60px)] leading-tight tracking-tight mb-14">Herkes için<br />tasarlandı.</div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {emoji:'👑',name:'Yönetici',desc:'Okulunuzun tüm operasyonunu tek ekrandan görün.',features:['Öğrenci & personel yönetimi','Aidat & ödeme takibi','Duyuru yayınlama','Detaylı raporlar']},
            {emoji:'👩‍🏫',name:'Öğretmen',desc:'Günlük rutinleri hızlandırın, velilerle güçlü iletişim kurun.',features:['Hızlı yoklama','Aktivite kaydetme','Veli mesajlaşma','Fotoğraf paylaşma']},
            {emoji:'👨‍👩‍👧',name:'Veli',desc:'Çocuğunuzun her anından haberdar olun.',features:['Günlük aktivite feed'i','Anlık bildirimler','Öğretmenle mesajlaşma','Aidat takibi']},
          ].map(r => (
            <div key={r.name} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 hover:border-[rgba(74,222,128,0.3)] transition-all group">
              <div className="text-4xl mb-5">{r.emoji}</div>
              <div className="serif text-2xl mb-3">{r.name}</div>
              <div className="text-[var(--muted)] text-sm mb-6 leading-relaxed">{r.desc}</div>
              <div className="space-y-2">
                {r.features.map(f => <div key={f} className="text-xs text-[var(--muted)] flex items-center gap-2"><span className="text-[var(--green)]">→</span>{f}</div>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* METRICS */}
      <section className="py-10 px-[5%]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['500+','Aktif Okul'],['50K+','Öğrenci Takibi'],['98%','Memnuniyet'],['2M+','Aktivite Kaydı']].map(([v,l]) => (
            <div key={l} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
              <div className="serif text-5xl text-[var(--green)] tracking-tight">{v}</div>
              <div className="text-xs text-[var(--muted)] mt-3 uppercase tracking-wider">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ROI */}
      <RoiCalculator />

      {/* TESTIMONIALS */}
      <section className="py-24 px-[5%]">
        <div className="text-xs font-bold text-[var(--green)] uppercase tracking-[2px] mb-4">Müşteri Görüşleri</div>
        <div className="serif text-[clamp(36px,5vw,60px)] leading-tight tracking-tight mb-14">Onlar anlatsın.</div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {q:'Kinderly ile yoklama ve veli bilgilendirmesi için ayırdığımız süre yarıya indi. Artık sabah koşuşturmacası yok.',name:'Ayşe H.',role:'Müdür · Güneş Anaokulu'},
            {q:'Veliler uygulamayı çok seviyor. Çocuklarının ne yediğini, ne zaman uyuduğunu anlık görüyorlar.',name:'Fatma K.',role:'Öğretmen · Papatya Koleji'},
            {q:'Aidat takibi artık çok kolay. Geciken ödemeler otomatik hatırlatılıyor. Aylık muhasebe saatlerden dakikalara indi.',name:'Mehmet A.',role:'Kurucu · Yıldız Yuvası'},
          ].map((t,i) => (
            <div key={i} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8">
              <div className="text-[var(--green)] mb-6 text-sm tracking-widest">★★★★★</div>
              <div className="serif text-xl leading-relaxed text-white mb-8">"{t.q}"</div>
              <div>
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-xs text-[var(--muted)] mt-1">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="fiyatlar" className="py-24 px-[5%]">
        <div className="text-xs font-bold text-[var(--green)] uppercase tracking-[2px] mb-4">Fiyatlandırma</div>
        <div className="serif text-[clamp(36px,5vw,60px)] leading-tight tracking-tight mb-4">Şeffaf fiyatlar.<br />Gizli ücret yok.</div>
        <div className="text-[var(--muted)] text-lg font-light mb-14">İstediğiniz zaman iptal edin.</div>
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl">
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8">
            <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-4">Başlangıç</div>
            <div className="serif text-5xl tracking-tight mb-1">Ücretsiz</div>
            <div className="text-[var(--muted)] text-sm mb-6">sonsuza kadar</div>
            <ul className="space-y-3 mb-8">{['50 öğrenciye kadar','Yoklama takibi','Temel mesajlaşma','Mobil uygulama'].map(f=><li key={f} className="text-sm text-[var(--muted)] flex gap-2"><span className="text-[var(--green)]">✓</span>{f}</li>)}</ul>
            <Link href="/kayit" className="block text-center py-3 rounded-full border border-[var(--border)] text-sm font-bold hover:border-[var(--green)] hover:text-[var(--green)] transition-colors">Ücretsiz Başla</Link>
          </div>
          <div className="rounded-[20px] border border-[var(--green)] bg-[#0d1a0d] p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--green)] text-[#060a06] text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">En Popüler</div>
            <div className="text-xs font-bold text-[var(--green)] uppercase tracking-wider mb-4">Pro</div>
            <div className="serif text-5xl tracking-tight mb-1">₺499</div>
            <div className="text-[var(--muted)] text-sm mb-6">/ ay · tüm özellikler</div>
            <ul className="space-y-3 mb-8">{['Sınırsız öğrenci','Tüm aktivite türleri','Fotoğraf paylaşımı','Aidat yönetimi','Push notification','Öncelikli destek'].map(f=><li key={f} className="text-sm text-white/70 flex gap-2"><span className="text-[var(--green)]">✓</span>{f}</li>)}</ul>
            <Link href="/kayit" className="block text-center py-3 rounded-full bg-[var(--green)] text-[#060a06] text-sm font-bold hover:-translate-y-0.5 transition-transform">Hemen Başla</Link>
          </div>
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8">
            <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-4">Kurumsal</div>
            <div className="serif text-5xl tracking-tight mb-1">Özel</div>
            <div className="text-[var(--muted)] text-sm mb-6">çok şubeli kurumlar</div>
            <ul className="space-y-3 mb-8">{['Çoklu şube','Özel entegrasyonlar','SLA garantisi','Dedicated destek'].map(f=><li key={f} className="text-sm text-[var(--muted)] flex gap-2"><span className="text-[var(--green)]">✓</span>{f}</li>)}</ul>
            <a href="mailto:info@kinderly.app" className="block text-center py-3 rounded-full border border-[var(--border)] text-sm font-bold hover:border-[var(--green)] hover:text-[var(--green)] transition-colors">Teklif Al</a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-[5%] text-center">
        <div className="max-w-2xl mx-auto border border-[var(--border)] bg-[var(--surface)] rounded-[28px] p-16">
          <div className="serif text-[clamp(40px,5.5vw,64px)] leading-tight tracking-tight mb-5">Okulunuzu bugün<br />dönüştürün.</div>
          <div className="text-[var(--muted)] text-lg mb-10 font-light">Kurulum 5 dakika. Kredi kartı gerekmez. İlk 30 gün ücretsiz.</div>
          <Link href="/kayit" className="inline-flex bg-[var(--green)] text-[#060a06] font-bold px-10 py-4 rounded-full hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(74,222,128,0.25)] transition-all">
            Ücretsiz Başla →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-[5%] py-10 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[var(--green)] flex items-center justify-center text-[#060a06] font-black text-xs">K</div>
          <span className="text-sm text-[var(--muted)]">© 2026 Kinderly. Tüm hakları saklıdır.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="text-sm text-[var(--muted)] hover:text-white transition-colors">Gizlilik</a>
          <a href="#" className="text-sm text-[var(--muted)] hover:text-white transition-colors">Kullanım Koşulları</a>
          <a href="mailto:info@kinderly.app" className="text-sm text-[var(--muted)] hover:text-white transition-colors">İletişim</a>
        </div>
      </footer>
    </main>
  )
}
