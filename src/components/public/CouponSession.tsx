'use client'

import { Suspense, useEffect } from 'react'
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
  const prefix = name + '='
  const part = document.cookie.split('; ').find(entry => entry.startsWith(prefix))
  if (!part) return null
  try { return decodeURIComponent(part.slice(prefix.length)) } catch { return part.slice(prefix.length) }
}

function CouponSessionContent({userId}:{userId:string|null}) {
  const searchParams = useSearchParams()
  const setCouponCode = useCartStore(state => state.setCouponCode)
  const currentCouponCode = useCartStore(state => state.couponCode)

  useEffect(() => {
    const queryCode = couponQueryKeys.map(key => searchParams.get(key)).map(extractCouponCode).find(Boolean)
    if (queryCode) {
      setCouponCode(queryCode)
      localStorage.setItem('saved_coupon', queryCode)
      return
    }

    let active = true
    const applyFallback = () => {
      if (!active) return
      const fallback = extractCouponCode(readCookie('zap_welcome_promo')) || extractCouponCode(localStorage.getItem('saved_coupon'))
      if (fallback) setCouponCode(fallback)
    }

    if (userId) {
      fetch('/api/perfil/assigned-coupon', {cache:'no-store'})
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (!active) return
          const assignedCode = extractCouponCode(data?.code)
          if (assignedCode && data?.available) {
            setCouponCode(assignedCode)
            localStorage.setItem('saved_coupon', assignedCode)
            return
          }
          if (assignedCode && !data?.available) {
            const savedCode = extractCouponCode(localStorage.getItem('saved_coupon'))
            if (currentCouponCode === assignedCode || savedCode === assignedCode) {
              setCouponCode(null)
              if (savedCode === assignedCode) localStorage.removeItem('saved_coupon')
              return
            }
          }
          applyFallback()
        })
        .catch(applyFallback)
    } else {
      applyFallback()
    }
    return () => { active = false }
  }, [searchParams, setCouponCode, currentCouponCode, userId])

  return null
}

/** Resolves explicit campaign links first, then the coupon assigned to the signed-in account. */
export default function CouponSession({userId=null}:{userId?:string|null}) {
  return <Suspense fallback={null}><CouponSessionContent userId={userId}/></Suspense>
}
