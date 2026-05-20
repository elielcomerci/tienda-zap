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
  discountLabel: string
  expiresLabel: string
  qrDataUrl: string
}

const CARD_WIDTH = 90
const CARD_HEIGHT = 50
const ZAP_PINK = '#ED2C71'
const ZAP_BLUE = '#4576B9'
const ZAP_PURPLE = '#9951A1'
const INK = '#242424'
const MUTED = '#5E6470'

function compactLabel(value: string, maxLength = 36) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized
}

function getDiscountLabel(promotion: CouponPdfPromotion) {
  return promotion.discountKind === 'PERCENTAGE'
    ? `${promotion.discountValue}% OFF`
    : `$${promotion.discountValue.toLocaleString('es-AR')} OFF`
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

  return {
    code: coupon.code,
    presenterName,
    personName: getPersonName(coupon),
    discountLabel: getDiscountLabel(coupon.promotion),
    expiresLabel: coupon.expiresAt
      ? `Valido hasta ${coupon.expiresAt.toLocaleDateString('es-AR')}`
      : 'Beneficio sujeto a condiciones vigentes',
    qrDataUrl,
  }
}

function drawGradientRule(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setFillColor(ZAP_PINK)
  doc.rect(x, y, width * 0.34, height, 'F')
  doc.setFillColor(ZAP_PURPLE)
  doc.rect(x + width * 0.34, y, width * 0.32, height, 'F')
  doc.setFillColor(ZAP_BLUE)
  doc.rect(x + width * 0.66, y, width * 0.34, height, 'F')
}

function drawCardBase(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setFillColor('#FFFFFF')
  doc.rect(x, y, width, height, 'F')
  drawGradientRule(doc, x, y, width, 1.2)
  doc.setDrawColor(232, 232, 232)
  doc.setLineWidth(0.18)
  doc.rect(x, y, width, height, 'S')
}

export function drawCouponFront(
  doc: jsPDF,
  card: CouponCardData,
  x: number,
  y: number,
  width = CARD_WIDTH,
  height = CARD_HEIGHT
) {
  const scale = Math.min(width / CARD_WIDTH, height / CARD_HEIGHT)
  const sx = (value: number) => x + value * scale
  const sy = (value: number) => y + value * scale
  const sw = (value: number) => value * scale

  drawCardBase(doc, x, y, width, height)

  doc.addImage(ZAP_LOGO_B64, 'PNG', sx(7), sy(7), sw(15), sw(15))

  doc.setTextColor(ZAP_BLUE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(sw(3.1))
  doc.text('AGENCIA CREATIVA', sx(25), sy(11.5))

  doc.setTextColor(MUTED)
  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(sw(3.8))
  doc.text('CUPON ZAP', sx(83), sy(11), { align: 'right' })

  doc.setTextColor(INK)
  setFitFont(doc, compactLabel(card.presenterName, 34), sw(44), sw(6.3), sw(4.4), 'bolditalic')
  doc.text(compactLabel(card.presenterName, 34), sx(83), sy(18), { align: 'right' })

  if (card.personName) {
    doc.setTextColor(MUTED)
    setFitFont(doc, compactLabel(card.personName, 32), sw(40), sw(3.8), sw(3), 'italic')
    doc.text(compactLabel(card.personName, 32), sx(83), sy(23.2), { align: 'right' })
  }

  doc.setTextColor(INK)
  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(sw(4.2))
  doc.text('BENEFICIO', sx(7), sy(32))
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(sw(3.6))
  doc.text(card.discountLabel, sx(7), sy(38))

  doc.setTextColor(INK)
  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(sw(4.2))
  doc.text('CODIGO', sx(49), sy(32))
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(sw(3.6))
  doc.text(card.code, sx(49), sy(38))
}

export function drawCouponBack(
  doc: jsPDF,
  card: CouponCardData,
  x: number,
  y: number,
  width = CARD_WIDTH,
  height = CARD_HEIGHT
) {
  const scale = Math.min(width / CARD_WIDTH, height / CARD_HEIGHT)
  const sx = (value: number) => x + value * scale
  const sy = (value: number) => y + value * scale
  const sw = (value: number) => value * scale

  drawCardBase(doc, x, y, width, height)

  drawGradientRule(doc, sx(32.2), sy(8.5), sw(25.6), sw(2))
  drawGradientRule(doc, sx(32.2), sy(35.6), sw(25.6), sw(2))
  doc.setFillColor(ZAP_PINK)
  doc.rect(sx(32.2), sy(8.5), sw(2), sw(29.1), 'F')
  doc.setFillColor(ZAP_BLUE)
  doc.rect(sx(55.8), sy(8.5), sw(2), sw(29.1), 'F')
  doc.addImage(card.qrDataUrl, 'PNG', sx(35), sy(11.3), sw(20), sw(20))

  doc.setTextColor(INK)
  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(sw(4.2))
  doc.text('tienda.zap.com.ar', sx(45), sy(43), { align: 'center' })

  doc.setTextColor(MUTED)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(sw(2.2))
  doc.text(card.expiresLabel, sx(45), sy(47), { align: 'center', maxWidth: sw(76) })
}

export async function createSingleCouponPdf(coupon: CouponPdfRecord, fallbackBaseUrl: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_HEIGHT, CARD_WIDTH] })
  const card = await buildCouponCardData(coupon, fallbackBaseUrl)
  drawCouponFront(doc, card, 0, 0)
  doc.addPage([CARD_HEIGHT, CARD_WIDTH], 'landscape')
  drawCouponBack(doc, card, 0, 0)
  return Buffer.from(doc.output('arraybuffer'))
}

function drawSheetGuides(doc: jsPDF) {
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.12)
  for (const x of [10, 100, 110, 200]) doc.line(x, 8, x, 288)
  for (const y of [10, 60, 66, 116, 122, 172, 178, 228, 234, 284]) {
    doc.line(6, y, 204, y)
  }
}

export async function createCouponSheetPdf(coupons: CouponPdfRecord[], fallbackBaseUrl: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const positions = Array.from({ length: 10 }, (_, index) => ({
    x: index % 2 === 0 ? 10 : 110,
    y: 10 + Math.floor(index / 2) * 56,
  }))

  for (let pageStart = 0; pageStart < coupons.length; pageStart += 10) {
    if (pageStart > 0) doc.addPage('a4', 'portrait')
    const group = coupons.slice(pageStart, pageStart + 10)
    drawSheetGuides(doc)

    for (let index = 0; index < group.length; index += 1) {
      const card = await buildCouponCardData(group[index], fallbackBaseUrl)
      const pos = positions[index]
      drawCouponFront(doc, card, pos.x, pos.y)
    }

    doc.addPage('a4', 'portrait')
    drawSheetGuides(doc)

    for (let index = 0; index < group.length; index += 1) {
      const card = await buildCouponCardData(group[index], fallbackBaseUrl)
      const pos = positions[index]
      drawCouponBack(doc, card, pos.x, pos.y)
    }
  }

  return Buffer.from(doc.output('arraybuffer'))
}
