import { NextRequest, NextResponse } from 'next/server'

const AUTH_COOKIE_NAME = 'kinderly_has_session'

function isProtectedPath(pathname: string) {
  return /^\/[^/]+\/(admin|ogretmen|veli)(\/.*)?$/.test(pathname)
}

function getSchoolSlug(hostname: string) {
  const normalizedHost = hostname.split(':')[0].toLowerCase()
  if (!normalizedHost.endsWith('.kinderx.app')) return null

  const slug = normalizedHost.replace('.kinderx.app', '')
  if (!slug || slug === 'www') return null

  return slug
}

export function proxy(request: NextRequest) {
  const slug = getSchoolSlug(request.headers.get('host') || '')
  const pathname = request.nextUrl.pathname

  if (isProtectedPath(pathname) && !request.cookies.get(AUTH_COOKIE_NAME)?.value) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/giris'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (!slug) return NextResponse.next()
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
    if (!request.cookies.get(AUTH_COOKIE_NAME)?.value) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/giris'
      loginUrl.searchParams.set('redirect', `/${slug}${pathname}`)
      return NextResponse.redirect(loginUrl)
    }
    rewriteUrl.pathname = `/${slug}${pathname}`
    return NextResponse.rewrite(rewriteUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!.*\\..*).*)'],
}
