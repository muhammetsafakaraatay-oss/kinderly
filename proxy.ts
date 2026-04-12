import { NextRequest, NextResponse } from 'next/server'

function getSchoolSlug(hostname: string) {
  const normalizedHost = hostname.split(':')[0].toLowerCase()
  if (!normalizedHost.endsWith('.kinderx.app')) return null

  const slug = normalizedHost.replace('.kinderx.app', '')
  if (!slug || slug === 'www') return null

  return slug
}

export function proxy(request: NextRequest) {
  const slug = getSchoolSlug(request.headers.get('host') || '')
  if (!slug) return NextResponse.next()

  const pathname = request.nextUrl.pathname
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith(`/${slug}`)
  ) {
    return NextResponse.next()
  }

  const rewriteUrl = request.nextUrl.clone()

  if (pathname === '/') {
    rewriteUrl.pathname = `/${slug}/admin`
    return NextResponse.rewrite(rewriteUrl)
  }

  if (pathname === '/admin' || pathname === '/ogretmen' || pathname === '/veli') {
    rewriteUrl.pathname = `/${slug}${pathname}`
    return NextResponse.rewrite(rewriteUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!.*\\..*).*)'],
}
