import Link from 'next/link'
import { RoiCalculator } from '@/components/roi-calculator'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf8f3] text-[#1e2d25] font-sans">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center justify-between px-[5%] bg-[rgba(250,248,243,0.85)] backdrop-blur-xl border-b border-[rgba(13,92,58,0.12)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0d5c3a] rounded-[10px] flex items-center justify-center text-lg">🌱</div>
          <span className="font-bold text-xl text-[#0f1a14] tracking-tight">Kinderly</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#roi" className="text-sm text-[#5a7265] hover:text-[#0d5c3a] font-medium transition-colors">ROI</a>
          <a href="#ozellikler" className="text-sm text-[#5a7265] hover:text-[#0d5c3a] font-medium transition-colors">Özellikler</a>
          <a href="#fiyatlar" className="text-sm text-[#5a7265] hover:text-[#0d5c3a] font-medium transition-colors">Fiyatlar</a>
        </div>
        <Link href="/giris" className="bg-[#0d5c3a] text-white px-5 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-[#1a7a50] transition-all hover:-translate-y-px">
          Panele Gir
        </Link>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex items-center pt-[120px] pb-20 px-[5%] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_40%,rgba(46,204,138,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-[620px] relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#e8f5ef] border border-[rgba(13,92,58,0.2)] rounded-full px-4 py-1.5 mb-7">
            <div className="w-1.5 h-1.5 bg-[#2ecc8a] rounded-full animate-pulse" />
            <span className="text-xs font-bold text-[#0d5c3a] uppercase tracking-wide">Türkiye&apos;nin #1 Anaokulu Platformu</span>
          </div>
          <h1 className="text-[clamp(42px,6vw,72px)] font-black leading-[1.05] text-[#0f1a14] mb-6 tracking-tight">
            Anaokulunu<br />
            <em className="not-italic text-[#0d5c3a]">akıllıca</em><br />
            yönet.
          </h1>
          <p className="text-lg text-[#5a7265] leading-relaxed mb-10 max-w-[500px] font-light">
            Yoklama, aktivite takibi, veli iletişimi ve aidat yönetimi — hepsi tek platformda. Öğretmenler için tasarlandı, veliler için sevindi.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/kayit" className="bg-[#0d5c3a] text-white px-8 py-4 rounded-[14px] text-base font-semibold hover:bg-[#1a7a50] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(13,92,58,0.25)] inline-flex items-center gap-2">
              Ücretsiz Dene →
            </Link>
            <a href="#ozellikler" className="text-[#1e2d25] text-sm font-medium hover:text-[#0d5c3a] transition-colors">
              Nasıl Çalışır? ↓
            </a>
          </div>
        </div>

        {/* Mockup */}
        <div className="hidden lg:block absolute right-[5%] top-1/2 -translate-y-1/2 w-[45%] max-w-[520px]">
          <div className="bg-white rounded-3xl p-6 shadow-[0_40px_120px_rgba(13,92,58,0.15),0_8px_32px_rgba(0,0,0,0.06)] border border-[rgba(13,92,58,0.08)]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#0d5c3a] rounded-lg flex items-center justify-center text-sm">🌱</div>
                <span className="font-bold text-sm text-[#0f1a14]">Kinderly</span>
              </div>
              <span className="text-xs text-[#5a7265]">11 Nisan, Cuma</span>
            </div>
            <div className="bg-[#e8f5ef] rounded-2xl p-4 flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-black text-[#0d5c3a]">87%</div>
                <div className="text-xs text-[#5a7265] mt-1">Bugün Devam Oranı — 26/30 öğrenci</div>
              </div>
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-xl">🏫</div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[['26','Geldi','#e8f5ef'],['14','Aktivite','#e8f0ff'],['3','Mesaj','#fef9e8'],['2','Duyuru','#fce8f3']].map(([v,l,bg]) => (
                <div key={l} className="rounded-xl p-3" style={{backgroundColor: bg}}>
                  <div className="text-lg font-black text-[#0f1a14]">{v}</div>
                  <div className="text-[10px] text-[#5a7265] mt-0.5">{l}</div>
                </div>
              ))}
            </div>
            {[['🍎','Ayşe Kaya','Öğle yemeği — hepsini yedi','12:30'],['😴','Ali Demir','Uyku — 90 dakika','13:15'],['⭐','Zeynep Çelik','Tebrik — Çok yardımsever!','14:00']].map(([emoji,name,desc,time]) => (
              <div key={name} className="flex items-center gap-3 py-2.5 border-b border-[rgba(13,92,58,0.06)] last:border-0">
                <div className="w-9 h-9 rounded-xl bg-[#e8f5ef] flex items-center justify-center text-base flex-shrink-0">{emoji}</div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-[#0f1a14]">{name}</div>
                  <div className="text-[10px] text-[#5a7265]">{desc}</div>
                </div>
                <div className="text-[10px] text-[#5a7265]">{time}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RoiCalculator />

      {/* FEATURES */}
      <section id="ozellikler" className="py-24 px-[5%]">
        <div className="text-xs font-bold text-[#0d5c3a] uppercase tracking-[1.5px] mb-4">Özellikler</div>
        <div className="text-[clamp(32px,4vw,48px)] font-black text-[#0f1a14] leading-tight mb-4 tracking-tight">Her şey tek ekranda.</div>
        <div className="text-lg text-[#5a7265] font-light max-w-[500px] leading-relaxed mb-14">
          Artık farklı araçlar arasında gidip gelmek yok. Kinderly ile okulunuzun tüm operasyonunu tek noktadan yönetin.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            ['✅','Yoklama','Saniyeler içinde yoklama alın. Geldi, gelmedi, izinli — tek dokunuşla. Veliler anında bildirim alır.','#e8f5ef'],
            ['⚡','Aktivite Takibi','Yemek, uyku, tuvalet, sağlık — her aktiviteyi kaydedin. Veliler günün her anından haberdar olsun.','#e8f0ff'],
            ['💬','Veli İletişimi','Öğretmen-veli mesajlaşması, toplu duyurular ve anlık bildirimler.','#fce8f3'],
            ['📷','Fotoğraf Paylaşımı','Gün içindeki özel anları doğrudan velilerle paylaşın.','#fef9e8'],
            ['💰','Aidat Yönetimi','Aidat takibi, ödeme geçmişi, gecikmiş ödemeler — hepsini tek panelden.','#e8f5ef'],
            ['📊','Raporlar','Günlük, haftalık ve aylık raporlar. Okul performansını analiz edin.','#e8eeff'],
          ].map(([icon,title,desc,bg]) => (
            <div key={title} className="bg-white rounded-[20px] p-7 border border-[rgba(13,92,58,0.08)] hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(13,92,58,0.1)] transition-all duration-300 group">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl mb-5" style={{backgroundColor: bg}}>{icon}</div>
              <h3 className="text-lg font-bold text-[#0f1a14] mb-2.5">{title}</h3>
              <p className="text-sm text-[#5a7265] leading-relaxed font-light">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="bg-[#0d5c3a] py-16">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[['500+','Aktif Okul'],['50K+','Öğrenci'],['98%','Memnuniyet'],['2M+','Aktivite']].map(([val,label],i) => (
            <div key={label} className={`py-10 text-center ${i < 3 ? 'border-r border-white/15' : ''}`}>
              <div className="text-4xl md:text-5xl font-black text-white mb-2">{val}</div>
              <div className="text-sm text-white/60">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="fiyatlar" className="py-24 px-[5%]">
        <div className="text-xs font-bold text-[#0d5c3a] uppercase tracking-[1.5px] mb-4">Fiyatlandırma</div>
        <div className="text-[clamp(32px,4vw,48px)] font-black text-[#0f1a14] leading-tight mb-4 tracking-tight">Şeffaf fiyatlar.</div>
        <div className="text-lg text-[#5a7265] font-light mb-14">Gizli ücret yok. İstediğiniz zaman iptal edin.</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl">
          <div className="bg-white rounded-3xl p-8 border border-[rgba(13,92,58,0.08)]">
            <div className="text-xs font-bold text-[#5a7265] uppercase tracking-widest mb-3">Başlangıç</div>
            <div className="text-5xl font-black text-[#0f1a14] mb-1">Ücretsiz</div>
            <div className="text-sm text-[#5a7265] mb-6">sonsuza kadar</div>
            <ul className="space-y-3 mb-8">
              {['50 öğrenciye kadar','Yoklama takibi','Temel mesajlaşma','Mobil uygulama'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-[#1e2d25]">
                  <span className="text-[#2ecc8a] font-bold">✓</span>{f}
                </li>
              ))}
            </ul>
            <Link href="/kayit" className="block w-full py-3.5 rounded-xl text-sm font-bold text-center border-2 border-[rgba(13,92,58,0.15)] text-[#1e2d25] hover:border-[#0d5c3a] hover:text-[#0d5c3a] transition-colors">
              Ücretsiz Başla
            </Link>
          </div>

          <div className="bg-[#0f1a14] rounded-3xl p-8 border border-[#0d5c3a] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2ecc8a] text-[#0f1a14] text-xs font-black px-4 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">En Popüler</div>
            <div className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Pro</div>
            <div className="text-5xl font-black text-white mb-1">₺499</div>
            <div className="text-sm text-white/40 mb-6">/ ay · tüm özellikler</div>
            <ul className="space-y-3 mb-8">
              {['Sınırsız öğrenci','Tüm aktivite türleri','Fotoğraf paylaşımı','Aidat yönetimi','Raporlar ve analizler','Öncelikli destek'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                  <span className="text-[#2ecc8a] font-bold">✓</span>{f}
                </li>
              ))}
            </ul>
            <Link href="/kayit" className="block w-full py-3.5 rounded-xl text-sm font-bold text-center bg-[#0d5c3a] text-white hover:bg-[#1a7a50] transition-colors">
              Hemen Başla
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-[rgba(13,92,58,0.08)]">
            <div className="text-xs font-bold text-[#5a7265] uppercase tracking-widest mb-3">Kurumsal</div>
            <div className="text-5xl font-black text-[#0f1a14] mb-1">Özel</div>
            <div className="text-sm text-[#5a7265] mb-6">çok şubeli kurumlar</div>
            <ul className="space-y-3 mb-8">
              {['Çoklu şube yönetimi','Özel entegrasyonlar','SLA garantisi','Dedicated destek'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-[#1e2d25]">
                  <span className="text-[#2ecc8a] font-bold">✓</span>{f}
                </li>
              ))}
            </ul>
            <a href="mailto:info@kinderly.app" className="block w-full py-3.5 rounded-xl text-sm font-bold text-center border-2 border-[rgba(13,92,58,0.15)] text-[#1e2d25] hover:border-[#0d5c3a] hover:text-[#0d5c3a] transition-colors">
              Teklif Al
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-[5%] text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-[clamp(36px,5vw,56px)] font-black text-[#0f1a14] leading-tight mb-5 tracking-tight">
            Okulunuzu bugün dönüştürün.
          </h2>
          <p className="text-lg text-[#5a7265] mb-10 font-light">Kurulum 5 dakika. Kredi kartı gerekmez. İlk 30 gün ücretsiz.</p>
          <Link href="/kayit" className="inline-flex items-center gap-2 bg-[#0d5c3a] text-white px-10 py-4 rounded-[14px] text-base font-semibold hover:bg-[#1a7a50] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(13,92,58,0.25)]">
            Ücretsiz Başla →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-[5%] py-12 border-t border-[rgba(13,92,58,0.12)] flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#0d5c3a] rounded-lg flex items-center justify-center text-sm">🌱</div>
          <span className="text-sm text-[#5a7265]">© 2026 Kinderly. Tüm hakları saklıdır.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="text-sm text-[#5a7265] hover:text-[#0d5c3a] transition-colors">Gizlilik</a>
          <a href="#" className="text-sm text-[#5a7265] hover:text-[#0d5c3a] transition-colors">Kullanım Koşulları</a>
          <a href="mailto:info@kinderly.app" className="text-sm text-[#5a7265] hover:text-[#0d5c3a] transition-colors">İletişim</a>
        </div>
      </footer>
    </main>
  )
}
