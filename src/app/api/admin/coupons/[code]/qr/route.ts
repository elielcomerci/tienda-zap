import QRCode from 'qrcode'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { buildCouponLandingUrl, getCouponPresenterName, normalizeCouponCode } from '@/lib/coupons'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function stripSvgWrapper(svg: string) {
  return svg
    .replace(/<\?xml[^>]*>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim()
}

function compactLabel(value: string, maxLength = 34) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized
}

function buildPremiumCouponCard(input: {
  qrSvg: string
  code: string
  payload: string
  promotionName: string
  discountLabel: string
  companyName: string
  personName?: string | null
  expiresAt?: Date | null
}) {
  const qrInner = stripSvgWrapper(input.qrSvg)
  const companyName = escapeXml(compactLabel(input.companyName, 36))
  const personName = input.personName ? escapeXml(compactLabel(input.personName, 38)) : null
  const promotionName = escapeXml(compactLabel(input.promotionName, 42))
  const code = escapeXml(input.code)
  const payload = escapeXml(input.payload)
  const discountLabel = escapeXml(input.discountLabel)
  const expiresLabel = input.expiresAt
    ? `Valido hasta ${input.expiresAt.toLocaleDateString('es-AR')}`
    : 'Beneficio sujeto a disponibilidad y condiciones vigentes'

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1500" viewBox="0 0 1080 1500" role="img" aria-label="Tarjeta premium de cupon ${code}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0F172A"/>
      <stop offset="0.48" stop-color="#111827"/>
      <stop offset="1" stop-color="#ED2C71"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFF2B8"/>
      <stop offset="0.45" stop-color="#D7A84F"/>
      <stop offset="1" stop-color="#8B5E1F"/>
    </linearGradient>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#F8FAFC"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="32" stdDeviation="34" flood-color="#020617" flood-opacity="0.32"/>
    </filter>
    <pattern id="micro" width="34" height="34" patternUnits="userSpaceOnUse">
      <path d="M0 34 L34 0" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1080" height="1500" rx="0" fill="url(#bg)"/>
  <rect width="1080" height="1500" fill="url(#micro)"/>
  <circle cx="944" cy="130" r="230" fill="#FFFFFF" opacity="0.08"/>
  <circle cx="106" cy="1390" r="280" fill="#FFFFFF" opacity="0.07"/>

  <g filter="url(#shadow)">
    <rect x="82" y="82" width="916" height="1336" rx="54" fill="url(#paper)"/>
    <rect x="105" y="105" width="870" height="1290" rx="42" fill="none" stroke="url(#gold)" stroke-width="4"/>
  </g>

  <g transform="translate(146 150)">
    <text x="0" y="0" fill="#0F172A" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="900" letter-spacing="5">ZAP</text>
    <text x="0" y="38" fill="#64748B" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="3">AGENCIA CREATIVA</text>
    <rect x="612" y="-28" width="176" height="48" rx="24" fill="#FEF1F6"/>
    <text x="700" y="3" text-anchor="middle" fill="#C91F5B" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="900" letter-spacing="2">BENEFICIO</text>
  </g>

  <g transform="translate(146 286)">
    <text x="394" y="0" text-anchor="middle" fill="#64748B" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800" letter-spacing="4">CUPON EXCLUSIVO</text>
    <text x="394" y="70" text-anchor="middle" fill="#0F172A" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="950">${companyName}</text>
    ${personName ? `<text x="394" y="116" text-anchor="middle" fill="#475569" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700">Para ${personName}</text>` : ''}
    <rect x="214" y="${personName ? 154 : 126}" width="360" height="66" rx="33" fill="#0F172A"/>
    <text x="394" y="${personName ? 197 : 169}" text-anchor="middle" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900">${discountLabel}</text>
  </g>

  <g transform="translate(260 575)">
    <rect x="0" y="0" width="560" height="560" rx="44" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
    <rect x="48" y="48" width="464" height="464" rx="26" fill="#FFFFFF"/>
    <g transform="translate(60 60) scale(0.859375)">
      ${qrInner}
    </g>
  </g>

  <g transform="translate(146 1206)">
    <text x="394" y="0" text-anchor="middle" fill="#0F172A" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="900">${promotionName}</text>
    <text x="394" y="48" text-anchor="middle" fill="#64748B" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700">Escanea el QR o usa el codigo</text>
    <rect x="207" y="78" width="374" height="60" rx="30" fill="#F1F5F9" stroke="#CBD5E1"/>
    <text x="394" y="116" text-anchor="middle" fill="#0F172A" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="900" letter-spacing="2">${code}</text>
    <text x="394" y="174" text-anchor="middle" fill="#94A3B8" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="700">${escapeXml(expiresLabel)}</text>
    <text x="394" y="206" text-anchor="middle" fill="#CBD5E1" font-family="Inter, Arial, sans-serif" font-size="11">${payload}</text>
  </g>
</svg>`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return new Response('Unauthorized', { status: 401 })
  }

  const { code } = await params
  const normalizedCode = normalizeCouponCode(code)
  const coupon = await prisma.promotionCoupon.findUnique({
    where: { code: normalizedCode },
    include: {
      promotion: {
        select: {
          qrBaseUrl: true,
          name: true,
          discountKind: true,
          discountValue: true,
        },
      },
    },
  })

  if (!coupon) {
    return new Response('Coupon not found', { status: 404 })
  }

  const payload =
    coupon.qrPayload ||
    buildCouponLandingUrl(
      coupon.code,
      coupon.promotion.qrBaseUrl || `${req.nextUrl.protocol}//${req.nextUrl.host}`
    )

  const svg = await QRCode.toString(payload, {
    type: 'svg',
    margin: 2,
    width: 512,
    errorCorrectionLevel: 'M',
  })
  const presenterName = getCouponPresenterName(coupon)
  const companyName = presenterName || coupon.batchName || coupon.promotion.name || 'ZAP Beneficios'
  const personName =
    coupon.recipientName &&
    coupon.recipientBusiness &&
    coupon.recipientName.trim().toLowerCase() !== coupon.recipientBusiness.trim().toLowerCase()
      ? coupon.recipientName
      : null
  const discountLabel =
    coupon.promotion.discountKind === 'PERCENTAGE'
      ? `${coupon.promotion.discountValue}% OFF`
      : `$${coupon.promotion.discountValue.toLocaleString('es-AR')} OFF`
  const cardSvg = buildPremiumCouponCard({
    qrSvg: svg,
    code: coupon.code,
    payload,
    promotionName: coupon.promotion.name,
    discountLabel,
    companyName,
    personName,
    expiresAt: coupon.expiresAt,
  })

  return new Response(cardSvg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `attachment; filename="${coupon.code}-tarjeta.svg"`,
    },
  })
}
