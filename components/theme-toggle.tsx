'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--card)] text-[var(--text)] shadow-sm"
        aria-label="Tema değiştir"
      >
        ☀️
      </button>
    )
  }

  const dark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--card)] text-[var(--text)] shadow-sm transition hover:scale-[1.02]"
      aria-label="Tema değiştir"
      title="Tema değiştir"
    >
      <span className="text-lg">{dark ? '☀️' : '🌙'}</span>
    </button>
  )
}
