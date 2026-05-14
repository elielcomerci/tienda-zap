import { jsPDF } from 'jspdf'

import { ZAP_LOGO_B64 } from './logo-base64'

// ─── Brand Colors ───
type RGB = readonly [number, number, number]
const BRAND_PRIMARY: RGB = [237, 44, 113]   // #ED2C71 (Pink)
const BRAND_SECONDARY: RGB = [69, 118, 185] // #4576B9 (Blue)
const DARK: RGB = [15, 23, 42]        // #0f172a
const GRAY_700: RGB = [55, 65, 81]
const GRAY_500: RGB = [107, 114, 128]
const GRAY_300: RGB = [209, 213, 219]
const GRAY_50: RGB = [249, 250, 251]
const WHITE: RGB = [255, 255, 255]

type ReceiptOrderItem = {
  productName: string
  quantity: number
  unitPrice: number
  options?: string
}

type ReceiptCreditPlan = {
  installments: number
  paymentFrequency: string
  ratePercent: number
  downPaymentAmount: number
  downPaymentPercent: number
  financedAmount: number
  installmentAmount: number
  totalRepayable: number
}

export type ReceiptOrderData = {
  orderId: string
  orderCode: string
  createdAt: Date
  // Customer
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  customerDocumentId: string | null
  billingAddress: string | null
  billingCity: string | null
  billingProvince: string | null
  shippingAddress: string | null
  shippingCity: string | null
  shippingProvince: string | null
  shippingPostalCode: string | null
  // Order
  items: ReceiptOrderItem[]
  subtotal: number
  discountTotal: number
  total: number
  couponCode: string | null
  paymentType: string
  // Credit
  creditPlan: ReceiptCreditPlan | null
}

export type ReceiptOptions = {
  paymentAmount?: number
  paymentNote?: string
  installmentSeq?: number
}

// Deterministic formatting — does not depend on server locale/ICU data
function fmtCurrency(value: number) {
  const fixed = value.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decPart === '00' ? `$${withDots}` : `$${withDots},${decPart}`
}

