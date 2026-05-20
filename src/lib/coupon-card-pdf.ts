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
  welcomeMessage?: string | null
  welcomeConditions?: string | null
  maxUses?: number | null
  perUserLimit?: number | null
}

export type CouponPdfRecord = {
  code: string
  recipientName: string | null
  recipientBusiness: string | null
  batchName: string | null
  qrPayload: string | null
  metadata: Prisma.JsonValue | null
  expiresAt: Date | null
  usesLeft: number
  promotion: CouponPdfPromotion
}

type CouponCardData = {
  code: string
  presenterName: string
  personName: string | null
  audienceLabel: string | null
  discountLabel: string
  discountSubtitle: string
  benefitDescription: string
  expiresLabel: string
  qrDataUrl: string
  clientLogoDataUrl: string | null
}

/* ── Design tokens ── */
const CARD_WIDTH = 148
const CARD_HEIGHT = 210
const ZAP_PINK = '#ED2C71'
const ZAP_BLUE = '#4576B9'
const ZAP_PURPLE = '#9951A1'
const INK = '#111111'
const MUTED = '#666666'
const MUTED_LIGHT = '#999999'
const CUT_COLOR = '#D5D5D5'

/* ── Helpers ── */

function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) {
    return 'JPEG'
  }
  if (dataUrl.includes('image/webp')) {
    return 'WEBP'
  }
  return 'PNG'
}

/* ── Helpers ── */

function compactLabel(value: string, maxLength = 36) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized
}

function getDiscountSubtitle(promotion: CouponPdfPromotion, coupon: CouponPdfRecord): string {
  // If the promotion has an explicit conditions text, use it as the subtitle
  if (promotion.welcomeConditions) return promotion.welcomeConditions

  const perUser = promotion.perUserLimit
  const maxUses = promotion.maxUses
  const usesLeft = coupon.usesLeft
  const expires = coupon.expiresAt

  // Single use coupon (usesLeft starts at 1 and perUserLimit is 1)
  if (usesLeft === 1 && (perUser === 1 || perUser == null)) {
    if (expires) {
      return `por única vez · válido hasta ${expires.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`
    }
    return 'por única vez'
  }

  // Multi-use but limited
  if (usesLeft > 1) {
    if (expires) {
      return `hasta ${usesLeft} usos · válido hasta ${expires.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`
    }
    return `hasta ${usesLeft} usos`
  }

  // Unlimited per user (perUserLimit is null) but expires
  if (!perUser && expires) {
    return `ilimitado · válido hasta ${expires.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`
  }

  // Unlimited and no expiry
  if (!perUser && !expires) {
    return 'sin límite de usos'
  }

  // Fallback
  if (expires) {
    return `válido hasta ${expires.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`
  }

  return 'sin vencimiento'
}

