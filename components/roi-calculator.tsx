'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 1,
  }).format(value)
}

export function RoiCalculator() {
  const [studentCount, setStudentCount] = useState(85)
  const [hourlyCost, setHourlyCost] = useState(325)
  const [dailySavedHours, setDailySavedHours] = useState(2.5)

  const roi = useMemo(() => {
    const scale = Math.max(studentCount / 75, 0.6)
    const monthlyHoursSaved = dailySavedHours * 22 * scale
    const yearlyHoursSaved = monthlyHoursSaved * 12
    const yearlySavings = yearlyHoursSaved * hourlyCost

    return {
      monthlyHoursSaved,
      yearlyHoursSaved,
      yearlySavings,
    }
  }, [dailySavedHours, hourlyCost, studentCount])

  return (
    <section id="roi" className="px-[5%] py-24">
      <div className="rounded-[36px] bg-[#0f1a14] overflow-hidden border border-[rgba(46,204,138,0.18)] shadow-[0_40px_120px_rgba(15,26,20,0.24)]">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-8 md:p-12 lg:p-14">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(46,204,138,0.12)] border border-[rgba(46,204,138,0.24)] px-4 py-1.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-[#2ecc8a]" />
              <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#9de7c2]">
                ROI Hesaplayici
              </span>
            </div>

            <h2 className="text-[clamp(32px,4vw,54px)] font-black leading-[1.05] tracking-tight text-white mb-4">
              Kinderly size
              <br />
              ne kadar zaman kazandirir?
            </h2>

            <p className="max-w-[540px] text-base md:text-lg leading-relaxed text-white/68 mb-10 font-light">
              Ortalama bir anaokulunda yoklama, veli bilgilendirmesi, fotograf paylasimi ve gunluk kayitlar
              icin harcanan zamani hesaplayin. Ciktiniz dogrudan okul yonetimi ve personel maliyeti uzerinden
              hazirlandi.
            </p>

            <div className="space-y-6">
              <label className="block">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-sm font-semibold text-white/80">Ogrenci sayiniz</span>
                  <span className="text-lg font-black text-[#9de7c2]">{studentCount}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  step="5"
                  value={studentCount}
                  onChange={(event) => setStudentCount(Number(event.target.value))}
                  className="w-full accent-[#2ecc8a]"
                />
              </label>

              <label className="block">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-sm font-semibold text-white/80">Personel saatlik maliyeti</span>
                  <span className="text-lg font-black text-[#9de7c2]">{formatCurrency(hourlyCost)}</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="800"
                  step="25"
                  value={hourlyCost}
                  onChange={(event) => setHourlyCost(Number(event.target.value))}
                  className="w-full accent-[#2ecc8a]"
                />
              </label>

              <label className="block">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-sm font-semibold text-white/80">Gunde kurtaracaginiz sure</span>
                  <span className="text-lg font-black text-[#9de7c2]">{formatNumber(dailySavedHours)} saat</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={dailySavedHours}
                  onChange={(event) => setDailySavedHours(Number(event.target.value))}
                  className="w-full accent-[#2ecc8a]"
                />
              </label>
            </div>
          </div>

          <div className="bg-[linear-gradient(180deg,rgba(46,204,138,0.10)_0%,rgba(46,204,138,0.02)_100%)] p-8 md:p-12 lg:p-14 border-t lg:border-t-0 lg:border-l border-[rgba(46,204,138,0.16)]">
            <div className="rounded-[28px] bg-white p-7 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
              <div className="text-xs font-bold uppercase tracking-[1.5px] text-[#0d5c3a] mb-4">
                Tahmini Kazanc
              </div>

              <div className="grid gap-4 mb-8">
                <div className="rounded-2xl bg-[#f4fbf7] p-5 border border-[rgba(13,92,58,0.08)]">
                  <div className="text-sm text-[#5a7265] mb-1">Aylik tasarruf</div>
                  <div className="text-3xl font-black text-[#0f1a14]">
                    {formatNumber(roi.monthlyHoursSaved)} saat
                  </div>
                </div>

                <div className="rounded-2xl bg-[#fff7ea] p-5 border border-[rgba(181,118,20,0.10)]">
                  <div className="text-sm text-[#7b5a1a] mb-1">Yillik personel maliyeti kazanci</div>
                  <div className="text-3xl font-black text-[#0f1a14]">
                    {formatCurrency(roi.yearlySavings)}
                  </div>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-[#5a7265] mb-6">
                Bu hesap; yoklama, gunluk aktivite girisi, veli mesajlasmasi ve fotograf paylasimindaki manuel isi
                azaltarak elde edilen zaman kazancina gore tahmini olarak hesaplanir.
              </p>

              <div className="space-y-3">
                <Link
                  href="/kayit"
                  className="flex items-center justify-center rounded-2xl bg-[#0d5c3a] px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-[#1a7a50]"
                >
                  Hesabimla denemeye basla
                </Link>
                <a
                  href="mailto:info@kinderly.app?subject=Kinderly%20ROI%20Demo"
                  className="flex items-center justify-center rounded-2xl border border-[rgba(13,92,58,0.14)] px-5 py-4 text-sm font-bold text-[#0f1a14] transition-colors hover:border-[#0d5c3a] hover:text-[#0d5c3a]"
                >
                  Sonucu ekibime goster
                </a>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6">
              {[
                ['22', 'is gunu / ay'],
                ['3', 'ana is akisinda otomasyon'],
                [formatNumber(roi.yearlyHoursSaved), 'yillik saat kazanci'],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-white/4 p-4 text-center"
                >
                  <div className="text-xl font-black text-white">{value}</div>
                  <div className="text-[11px] uppercase tracking-[1.2px] text-white/52 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
