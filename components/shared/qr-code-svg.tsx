'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCodeSvg({
  value,
  size = 192,
  className = '',
}: {
  value: string
  size?: number
  className?: string
}) {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    let cancelled = false

    void QRCode.toString(value, {
      type: 'svg',
      width: size,
      margin: 1,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    }).then((nextSvg: string) => {
      if (!cancelled) setSvg(nextSvg)
    }).catch(() => {
      if (!cancelled) setSvg('')
    })

    return () => {
      cancelled = true
    }
  }, [size, value])

  if (!svg) {
    return (
      <div
        className={`flex items-center justify-center rounded-[28px] border border-slate-200 bg-white text-xs text-slate-400 ${className}`}
        style={{ width: size, height: size }}
      >
        QR hazırlanıyor...
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
