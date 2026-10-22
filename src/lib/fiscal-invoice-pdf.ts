'use client'

import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

type InvoicePayload = {
  voucher?: {
    type?: string
    concept?: number
    date?: string
    serviceFrom?: string
    serviceTo?: string
    paymentDueDate?: string
  }
  amounts?: {
    total?: number
    net?: number
    vat?: number
    exempt?: number
    nonTaxable?: number
    vatBreakdown?: Array<{ rate: number; base: number; amount: number }>
  }
  items?: Array<{
    description: string
    quantity: number
    unitPrice: number
    discountAmount?: number
    netAmount: number
    vatRate?: number | null
    vatAmount: number
    exemptAmount?: number
    nonTaxableAmount?: number
    totalAmount: number
  }>
  customer?: { docType?: number; docNumber?: string; name?: string | null; vatCondition?: number }
}

export type FiscalPdfInvoice = {
  id: string
  environment: string
  cuit: string
  pointOfSale: number
  voucherType: number
  voucherNumber: number | null
  result: string | null
  cae: string | null
  caeExpiresAt: string | null
  amount: string | null
  currency?: string | null
  createdAt: string
  payload?: InvoicePayload | null
}

export type FiscalPdfTemplate = {
  legalName?: string
  issuerCuit?: string
  ivaCondition?: string
  startActivity?: string
  taxAddress?: string
  commercialName?: string
  address?: string
  locality?: string
  province?: string
  phone?: string
  whatsapp?: string
  website?: string
  logoUrl?: string
  primaryColor?: string
  showWebsite?: boolean
  showWhatsapp?: boolean
  footerText?: string
}

const voucherNames: Record<number, string> = {
  1: 'FACTURA A',
  6: 'FACTURA B',
  11: 'FACTURA C',
  51: 'FACTURA M',
}

const money = (value: number) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', minimumFractionDigits: 2,
}).format(value)

const printableDate = (value?: string | null) => {
  if (!value) return '—'
  const normalized = /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value.slice(0, 10)
  const [year, month, day] = normalized.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function validate(invoice: FiscalPdfInvoice, template: FiscalPdfTemplate) {
  const payload = invoice.payload
  const missing: string[] = []
  if (invoice.result !== 'A' || !invoice.cae || !invoice.caeExpiresAt || !invoice.voucherNumber) missing.push('autorización ARCA, CAE y número de comprobante')
  if (!/^\d{11}$/.test(template.issuerCuit || '') || template.issuerCuit !== invoice.cuit) missing.push('CUIT emisor coincidente con la plantilla')
  if (!template.legalName?.trim()) missing.push('razón social fiscal')
  if (!template.ivaCondition?.trim()) missing.push('condición frente al IVA')
  if (!template.taxAddress?.trim() && !template.address?.trim()) missing.push('domicilio del emisor')
  if (!template.startActivity?.trim()) missing.push('inicio de actividades')
  if (!/^\d{8}$/.test(payload?.voucher?.date || '')) missing.push('fecha de emisión')
  if (typeof payload?.amounts?.total !== 'number' || !Number.isFinite(payload.amounts.total)) missing.push('total fiscal')
  if (typeof payload?.customer?.docType !== 'number' || !payload.customer.docNumber) missing.push('identificación del receptor')
  if (!payload?.items?.length) missing.push('detalle de productos o servicios')
  return missing
}

async function imageUrlToPng(url: string) {
  const response = await fetch(url, { mode: 'cors', cache: 'force-cache' })
  if (!response.ok) throw new Error('No se pudo descargar el logo desde el CDN.')
  const bitmap = await createImageBitmap(await response.blob())
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar el logo para el PDF.')
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  return canvas.toDataURL('image/png')
}

function officialQr(invoice: FiscalPdfInvoice) {
  const payload = invoice.payload!
  const qrData = {
    ver: 1,
    fecha: `${payload.voucher!.date!.slice(0, 4)}-${payload.voucher!.date!.slice(4, 6)}-${payload.voucher!.date!.slice(6, 8)}`,
    cuit: Number(invoice.cuit),
    ptoVta: invoice.pointOfSale,
    tipoCmp: invoice.voucherType,
    nroCmp: invoice.voucherNumber!,
    importe: payload.amounts!.total!,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: payload.customer!.docType!,
    nroDocRec: Number(payload.customer!.docNumber),
    tipoCodAut: 'E',
    codAut: Number(invoice.cae),
  }
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(qrData))))
  return `https://www.afip.gob.ar/fe/qr/?p=${encoded}`
}