function getDiscountLabel(
  promotion: CouponPdfPromotion,
  coupon: CouponPdfRecord
): { main: string; subtitle: string } {
  const subtitle = getDiscountSubtitle(promotion, coupon)
  if (promotion.discountKind === 'PERCENTAGE') {
    return {
      main: `${promotion.discountValue}% off`,
      subtitle,
    }
  }
  return {
    main: `$${promotion.discountValue.toLocaleString('es-AR')} off`,
    subtitle,
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
  maxWidthMm: number,
  startSizeMm: number,
  minSizeMm: number,
  style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'bold'
) {
  let sizeMm = startSizeMm
  doc.setFont('helvetica', style)

  const mmToPt = 2.83464567
  doc.setFontSize(sizeMm * mmToPt)

  while (sizeMm > minSizeMm && doc.getTextWidth(text) > maxWidthMm) {
    sizeMm -= 0.2
    doc.setFontSize(sizeMm * mmToPt)
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

    let finalBuffer: any = Buffer.from(await response.arrayBuffer())
    let contentType = response.headers.get('content-type') || 'image/png'

    // jsPDF does not natively support SVG via addImage
    // We convert it to PNG on the fly using sharp at high DPI for crisp quality
    if (contentType.includes('svg') || url.toLowerCase().split('?')[0].endsWith('.svg')) {
      const sharp = (await import('sharp')).default
      // density: 300 means sharp rasterises the SVG at 300 DPI instead of
      // the default 72 DPI – this makes the logo ~4× sharper on the PDF
      finalBuffer = await sharp(finalBuffer, { density: 300 })
        .png()
        .toBuffer()
      contentType = 'image/png'
    }

    const base64 = finalBuffer.toString('base64')
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
    let logoUrl = coupon.promotion.welcomeLogoUrl
    if (logoUrl.startsWith('/') || !logoUrl.startsWith('http')) {
      const baseUrl = fallbackBaseUrl.replace(/\/$/, '')
      logoUrl = `${baseUrl}/${logoUrl.replace(/^\//, '')}`
    }
    clientLogoDataUrl = await fetchImageAsDataUrl(logoUrl)
  }

  const discount = getDiscountLabel(coupon.promotion, coupon)

  return {
    code: coupon.code,
    presenterName,
    personName: getPersonName(coupon),
    audienceLabel: coupon.promotion.audienceLabel || null,
    discountLabel: discount.main,
    discountSubtitle: discount.subtitle,
    benefitDescription: coupon.promotion.welcomeMessage || 'Presentá este cupón antes de finalizar la compra.',
    expiresLabel: coupon.expiresAt
      ? `Válido hasta el ${coupon.expiresAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : (coupon.promotion.welcomeConditions || 'Beneficio sujeto a condiciones vigentes'),
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
  const lineWidth = 0.5

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
  doc.setLineDashPattern([2, 1.5], 0)
  doc.line(x + 10, y, x + width - 10, y)
  doc.setLineDashPattern([], 0)

  // Scissors icon (small "✂")
  doc.setFontSize(6)
  doc.setTextColor(MUTED_LIGHT)
  doc.setFont('helvetica', 'normal')
  doc.text('✂', x + 5, y + 1.5)
}

function drawGradientText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  align: 'left' | 'center' | 'right' = 'center'
) {
  doc.saveGraphicsState()
  try {
    // Attempt to use PDF clipping path for text
    doc.text(text, x, y, { align, renderingMode: 'fillAndAddForClipping' })
    // Draw gradient over the text bounds
    let rectX = x - width / 2
    if (align === 'left') rectX = x
    if (align === 'right') rectX = x - width
    const rectY = y - height * 0.8
    drawGradientBar(doc, rectX, rectY, width, height * 1.5)
  } catch (e) {
    // Fallback if renderingMode is not supported
    doc.setTextColor(ZAP_PINK)
    doc.text(text, x, y, { align })
  }
  doc.restoreGraphicsState()
}

function drawInitialsLogo(
  doc: jsPDF,
  initials: string,
  cx: number,
  cy: number,
  size: number
) {
  const half = size / 2
  const radius = 3.5

  // Dark rounded background
  doc.setFillColor(INK)
  drawRoundedRect(doc, cx - half, cy - half, size, size, radius, 'F')

  // Initials text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size * 0.38)
  doc.setTextColor('#FFFFFF')
  doc.text(initials, cx, cy + size * 0.13, { align: 'center' })
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

  const mmToPt = 2.83464567
  const setPtFont = (style: 'normal' | 'bold' | 'italic' | 'bolditalic', sizeMm: number) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(sizeMm * scale * mmToPt)
  }

  // ── White card background ──
  doc.setFillColor('#FFFFFF')
  doc.rect(x, y, width, height, 'F')

  // ── Fine border ──
  doc.setDrawColor(232, 232, 232)
  doc.setLineWidth(0.15)
  doc.rect(x, y, width, height, 'S')

  // ── Gradient bar top ──
  drawGradientBar(doc, x, y, width, sw(2))

  // ── Agency branding (top-left, subtle, no text below) ──
  const logoSize = sw(12)
  doc.addImage(ZAP_LOGO_B64, 'PNG', sx(12), sy(8), logoSize, logoSize, undefined, 'FAST')

  // ── Client logo or initials ──
  const logoCenterX = sx(CARD_WIDTH / 2)
  const logoY = sy(25)
  const clientLogoSize = sw(35)

  if (card.clientLogoDataUrl) {
    try {
      const format = getImageFormat(card.clientLogoDataUrl)
      const props = doc.getImageProperties(card.clientLogoDataUrl)
      const imgRatio = props.width / props.height

      let drawW = clientLogoSize
      let drawH = clientLogoSize

      if (imgRatio > 1) {
        // Horizontal image
        drawH = clientLogoSize / imgRatio
      } else {
        // Vertical or square image
        drawW = clientLogoSize * imgRatio
      }

      const drawX = logoCenterX - drawW / 2
      const drawY = logoY + (clientLogoSize - drawH) / 2

      doc.addImage(
        card.clientLogoDataUrl,
        format,
        drawX,
        drawY,
        drawW,
        drawH,
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
  const nameY = logoY + clientLogoSize + sw(12)
  doc.setTextColor(INK)
  setFitFont(doc, compactLabel(card.presenterName, 30), sw(130), 10, 6, 'bold')
  doc.text(compactLabel(card.presenterName, 30), logoCenterX, nameY, { align: 'center' })

  // ── Subtitle (audience label or person name) ──
  const subtitle = card.audienceLabel || card.personName || ''
  if (subtitle) {
    setPtFont('normal', 6)
    doc.setTextColor(MUTED)
    doc.text(compactLabel(subtitle, 35), logoCenterX, nameY + sw(8), { align: 'center' })
  }

  // ── Benefit block ──
  const benefitY = nameY + sw(subtitle ? 26 : 18)

  // Main discount label (huge gradient text)
  setFitFont(doc, card.discountLabel, sw(130), 20, 12, 'bold')
  drawGradientText(doc, card.discountLabel, logoCenterX, benefitY, sw(130), sw(20), 'center')

  // Discount subtitle
  setPtFont('bold', 7)
  doc.setTextColor(ZAP_BLUE)
  doc.text(card.discountSubtitle, logoCenterX, benefitY + sw(12), { align: 'center' })

  // Benefit description
  setPtFont('italic', 5)
  doc.setTextColor(MUTED)
  doc.text(card.benefitDescription, logoCenterX, benefitY + sw(24), {
    align: 'center',
    maxWidth: sw(130),
  })

  // ── Cut line ──
  const cutY = sy(135)
  drawCutLine(doc, x, cutY, width)

  // ── QR section ──
  const qrSize = sw(42)
  const qrX = logoCenterX - qrSize / 2
  const qrY = cutY + sw(12)

  // QR corners
  drawQrCorners(doc, qrX - sw(3.5), qrY - sw(3.5), qrSize + sw(7), sw(6))

  // QR image
  doc.addImage(card.qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST')

  // ── Code ──
  const codeY = qrY + qrSize + sw(10)
  doc.setTextColor(ZAP_PINK)
  setPtFont('bold', 5)
  doc.text(card.code, logoCenterX, codeY, { align: 'center' })

  // ── Expiry ──
  setPtFont('italic', 4)
  doc.setTextColor(MUTED_LIGHT)
  doc.text(card.expiresLabel, logoCenterX, codeY + sw(9), { align: 'center', maxWidth: sw(130) })
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
  // 320x470mm layout as requested
  const SHEET_WIDTH = 320
  const SHEET_HEIGHT = 470
  const MARGIN = 10

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [SHEET_WIDTH, SHEET_HEIGHT] })

  // Calculate grid: 2 columns, 2 rows of A5 coupons
  const columns = 2
  const rows = 2
  const couponsPerPage = columns * rows

  // Usable area
  const usableWidth = SHEET_WIDTH - MARGIN * 2
  const usableHeight = SHEET_HEIGHT - MARGIN * 2

  // Center the grid in the usable area
  const gridWidth = columns * CARD_WIDTH
  const gridHeight = rows * CARD_HEIGHT
  const startX = MARGIN + (usableWidth - gridWidth) / 2
  const startY = MARGIN + (usableHeight - gridHeight) / 2

  const positions = [
    { x: startX, y: startY },
    { x: startX + CARD_WIDTH, y: startY },
    { x: startX, y: startY + CARD_HEIGHT },
    { x: startX + CARD_WIDTH, y: startY + CARD_HEIGHT },
  ]

  for (let pageStart = 0; pageStart < coupons.length; pageStart += couponsPerPage) {
    if (pageStart > 0) doc.addPage([SHEET_WIDTH, SHEET_HEIGHT], 'portrait')
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
