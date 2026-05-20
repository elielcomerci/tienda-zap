import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { Prisma } from '@prisma/client'
import { buildCouponLandingUrl, getCouponPresenterName } from '@/lib/coupons'
import { ZAP_LOGO_B64 } from '@/lib/logo-base64'

type CouponPdfPromotion = {
  name: string
  qrBaseUrl: string | null
  discountKind: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  welcomeLogoUrl?: string | null
  audienceLabel?: string | null
}

export type CouponPdfRecord = {
  code: string
  recipientName: string | null
  recipientBusiness: string | null
  batchName: string | null
  qrPayload: string | null
  metadata: Prisma.JsonValue | null
  expiresAt: Date | null
  promotion: CouponPdfPromotion
}

type CouponCardData = {
  code: string
  presenterName: string
  personName: string | null
  audienceLabel: string | null
  discountLabel: string
  discountSubtitle: string
  expiresLabel: string
  qrDataUrl: string
  clientLogoDataUrl: string | null
}

/* ── Design tokens ── */
const CARD_WIDTH = 90
const CARD_HEIGHT = 128
const ZAP_PINK = '#ED2C71'
const ZAP_BLUE = '#4576B9'
const ZAP_PURPLE = '#9951A1'
const INK = '#111111'
const MUTED = '#999999'
const MUTED_LIGHT = '#BBBBBB'
const CUT_COLOR = '#CCCCCC'

/* ── Helpers ── */

function compactLabel(value: string, maxLength = 36) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized
}

function getDiscountLabel(promotion: CouponPdfPromotion): { main: string; subtitle: string } {
  if (promotion.discountKind === 'PERCENTAGE') {
    return {
      main: `${promotion.discountValue}% off`,
      subtitle: 'en tu próxima compra',
    }
  }
  return {
    main: `$${promotion.discountValue.toLocaleString('es-AR')} off`,
    subtitle: 'en tu próxima compra',
  }
}

function getPersonName(coupon: CouponPdfRecord) {
  if (
    coupon.recipientName &&
    coupon.recipientBusiness &&
    coupon.recipientName.trim().toLowerCase() !== coupon.recipientBusiness.trim().toLowerCase()
  ) {
    return coupon.recipientName
  }

  return null
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function setFitFont(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'bold'
) {
  let size = startSize
  doc.setFont('helvetica', style)
  doc.setFontSize(size)

  while (size > minSize && doc.getTextWidth(text) > maxWidth) {
    size -= 0.3
    doc.setFontSize(size)
  }
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'image/*' },
    })
    clearTimeout(timeout)

    if (!response.ok) return null

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/png'
    const base64 = Buffer.from(buffer).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}

/* ── Data builder ── */