async function addInvoicePage(doc: jsPDF, invoice: FiscalPdfInvoice, template: FiscalPdfTemplate, logoData?: string) {
  const payload = invoice.payload!
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const right = pageWidth - margin
  const accent = /^#[0-9a-fA-F]{6}$/.test(template.primaryColor || '') ? template.primaryColor! : '#ed164f'
  const rgb = [parseInt(accent.slice(1, 3), 16), parseInt(accent.slice(3, 5), 16), parseInt(accent.slice(5, 7), 16)] as [number, number, number]
  const voucherName = voucherNames[invoice.voucherType] || `COMPROBANTE TIPO ${invoice.voucherType}`
  let y = 16

  doc.setDrawColor(...rgb)
  doc.setLineWidth(1.1)
  doc.line(margin, y, right, y)
  y += 7

  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, y, 30, 18, undefined, 'FAST')
  }
  const textX = logoData ? margin + 35 : margin
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(25, 25, 25)
  doc.text(template.legalName || '', textX, y + 4, { maxWidth: right - textX - 42 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`CUIT: ${template.issuerCuit}`, textX, y + 9)
  doc.text(template.ivaCondition || '', textX, y + 13, { maxWidth: right - textX - 42 })
  doc.text(`Domicilio: ${template.taxAddress || template.address || ''}`, textX, y + 17, { maxWidth: right - textX - 42 })

  doc.setDrawColor(180, 180, 180)
  doc.rect(right - 36, y - 1, 36, 24)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(String.fromCharCode(64 + (invoice.voucherType === 1 ? 1 : invoice.voucherType === 6 ? 2 : invoice.voucherType === 11 ? 3 : 4)), right - 18, y + 8, { align: 'center' })
  doc.setFontSize(7)
  doc.text(voucherName, right - 18, y + 14, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text(`Inicio actividades: ${printableDate(template.startActivity)}`, right - 18, y + 19, { align: 'center' })
  y += 31

  doc.setDrawColor(215, 215, 215)
  doc.line(margin, y, right, y)
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(`${voucherName} · ${String(invoice.pointOfSale).padStart(5, '0')}-${String(invoice.voucherNumber).padStart(8, '0')}`, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha: ${printableDate(payload.voucher?.date)}`, right, y, { align: 'right' })
  y += 6
  doc.text(`Condición frente al IVA del receptor: ${payload.customer?.vatCondition ?? 'No informada'}`, margin, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('RECEPTOR', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(payload.customer?.name || 'Consumidor / receptor', margin, y + 5)
  doc.text(`Documento: tipo ${payload.customer?.docType} · ${payload.customer?.docNumber}`, margin, y + 10)
  y += 18

  if (payload.voucher?.concept === 2 || payload.voucher?.concept === 3) {
    doc.setFontSize(8)
    doc.text(`Período de servicio: ${printableDate(payload.voucher.serviceFrom)} al ${printableDate(payload.voucher.serviceTo)}`, margin, y)
    doc.text(`Vencimiento de pago: ${printableDate(payload.voucher.paymentDueDate)}`, right, y, { align: 'right' })
    y += 7
  }

  const col = { description: margin + 2, quantity: right - 74, unit: right - 47, total: right - 2 }
  doc.setFillColor(...rgb)
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Descripción', col.description, y + 5)
  doc.text('Cant.', col.quantity, y + 5, { align: 'right' })
  doc.text('Unitario', col.unit, y + 5, { align: 'right' })
  doc.text('Importe', col.total, y + 5, { align: 'right' })
  y += 8
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'normal')
  for (const item of payload.items || []) {
    const lines = doc.splitTextToSize(item.description || 'Ítem', col.quantity - col.description - 8)
    const rowHeight = Math.max(7, lines.length * 4 + 3)
    if (y + rowHeight > 230) {
      doc.addPage()
      y = 18
    }
    doc.setDrawColor(230, 230, 230)
    doc.line(margin, y + rowHeight, right, y + rowHeight)
    doc.text(lines, col.description, y + 4)
    doc.text(String(item.quantity), col.quantity, y + 4, { align: 'right' })
    doc.text(money(item.unitPrice), col.unit, y + 4, { align: 'right' })
    doc.text(money(item.totalAmount), col.total, y + 4, { align: 'right' })
    y += rowHeight
  }

  y = Math.max(y + 8, 190)
  const amounts = payload.amounts!
  doc.setFontSize(8)
  doc.setTextColor(50, 50, 50)
  doc.text(`Neto: ${money(amounts.net ?? 0)}`, right, y, { align: 'right' }); y += 5
  if (invoice.voucherType !== 11 && (amounts.vat ?? 0) > 0) {
    doc.text('IVA discriminado:', right, y, { align: 'right' }); y += 4
    for (const rate of amounts.vatBreakdown || []) {
      doc.text(`IVA ${rate.rate}% sobre ${money(rate.base)}: ${money(rate.amount)}`, right, y, { align: 'right' })
      y += 4
    }
  }
  if ((amounts.exempt ?? 0) > 0) { doc.text(`Exento: ${money(amounts.exempt!)}`, right, y, { align: 'right' }); y += 5 }
  if ((amounts.nonTaxable ?? 0) > 0) { doc.text(`No gravado: ${money(amounts.nonTaxable!)}`, right, y, { align: 'right' }); y += 5 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...rgb)
  doc.text(`TOTAL: ${money(amounts.total!)}`, right, y + 3, { align: 'right' })
  y += 13

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(50, 50, 50)
  doc.text(`CAE: ${invoice.cae}`, margin, y)
  doc.text(`Vencimiento CAE: ${printableDate(invoice.caeExpiresAt)}`, margin, y + 5)
  const qrUrl = officialQr(invoice)
  const qrData = await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'M', margin: 1, width: 160 })
  doc.addImage(qrData, 'PNG', right - 28, y - 2, 27, 27)
  doc.setFontSize(7)
  doc.text('Código QR fiscal ARCA', right - 14, y + 28, { align: 'center' })
  doc.setFontSize(8)
  const footer = [template.footerText, template.showWebsite ? template.website : '', template.showWhatsapp ? template.whatsapp : ''].filter(Boolean).join(' · ')
  if (footer) doc.text(footer, margin, Math.min(y + 14, 276), { maxWidth: right - margin - 35 })
}

export async function downloadFiscalInvoicePdf(invoice: FiscalPdfInvoice, template: FiscalPdfTemplate) {
  const missing = validate(invoice, template)
  if (missing.length) throw new Error(`No se puede generar una representación fiscal todavía. Falta completar: ${missing.join(', ')}. Completá y verificá los datos fiscales antes de exportar.`)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let logoData: string | undefined
  if (template.logoUrl) logoData = await imageUrlToPng(template.logoUrl)
  await addInvoicePage(doc, invoice, template, logoData)
  doc.save(`factura-${invoice.pointOfSale.toString().padStart(5, '0')}-${invoice.voucherNumber}.pdf`)
}

export async function downloadFiscalInvoiceBatchPdf(invoices: FiscalPdfInvoice[], template: FiscalPdfTemplate) {
  if (!invoices.length) throw new Error('No hay comprobantes seleccionados para exportar.')
  const incomplete = invoices.map((invoice, index) => ({ index, missing: validate(invoice, template) })).filter(item => item.missing.length)
  if (incomplete.length) throw new Error(`No se generó el lote. Comprobantes incompletos: ${incomplete.map(item => `#${item.index + 1} (${item.missing.join(', ')})`).join('; ')}`)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let logoData: string | undefined
  if (template.logoUrl) logoData = await imageUrlToPng(template.logoUrl)
  for (let index = 0; index < invoices.length; index++) {
    if (index > 0) doc.addPage()
    await addInvoicePage(doc, invoices[index], template, logoData)
  }
  doc.save(`facturas-lote-${new Date().toISOString().slice(0, 10)}.pdf`)
}
