'use client'

import { AuthProvider } from '@/lib/auth'
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}