export async function buildCouponCardData(
  coupon: CouponPdfRecord,
  fallbackBaseUrl: string
): Promise<CouponCardData> {
  const payload =
    coupon.qrPayload ||
    buildCouponLandingUrl(coupon.code, coupon.promotion.qrBaseUrl || fallbackBaseUrl)
  const presenterName =
    getCouponPresenterName(coupon) || coupon.batchName || coupon.promotion.name || 'Beneficio ZAP'
  const qrDataUrl = await QRCode.toDataURL(payload, {
    margin: 1,
    width: 720,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111111',
      light: '#FFFFFF',
    },
  })

  // Try to fetch client logo
  let clientLogoDataUrl: string | null = null
  if (coupon.promotion.welcomeLogoUrl) {
    clientLogoDataUrl = await fetchImageAsDataUrl(coupon.promotion.welcomeLogoUrl)
  }

  const discount = getDiscountLabel(coupon.promotion)

  return {
    code: coupon.code,
    presenterName,
    personName: getPersonName(coupon),
    audienceLabel: coupon.promotion.audienceLabel || null,
    discountLabel: discount.main,
    discountSubtitle: discount.subtitle,
    expiresLabel: coupon.expiresAt
      ? `Válido hasta el ${coupon.expiresAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : 'Beneficio sujeto a condiciones vigentes',
    qrDataUrl,
    clientLogoDataUrl,
  }
}

/* ── Drawing primitives ── */

function drawGradientBar(doc: jsPDF, x: number, y: number, width: number, height: number) {
  const steps = 20
  const stepWidth = width / steps
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    // Interpolate from pink to blue through purple
    const r = Math.round(237 + (69 - 237) * t)
    const g = Math.round(44 + (118 - 44) * t)
    const b = Math.round(113 + (185 - 113) * t)
    doc.setFillColor(r, g, b)
    doc.rect(x + i * stepWidth, y, stepWidth + 0.1, height, 'F')
  }
}

function drawRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: 'F' | 'S' | 'FD' = 'F'
) {
  doc.roundedRect(x, y, w, h, r, r, style)
}

function drawQrCorners(doc: jsPDF, x: number, y: number, size: number, cornerLen: number) {
  const lineWidth = 0.6

  // Top-left (pink)
  doc.setDrawColor(ZAP_PINK)
  doc.setLineWidth(lineWidth)
  doc.line(x, y + cornerLen, x, y)
  doc.line(x, y, x + cornerLen, y)

  // Top-right (blue)
  doc.setDrawColor(ZAP_BLUE)
  doc.line(x + size - cornerLen, y, x + size, y)
  doc.line(x + size, y, x + size, y + cornerLen)

  // Bottom-left (pink)
  doc.setDrawColor(ZAP_PINK)
  doc.line(x, y + size - cornerLen, x, y + size)
  doc.line(x, y + size, x + cornerLen, y + size)

  // Bottom-right (blue)
  doc.setDrawColor(ZAP_BLUE)
  doc.line(x + size - cornerLen, y + size, x + size, y + size)
  doc.line(x + size, y + size - cornerLen, x + size, y + size)
}

function drawCutLine(doc: jsPDF, x: number, y: number, width: number) {
  doc.setDrawColor(CUT_COLOR)
  doc.setLineWidth(0.15)
  doc.setLineDashPattern([1.5, 1], 0)
  doc.line(x + 8, y, x + width, y)
  doc.setLineDashPattern([], 0)

  // Scissors icon (small "✂")
  doc.setFontSize(5)
  doc.setTextColor(CUT_COLOR)
  doc.setFont('helvetica', 'normal')
  doc.text('✂', x + 3.5, y + 1.2)
}

function drawInitialsLogo(
  doc: jsPDF,
  initials: string,
  cx: number,
  cy: number,
  size: number
) {
  const half = size / 2
  const radius = 3

  // Dark rounded background
  doc.setFillColor(INK)
  drawRoundedRect(doc, cx - half, cy - half, size, size, radius, 'F')

  // Initials text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size * 0.42)
  doc.setTextColor('#FFFFFF')
  doc.text(initials, cx, cy + size * 0.15, { align: 'center' })
}

/* ── Main coupon drawing ── */

export function drawCoupon(
  doc: jsPDF,
  card: CouponCardData,
  x: number,
  y: number,
  width = CARD_WIDTH,
  height = CARD_HEIGHT
) {
  const scale = Math.min(width / CARD_WIDTH, height / CARD_HEIGHT)
  const sx = (v: number) => x + v * scale
  const sy = (v: number) => y + v * scale
  const sw = (v: number) => v * scale

  // ── White card background ──
  doc.setFillColor('#FFFFFF')
  doc.rect(x, y, width, height, 'F')

  // ── Fine border ──
  doc.setDrawColor(232, 232, 232)
  doc.setLineWidth(0.15)
  doc.rect(x, y, width, height, 'S')

  // ── Gradient bar top ──
  drawGradientBar(doc, x, y, width, sw(1.5))

  // ── Agency branding (top-right, subtle) ──
  const logoSize = sw(5)
  doc.addImage(ZAP_LOGO_B64, 'PNG', sx(75), sy(4), logoSize, logoSize, undefined, 'FAST')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(sw(2.8))
  doc.setTextColor(180, 180, 180)
  doc.text('ZAP', sx(81), sy(11), { align: 'center' })

  // ── Client logo or initials ──
  const logoCenterX = sx(45)
  const logoY = sy(16)
  const clientLogoSize = sw(17)

  if (card.clientLogoDataUrl) {
    try {
      // Rounded border placeholder
      doc.setDrawColor(230, 230, 230)
      doc.setLineWidth(0.15)
      drawRoundedRect(
        doc,
        logoCenterX - clientLogoSize / 2,
        logoY,
        clientLogoSize,
        clientLogoSize,
        sw(3.5),
        'S'
      )
      doc.addImage(
        card.clientLogoDataUrl,
        'PNG',
        logoCenterX - clientLogoSize / 2 + sw(0.5),
        logoY + sw(0.5),
        clientLogoSize - sw(1),
        clientLogoSize - sw(1),
        undefined,
        'FAST'
      )
    } catch {
      // Fallback to initials
      drawInitialsLogo(doc, getInitials(card.presenterName), logoCenterX, logoY + clientLogoSize / 2, clientLogoSize)
    }
  } else {
    drawInitialsLogo(doc, getInitials(card.presenterName), logoCenterX, logoY + clientLogoSize / 2, clientLogoSize)
  }

  // ── Business name ──
  const nameY = logoY + clientLogoSize + sw(5)
  doc.setTextColor(INK)
  setFitFont(doc, compactLabel(card.presenterName, 30), sw(70), sw(5), sw(3.5), 'bold')
  doc.text(compactLabel(card.presenterName, 30), sx(45), nameY, { align: 'center' })

  // ── Subtitle (audience label or person name) ──
  const subtitle = card.audienceLabel || card.personName || ''
  if (subtitle) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(sw(3.2))
    doc.setTextColor(MUTED)
    doc.text(compactLabel(subtitle, 35), sx(45), nameY + sw(4.5), { align: 'center' })
  }

  // ── Benefit block ──
  const benefitY = nameY + sw(subtitle ? 12 : 9)

  // Main discount label (large, pink ZAP color)
  doc.setTextColor(ZAP_PINK)
  setFitFont(doc, card.discountLabel, sw(60), sw(10), sw(6), 'bold')
  doc.text(card.discountLabel, sx(45), benefitY, { align: 'center' })

  // Discount subtitle
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(sw(3.8))
  doc.setTextColor(ZAP_BLUE)
  doc.text(card.discountSubtitle, sx(45), benefitY + sw(5.5), { align: 'center' })

  // Benefit description
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(sw(3))
  doc.setTextColor(MUTED)
  doc.text('Presentá este cupón antes de finalizar la compra.', sx(45), benefitY + sw(11), {
    align: 'center',
    maxWidth: sw(70),
  })

  // ── Cut line ──
  const cutY = sy(83)
  drawCutLine(doc, x, cutY, width)

  // ── QR section ──
  const qrSize = sw(22)
  const qrX = sx(45) - qrSize / 2
  const qrY = cutY + sw(5)

  // QR corners
  drawQrCorners(doc, qrX - sw(2), qrY - sw(2), qrSize + sw(4), sw(3))

  // QR image
  doc.addImage(card.qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST')

  // ── Code ──
  const codeY = qrY + qrSize + sw(5)
  doc.setTextColor(ZAP_PINK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(sw(3.5))
  doc.text(card.code, sx(45), codeY, { align: 'center' })

  // ── Expiry ──
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(sw(2.8))
  doc.setTextColor(MUTED_LIGHT)
  doc.text(card.expiresLabel, sx(45), codeY + sw(4), { align: 'center', maxWidth: sw(70) })
}

// Keep legacy exports for backward compatibility
export const drawCouponFront = drawCoupon
export function drawCouponBack(
  doc: jsPDF,
  card: CouponCardData,
  x: number,
  y: number,
  width = CARD_WIDTH,
  height = CARD_HEIGHT
) {
  // No-op: single-face design, back is no longer needed
  // Kept for backward compatibility in case external code calls it
  drawCoupon(doc, card, x, y, width, height)
}

/* ── Single coupon PDF ── */

export async function createSingleCouponPdf(coupon: CouponPdfRecord, fallbackBaseUrl: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [CARD_WIDTH, CARD_HEIGHT] })
  const card = await buildCouponCardData(coupon, fallbackBaseUrl)
  drawCoupon(doc, card, 0, 0)
  return Buffer.from(doc.output('arraybuffer'))
}

/* ── Sheet of coupons (batch PDF) ── */

function drawSheetGuides(doc: jsPDF, positions: Array<{ x: number; y: number }>) {
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.1)
  doc.setLineDashPattern([2, 2], 0)

  // Vertical guides
  const verticalXs = new Set<number>()
  for (const pos of positions) {
    verticalXs.add(pos.x)
    verticalXs.add(pos.x + CARD_WIDTH)
  }
  for (const gx of verticalXs) {
    doc.line(gx, 5, gx, 292)
  }

  // Horizontal guides
  const horizontalYs = new Set<number>()
  for (const pos of positions) {
    horizontalYs.add(pos.y)
    horizontalYs.add(pos.y + CARD_HEIGHT)
  }
  for (const gy of horizontalYs) {
    doc.line(5, gy, 205, gy)
  }

  doc.setLineDashPattern([], 0)
}

export async function createCouponSheetPdf(coupons: CouponPdfRecord[], fallbackBaseUrl: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // A4 is 210×297mm. With 90×128mm coupons: 2 columns × 2 rows = 4 per page
  const marginX = (210 - 2 * CARD_WIDTH) / 2  // ~15mm
  const marginY = (297 - 2 * CARD_HEIGHT) / 2 // ~20.5mm
  const positions = [
    { x: marginX, y: marginY },
    { x: marginX + CARD_WIDTH, y: marginY },
    { x: marginX, y: marginY + CARD_HEIGHT },
    { x: marginX + CARD_WIDTH, y: marginY + CARD_HEIGHT },
  ]

  const couponsPerPage = 4

  for (let pageStart = 0; pageStart < coupons.length; pageStart += couponsPerPage) {
    if (pageStart > 0) doc.addPage('a4', 'portrait')
    const group = coupons.slice(pageStart, pageStart + couponsPerPage)
    drawSheetGuides(doc, positions)

    for (let index = 0; index < group.length; index += 1) {
      const card = await buildCouponCardData(group[index], fallbackBaseUrl)
      const pos = positions[index]
      drawCoupon(doc, card, pos.x, pos.y)
    }
  }

  return Buffer.from(doc.output('arraybuffer'))
}