function fmtDate(date: Date) {
  const d = toArgDate(date)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function fmtTime(date: Date) {
  const d = toArgDate(date)
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${min}`
}

/** Convert a Date to Argentina timezone for consistent rendering */
function toArgDate(date: Date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60_000
  return new Date(utc - 3 * 60 * 60_000) // UTC-3
}

function paymentTypeLabel(type: string) {
  switch (type) {
    case 'MERCADOPAGO': return 'Tarjeta / MercadoPago'
    case 'TRANSFER': return 'Transferencia'
    case 'CASH': return 'Efectivo'
    case 'ZAP_CREDIT': return 'Crédito ZAP'
    default: return type
  }
}

function frequencyLabel(freq: string) {
  switch (freq) {
    case 'DAILY': return 'diarios'
    case 'WEEKLY': return 'semanales'
    case 'MONTHLY': return 'mensuales'
    default: return freq.toLowerCase()
  }
}

function generateReceiptNumber(orderId: string) {
  const suffix = orderId.slice(-8).toUpperCase()
  const ts = Date.now().toString(36).toUpperCase().slice(-4)
  return `REC-${suffix}-${ts}`
}

export function generateOrderReceiptPdf(
  order: ReceiptOrderData,
  options: ReceiptOptions = {}
): ArrayBuffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 18
  const contentWidth = pageWidth - margin * 2
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 0

  // ─── Helper: ensure enough vertical space, add page if needed ───
  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - 20) {
      doc.addPage()
      y = 18
    }
  }

  const receiptNumber = generateReceiptNumber(order.orderId)
  const now = new Date()
  const isPartialPayment = typeof options.paymentAmount === 'number' && options.paymentAmount > 0
  const paymentAmount = isPartialPayment ? options.paymentAmount! : order.total
  const remainingBalance = order.total - paymentAmount

  // ─── Helper: horizontal line ───
  function drawLine(yPos: number, color: RGB = GRAY_300) {
    doc.setDrawColor(color[0], color[1], color[2])
    doc.setLineWidth(0.3)
    doc.line(margin, yPos, pageWidth - margin, yPos)
  }

  // ─── Helper: section title ───
  function sectionTitle(title: string) {
    ensureSpace(20)
    y += 8
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_PRIMARY)
    doc.text(title.toUpperCase(), margin, y)
    y += 1.5
    drawLine(y, BRAND_PRIMARY)
    y += 5
  }

  // ─── Helper: key-value row ───
  function kvRow(label: string, value: string, bold = false) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY_500)
    doc.text(label, margin, y)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...DARK)
    doc.text(value, pageWidth - margin, y, { align: 'right' })
    y += 5
  }

  // ─── HEADER BAR ───
  doc.setFillColor(...DARK)
  doc.rect(0, 0, pageWidth, 38, 'F')

  // Orange accent bar -> Pink accent bar
  doc.setFillColor(...BRAND_PRIMARY)
  doc.rect(0, 38, pageWidth, 2.5, 'F')

  // ZAP logo image
  doc.addImage(ZAP_LOGO_B64, 'PNG', margin, 8, 30, 20, undefined, 'FAST')

  // Subtitle
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 185, 195) // simulated 70% white on dark bg — jsPDF has no RGBA
  doc.text(isPartialPayment ? 'RECIBO DE PAGO PARCIAL' : 'RECIBO DE PAGO', margin, 26)

  // Receipt number
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(receiptNumber, pageWidth - margin, 14, { align: 'right' })

  // Date & order
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha: ${fmtDate(now)} · ${fmtTime(now)}`, pageWidth - margin, 22, { align: 'right' })
  doc.text(`Orden #${order.orderCode}`, pageWidth - margin, 29, { align: 'right' })

  y = 48

  // ─── CUSTOMER DATA ───
  sectionTitle('Datos del cliente')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)

  const customerLines: [string, string | null][] = [
    ['Nombre', order.customerName],
    ['Email', order.customerEmail],
    ['Teléfono', order.customerPhone],
    ['Documento', order.customerDocumentId],
  ]

  for (const [label, value] of customerLines) {
    if (value) {
      doc.setTextColor(...GRAY_500)
      doc.text(`${label}:`, margin, y)
      doc.setTextColor(...DARK)
      doc.text(value, margin + 28, y)
      y += 5
    }
  }

  // Billing address
  const billingParts = [order.billingAddress, order.billingCity, order.billingProvince].filter(Boolean)
  if (billingParts.length > 0) {
    doc.setTextColor(...GRAY_500)
    doc.text('Facturación:', margin, y)
    doc.setTextColor(...DARK)
    const addrMaxW = contentWidth - 30
    const billingLines = doc.splitTextToSize(billingParts.join(', '), addrMaxW) as string[]
    doc.text(billingLines, margin + 28, y)
    y += 5 * billingLines.length
  }

  // Shipping address
  const shippingParts = [order.shippingAddress, order.shippingCity, order.shippingProvince, order.shippingPostalCode ? `CP ${order.shippingPostalCode}` : null].filter(Boolean)
  if (shippingParts.length > 0) {
    doc.setTextColor(...GRAY_500)
    doc.text('Envío:', margin, y)
    doc.setTextColor(...DARK)
    const addrMaxW = contentWidth - 30
    const shippingLines = doc.splitTextToSize(shippingParts.join(', '), addrMaxW) as string[]
    doc.text(shippingLines, margin + 28, y)
    y += 5 * shippingLines.length
  }

  // ─── ORDER ITEMS TABLE ───
  sectionTitle('Detalle del pedido')

  // Table header
  const colX = {
    product: margin,
    options: margin + 72,
    qty: margin + contentWidth - 52,
    unit: margin + contentWidth - 34,
    total: margin + contentWidth,
  }

  doc.setFillColor(...DARK)
  doc.roundedRect(margin, y - 3.5, contentWidth, 7, 1.5, 1.5, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('PRODUCTO', colX.product + 3, y)
  doc.text('CANT', colX.qty, y, { align: 'right' })
  doc.text('UNITARIO', colX.unit, y, { align: 'right' })
  doc.text('TOTAL', colX.total, y, { align: 'right' })
  y += 7

  // Table rows
  order.items.forEach((item, index) => {
    ensureSpace(item.options ? 14 : 10)
    const isEven = index % 2 === 0
    if (isEven) {
      doc.setFillColor(...GRAY_50)
      doc.rect(margin, y - 3.5, contentWidth, item.options ? 10 : 6, 'F')
    }

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)

    // Truncate long product names
    const maxProductWidth = 65
    let productName = item.productName
    while (doc.getTextWidth(productName) > maxProductWidth && productName.length > 3) {
      productName = productName.slice(0, -4) + '...'
    }

    doc.text(productName, colX.product + 3, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(item.quantity), colX.qty, y, { align: 'right' })
    doc.text(fmtCurrency(item.unitPrice), colX.unit, y, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.text(fmtCurrency(item.unitPrice * item.quantity), colX.total, y, { align: 'right' })

    if (item.options) {
      y += 4
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY_500)
      doc.text(item.options, colX.product + 3, y)
    }

    y += 6
  })

  y += 2
  drawLine(y)
  y += 5

  // Subtotals
  if (order.subtotal !== order.total || order.discountTotal > 0) {
    kvRow('Subtotal', fmtCurrency(order.subtotal))
  }
  if (order.discountTotal > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY_500)
    doc.text(`Descuento${order.couponCode ? ` (${order.couponCode})` : ''}`, margin, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(16, 185, 129) // emerald
    doc.text(`-${fmtCurrency(order.discountTotal)}`, pageWidth - margin, y, { align: 'right' })
    y += 5
  }
  kvRow('Total de la orden', fmtCurrency(order.total), true)

  // ─── PAYMENT DETAIL ───
  sectionTitle('Detalle de pago')

  if (options.paymentNote) {
    kvRow('Concepto', options.paymentNote)
  }
  if (options.installmentSeq) {
    kvRow('Cuota Nº', String(options.installmentSeq))
  }
  kvRow('Método de pago', paymentTypeLabel(order.paymentType))

  y += 2

  // Highlighted payment amount box
  ensureSpace(30)
  doc.setFillColor(...BRAND_PRIMARY)
  doc.roundedRect(margin, y - 1, contentWidth, 14, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('MONTO DE ESTE RECIBO', margin + 6, y + 5)
  doc.setFontSize(16)
  doc.text(fmtCurrency(paymentAmount), pageWidth - margin - 6, y + 7, { align: 'right' })
  y += 18

  if (isPartialPayment) {
    kvRow('Saldo restante', fmtCurrency(remainingBalance), true)
  }

  // ─── ZAP CREDIT PLAN (if applicable) ───
  if (order.creditPlan) {
    sectionTitle('Condiciones de Crédito ZAP')

    kvRow('Anticipo', `${fmtCurrency(order.creditPlan.downPaymentAmount)} (${order.creditPlan.downPaymentPercent}%)`)
    kvRow('Monto financiado', fmtCurrency(order.creditPlan.financedAmount))
    kvRow('Plan', `${order.creditPlan.installments} pagos ${frequencyLabel(order.creditPlan.paymentFrequency)}`)
    kvRow('Cuota estimada', fmtCurrency(order.creditPlan.installmentAmount))
    kvRow('Tasa fija', `${order.creditPlan.ratePercent.toLocaleString('es-AR')}%`)
    kvRow('Total a devolver', fmtCurrency(order.creditPlan.totalRepayable))
  }

  // ─── FOOTER ───
  if (y + 30 > pageHeight) {
    doc.addPage()
    y = 18
  }
  y = Math.max(y + 10, pageHeight - 37)
  drawLine(y, GRAY_300)
  y += 5

  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...GRAY_500)
  doc.text('Este recibo no constituye factura. Documento interno de referencia.', margin, y)
  y += 4
  doc.text(`Generado el ${fmtDate(now)} a las ${fmtTime(now)}`, margin, y)

  // Right-aligned brand
  doc.addImage(ZAP_LOGO_B64, 'PNG', pageWidth - margin - 20, y - 6, 20, 13, undefined, 'FAST')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY_500)
  doc.text('tienda.zap.com.ar', pageWidth - margin, y + 10, { align: 'right' })

  return doc.output('arraybuffer')
}
