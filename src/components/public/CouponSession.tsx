'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'

const couponQueryKeys = ['coupon', 'couponCode', 'code', 'promo', 'voucher', 'c'] as const

export function extractCouponCode(value: string | null | undefined) {
  const rawValue = value?.trim()
  if (!rawValue) return null

  try {
    const url = new URL(rawValue)
    for (const key of couponQueryKeys) {
      const code = url.searchParams.get(key)
      if (code) return extractCouponCode(code)
    }

    const pathMatch = url.pathname.match(/\/(?:cupon|coupon|promo)\/([^/?#]+)/i)
    if (pathMatch?.[1]) return extractCouponCode(pathMatch[1])
  } catch {
    // A plain coupon code is the normal case.
  }

  const normalized = rawValue.toUpperCase().replace(/\s+/g, '').replace(/_/g, '-')
  return /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized) && normalized.length >= 4 && normalized.length <= 40
    ? normalized
    : null
}

function readCookie(name: string) {
  const prefix = `${name}=`
  const part = document.cookie.split('; ').find((entry) => entry.startsWith(prefix))
  if (!part) return null

  try {
    return decodeURIComponent(part.slice(prefix.length))
  } catch {
    return part.slice(prefix.length)
  }
}

function CouponSessionContent() {
  const searchParams = useSearchParams()
  const setCouponCode = useCartStore((state) => state.setCouponCode)
  const hydrated = useRef(false)

  useEffect(() => {
    const queryCode = couponQueryKeys
      .map((key) => searchParams.get(key))
      .map(extractCouponCode)
      .find(Boolean)

    const couponCode =
      queryCode ||
      extractCouponCode(readCookie('zap_welcome_promo')) ||
      extractCouponCode(localStorage.getItem('saved_coupon'))

    if (!couponCode) {
      hydrated.current = true
      return
    }

    // A query string deliberately wins over a previously saved campaign code.
    if (!hydrated.current || queryCode) {
      setCouponCode(couponCode)
      localStorage.setItem('saved_coupon', couponCode)
    }
    hydrated.current = true
  }, [searchParams, setCouponCode])

  return null
}

/** Keeps coupon links, QR scans and the shared .zap.com.ar cookie in one cart session. */
export default function CouponSession() {
  return (
    <Suspense fallback={null}>
      <CouponSessionContent />
    </Suspense>
  )
}
