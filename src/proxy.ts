import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl
  let res = NextResponse.next()

  if (pathname.startsWith('/admin')) {
    if (!req.auth || req.auth.user?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  const ref = searchParams.get('ref')
  if (ref) {
    res.cookies.set('zap_seller_ref', ref, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      httpOnly: true,
      sameSite: 'lax',
    })
  }

  const promoCode = searchParams.get('c') || searchParams.get('coupon') || searchParams.get('promo')
  if (promoCode) {
    res.cookies.set('zap_welcome_promo', promoCode, {
      path: '/',
      maxAge: 60 * 60 * 24, // 1 dia, igual se oculta en el cliente por localStorage
      httpOnly: false, // false porque la necesita leer el cliente
      sameSite: 'lax',
    })
  }

  return res
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
