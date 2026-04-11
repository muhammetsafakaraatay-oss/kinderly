'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

function formatMoney(value: number) {
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

type ConfettiPiece = {
  id: number
  left: string
  delay: string
  rotate: string
  duration: string
}

export function RoiCalculator() {
  const [studentCount, setStudentCount] = useState(120)
  const [hourlyCost, setHourlyCost] = useState(420)
  const [savedHours, setSavedHours] = useState(2.8)
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])

  const roi = useMemo(() => {
    const teamFactor = Math.max(studentCount / 70, 0.8)
    const monthlyHours = savedHours * 22 * teamFactor
    const yearlyHours = monthlyHours * 12
    const yearlyValue = yearlyHours * hourlyCost
    const yearlySubscription = 1000 * 12

    return {
      monthlyHours,
      yearlyHours,
      yearlyValue,
      roiMultiplier: yearlySubscription > 0 ? yearlyValue / yearlySubscription : 0,
      monthlyRecovered: monthlyHours * hourlyCost,
    }
  }, [hourlyCost, savedHours, studentCount])

  useEffect(() => {
    if (!confetti.length) return
    const timeout = window.setTimeout(() => setConfetti([]), 2200)
    return () => window.clearTimeout(timeout)
  }, [confetti])

  function fireConfetti() {
    const next = Array.from({ length: 18 }, (_, index) => ({
      id: index + Date.now(),
      left: `${8 + index * 5}%`,
      delay: `${index * 0.04}s`,
      rotate: `${-24 + index * 4}deg`,
      duration: `${1.5 + (index % 5) * 0.14}s`,
    }))
    setConfetti(next)
  }

  return (
    <section id="roi" className="px-[5%] py-24">
      <style>{`
        @keyframes roi-confetti {
          0% {
            transform: translate3d(0, -20px, 0) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          100% {
            transform: translate3d(0, 260px, 0) rotate(560deg);
            opacity: 0;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1400px] rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 backdrop-blur-xl md:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(74,222,128,0.1),rgba(74,222,128,0.03))] p-7">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--green-dim)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--green)]">
              <span className="h-2 w-2 rounded-full bg-[var(--green)]" />
              ROI Hesaplayıcı
            </div>
            <h2 className="serif text-[clamp(2.4rem,4vw,4.3rem)] leading-[0.96] tracking-[-0.04em] text-white">
              Kinderly ekibinize
              <br />
              ne kadar zaman ve
              <br />
              gelir geri kazandirir?
            </h2>
            <p className="mt-4 max-w-[620px] text-base leading-relaxed text-[var(--muted)] md:text-lg">
              Öğrenci sayısı, ekip maliyeti ve günlük kurtarılan süreye göre tahmini yıllık geri dönüşü canlı olarak görün.
            </p>

            <div className="mt-10 space-y-7">
              <label className="block">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-white">Öğrenci sayısı</span>
                  <span className="text-sm font-semibold text-[var(--green)]">{studentCount}</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="500"
                  step="5"
                  value={studentCount}
                  onChange={(event) => setStudentCount(Number(event.target.value))}
                  className="w-full accent-[#4ade80]"
                />
              </label>

              <label className="block">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-white">Saatlik ekip maliyeti</span>
                  <span className="text-sm font-semibold text-[var(--green)]">{formatMoney(hourlyCost)}</span>
                </div>
                <input
                  type="range"
                  min="180"
                  max="900"
                  step="20"
                  value={hourlyCost}
                  onChange={(event) => setHourlyCost(Number(event.target.value))}
                  className="w-full accent-[#4ade80]"
                />
              </label>

              <label className="block">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-white">Günlük kazanılan süre</span>
                  <span className="text-sm font-semibold text-[var(--green)]">{formatNumber(savedHours)} saat</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={savedHours}
                  onChange={(event) => setSavedHours(Number(event.target.value))}
                  className="w-full accent-[#4ade80]"
                />
              </label>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[20px] border border-[var(--border)] bg-black/20 p-7">
            {confetti.map((piece) => (
              <span
                key={piece.id}
                className="pointer-events-none absolute top-0 h-3 w-2 rounded-full bg-[var(--green)]"
                style={{
                  left: piece.left,
                  animation: `roi-confetti ${piece.duration} ease-out ${piece.delay} forwards`,
                  transform: `rotate(${piece.rotate})`,
                  boxShadow: '0 0 18px rgba(74,222,128,0.35)',
                }}
              />
            ))}

            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Tahmini geri dönüş</div>
                <div className="mt-2 serif text-5xl text-[var(--green)]">{formatMoney(roi.yearlyValue)}</div>
              </div>
              <div className="rounded-full border border-[var(--border)] bg-[var(--green-dim)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--green)]">
                {formatNumber(roi.roiMultiplier)}x ROI
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Aylık geri kazanılan süre</div>
                <div className="mt-2 serif text-4xl text-white">{formatNumber(roi.monthlyHours)} saat</div>
              </div>
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Aylık parasal karşılık</div>
                <div className="mt-2 serif text-4xl text-white">{formatMoney(roi.monthlyRecovered)}</div>
              </div>
            </div>

            <div className="mt-5 rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Yıllık saat tasarrufu</span>
                <span className="font-semibold text-white">{formatNumber(roi.yearlyHours)} saat</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]">
                <div
                  className="h-2 rounded-full bg-[var(--green)]"
                  style={{ width: `${Math.min(roi.roiMultiplier * 22, 100)}%` }}
                />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
                Bu model; yoklama, günlük aktivite girişi, veli mesajlaşması, duyuru ve aidat operasyonunda azalan manuel işi baz alır.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={fireConfetti}
                className="rounded-full bg-[var(--green)] px-6 py-4 text-sm font-bold text-[#060a06] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(74,222,128,0.22)]"
              >
                Kazancı kutla
              </button>
              <Link
                href="/kayit"
                className="rounded-full border border-[var(--border)] px-6 py-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/5"
              >
                Bu planla başla
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
