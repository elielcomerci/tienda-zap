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
    saleCondition?: string
  }
  amounts?: {
    total?: number
    net?: number
    vat?: number
    exempt?: number
    nonTaxable?: number
    otherNationalIndirectTaxes?: number
    vatBreakdown?: Array<{ rate: number; base: number; amount: number }>
  }
  items?: Array<{
    description: string
    quantity: number
    unit?: string
    unitPrice: number
    discountAmount?: number
    netAmount: number
    vatRate?: number | null
    vatAmount: number
    exemptAmount?: number
    nonTaxableAmount?: number
    totalAmount: number
  }>
  customer?: { docType?: number; docNumber?: string; name?: string | null; address?: string | null; vatCondition?: number }
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
  documentSnapshot?: {
    emitter?: { cuit?: string; razonSocial?: string | null; domicilioFiscal?: string | null; condicionIva?: string | null; inicioActividad?: string | null; grossIncomeRegistration?: string | null } | null
    recipient?: InvoicePayload['customer'] | null
    items?: InvoicePayload['items'] | null
    amounts?: InvoicePayload['amounts'] | null
    invoice?: { concept?: number; date?: string; serviceFrom?: string; serviceTo?: string; paymentDueDate?: string; saleCondition?: string } | null
  } | null
  pdfTemplateSnapshot?: FiscalPdfTemplate | null
}

export type FiscalPdfTemplate = {
  legalName?: string
  issuerCuit?: string
  ivaCondition?: string
  grossIncomeRegistration?: string
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
  arcaSource?: 'ARCA_CONSTANCIA' | 'ARCA_A13' | ''
  arcaConsultedAt?: string
  activities?: string
  designVariant?: 'classic' | 'modern' | 'editorial'
}

const voucherNames: Record<number, string> = {
  1: 'FACTURA A',
  6: 'FACTURA B',
  11: 'FACTURA C',
  51: 'FACTURA M',
}
const voucherLetters: Record<number, string> = { 1: 'A', 6: 'B', 11: 'C', 51: 'M' }
const voucherCodes: Record<number, string> = { 1: '001', 6: '006', 11: '011', 51: '051' }
const receiverVatConditions: Record<number, string> = {
  1: 'IVA Responsable Inscripto', 4: 'IVA Sujeto Exento', 5: 'Consumidor Final',
  6: 'Responsable Monotributo', 7: 'Sujeto No Categorizado', 8: 'Proveedor del Exterior',
  9: 'Cliente del Exterior', 10: 'IVA Liberado – Ley 19.640', 13: 'Monotributista Social',
  15: 'IVA No Alcanzado', 16: 'Monotributo Trabajador Independiente Promovido',
}
const documentTypes: Record<number, string> = { 80: 'CUIT', 86: 'CUIL', 87: 'CDI', 89: 'Libreta de enrolamiento', 90: 'Libreta cívica', 96: 'DNI', 99: 'Consumidor final' }

const money = (value: number) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', minimumFractionDigits: 2,
}).format(value)

function invoicePayload(invoice: FiscalPdfInvoice): InvoicePayload | null {
  const snapshot = invoice.documentSnapshot
  if (!snapshot) return invoice.payload ?? null
  return {
    voucher: {
      ...invoice.payload?.voucher,
      concept: snapshot.invoice?.concept ?? invoice.payload?.voucher?.concept,
      date: snapshot.invoice?.date ?? invoice.payload?.voucher?.date,
      serviceFrom: snapshot.invoice?.serviceFrom ?? invoice.payload?.voucher?.serviceFrom,
      serviceTo: snapshot.invoice?.serviceTo ?? invoice.payload?.voucher?.serviceTo,
      paymentDueDate: snapshot.invoice?.paymentDueDate ?? invoice.payload?.voucher?.paymentDueDate,
      saleCondition: snapshot.invoice?.saleCondition ?? invoice.payload?.voucher?.saleCondition,
    },
    amounts: snapshot.amounts ?? invoice.payload?.amounts,
    items: snapshot.items ?? invoice.payload?.items,
    customer: snapshot.recipient ?? invoice.payload?.customer,
  }
}

function emitterTemplate(invoice: FiscalPdfInvoice, template: FiscalPdfTemplate): FiscalPdfTemplate {
  template = invoice.pdfTemplateSnapshot ?? template
  const emitter = invoice.documentSnapshot?.emitter
  const commercialAddress = [template.address, template.locality, template.province].filter(value => value?.trim()).join(', ')
  return {
    ...template,
    legalName: emitter?.razonSocial || template.legalName,
    issuerCuit: emitter?.cuit || template.issuerCuit,
    ivaCondition: emitter?.condicionIva || template.ivaCondition,
    grossIncomeRegistration: emitter?.grossIncomeRegistration || template.grossIncomeRegistration,
    taxAddress: template.taxAddress || emitter?.domicilioFiscal,
    address: commercialAddress,
    startActivity: emitter?.inicioActividad || template.startActivity,
  }
}

const printableDate = (value?: string | null) => {
  if (!value) return '—'
  const normalized = /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value.slice(0, 10)
  const [year, month, day] = normalized.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function validate(invoice: FiscalPdfInvoice, template: FiscalPdfTemplate) {
  const payload = invoicePayload(invoice)
  const fiscalTemplate = emitterTemplate(invoice, template)
  const missing: string[] = []
  if (!['A', 'DONE'].includes(String(invoice.result)) || !/^\d{14}$/.test(invoice.cae || '') || !invoice.caeExpiresAt || !invoice.voucherNumber) missing.push('autorización ARCA, CAE de 14 dígitos y número de comprobante')
  if (invoice.currency && !['PES', 'ARS'].includes(invoice.currency)) missing.push('código de moneda y cotización vigentes para un comprobante en moneda extranjera')
  const consumerFinal = payload?.customer?.vatCondition === 5
  if (consumerFinal && (payload?.amounts?.total ?? 0) >= 10_000_000 && (![86, 87, 96].includes(payload?.customer?.docType ?? 0) || !payload?.customer?.docNumber || payload.customer.docNumber === '0')) missing.push('DNI, CUIL o CDI del consumidor final para operaciones desde $10.000.000')
  if (consumerFinal && [6, 11].includes(invoice.voucherType) && (!Number.isFinite(payload?.amounts?.otherNationalIndirectTaxes) || (payload?.amounts?.otherNationalIndirectTaxes ?? -1) < 0 || Math.round((payload?.amounts?.otherNationalIndirectTaxes ?? 0) * 100) !== (payload?.amounts?.otherNationalIndirectTaxes ?? 0) * 100)) missing.push('importe válido de otros impuestos nacionales indirectos para Transparencia Fiscal')
  if (!/^\d{11}$/.test(fiscalTemplate.issuerCuit || '') || fiscalTemplate.issuerCuit !== invoice.cuit) missing.push('CUIT emisor coincidente con la identidad fiscal guardada')
  if (!fiscalTemplate.legalName?.trim()) missing.push('razón social fiscal')
  if (!fiscalTemplate.ivaCondition?.trim()) missing.push('condición frente al IVA')
  if (!fiscalTemplate.grossIncomeRegistration?.trim()) missing.push('inscripción en Ingresos Brutos o condición de no contribuyente')
  if (!fiscalTemplate.address?.trim()) missing.push('domicilio comercial del emisor')
  if (!fiscalTemplate.startActivity?.trim()) missing.push('inicio de actividades')
  if (!/^\d{8}$/.test(payload?.voucher?.date || '')) missing.push('fecha de emisión')
  if (typeof payload?.amounts?.total !== 'number' || !Number.isFinite(payload.amounts.total)) missing.push('total fiscal')
  if (typeof payload?.customer?.docType !== 'number' || !payload.customer.docNumber) missing.push('identificación del receptor')
  if (!payload?.items?.length) missing.push('detalle de productos o servicios')
  if ([1, 51].includes(invoice.voucherType) && !payload.customer?.address?.trim()) missing.push('domicilio comercial del receptor para Factura A/M')
  if (invoice.voucherType === 51) missing.push('leyendas y observaciones obligatorias de Factura M verificadas');
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
  const payload = invoicePayload(invoice)!
  const qrData = {
    ver: 1,
    fecha: `${payload.voucher!.date!.slice(0, 4)}-${payload.voucher!.date!.slice(4, 6)}-${payload.voucher!.date!.slice(6, 8)}`,
    cuit: Number(invoice.cuit),
    ptoVta: invoice.pointOfSale,
    tipoCmp: invoice.voucherType,
    nroCmp: invoice.voucherNumber!,
    importe: payload.amounts!.total!,
    moneda: invoice.currency === 'ARS' ? 'PES' : invoice.currency || 'PES',
    ctz: 1,
    tipoDocRec: payload.customer!.docType!,
    nroDocRec: Number(payload.customer!.docNumber),
    tipoCodAut: 'E',
    codAut: Number(invoice.cae),
  }
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(qrData))))
  return `https://www.arca.gob.ar/fe/qr/?p=${encoded}`
}

function effectiveVatBreakdown(payload: InvoicePayload) {
  if (payload.amounts?.vatBreakdown?.length) return payload.amounts.vatBreakdown
  const grouped = new Map<number, { rate: number; base: number; amount: number }>()
  for (const item of payload.items || []) {
    if (typeof item.vatRate !== 'number' || item.vatAmount <= 0) continue
    const current = grouped.get(item.vatRate) || { rate: item.vatRate, base: 0, amount: 0 }
    current.base += item.netAmount || 0
    current.amount += item.vatAmount || 0
    grouped.set(item.vatRate, current)
  }
  return [...grouped.values()].sort((a, b) => a.rate - b.rate)
}

async function addInvoicePage(doc: jsPDF, invoice: FiscalPdfInvoice, currentTemplate: FiscalPdfTemplate, logoData?: string) {
  const template = invoice.pdfTemplateSnapshot ?? currentTemplate
  const payload = invoicePayload(invoice)!
  const fiscalTemplate = emitterTemplate(invoice, template)
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const right = pageWidth - margin
  const variantAccent: Record<NonNullable<FiscalPdfTemplate['designVariant']>, string> = {
    classic: template.primaryColor || '#ed164f',
    modern: '#0f766e',
    editorial: '#7c3aed',
  }
  const accent = /^#[0-9a-fA-F]{6}$/.test(variantAccent[template.designVariant || 'classic']) ? variantAccent[template.designVariant || 'classic'] : '#ed164f'
  const rgb = [parseInt(accent.slice(1, 3), 16), parseInt(accent.slice(3, 5), 16), parseInt(accent.slice(5, 7), 16)] as [number, number, number]
  const voucherName = voucherNames[invoice.voucherType] || `COMPROBANTE TIPO ${invoice.voucherType}`
  let y = 16

  doc.setDrawColor(...rgb)
  if (template.designVariant === 'modern') {
    doc.setFillColor(...rgb)
    doc.rect(margin, y - 3, right - margin, 3, 'F')
  } else if (template.designVariant === 'editorial') {
    doc.setLineWidth(2.2)
    doc.line(margin, y, right, y)
    doc.setLineWidth(0.5)
    doc.line(margin, y + 2, right, y + 2)
    doc.setFillColor(...rgb)
    doc.rect(6, y, 2, 265, 'F')
  } else {
    doc.setLineWidth(1.1)
    doc.line(margin, y, right, y)
  }
  y += 7

  if (logoData) doc.addImage(logoData, 'PNG', margin, y + 3, 17, 12, undefined, 'FAST')
  const textX = logoData ? margin + 21 : margin
  const letterBoxX = pageWidth / 2 - 13
  const issuerTextWidth = letterBoxX - textX - 3
  const issuerNameLines = doc.splitTextToSize(fiscalTemplate.legalName || '', issuerTextWidth).slice(0, 2)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(25, 25, 25)
  doc.text(issuerNameLines, textX, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  let issuerLineY = y + 4 + issuerNameLines.length * 4
  if (fiscalTemplate.commercialName && fiscalTemplate.commercialName !== fiscalTemplate.legalName) {
    doc.text(doc.splitTextToSize(fiscalTemplate.commercialName, issuerTextWidth).slice(0, 1), textX, issuerLineY)
    issuerLineY += 4
  }
  doc.text(doc.splitTextToSize(fiscalTemplate.ivaCondition || '', issuerTextWidth).slice(0, 1), textX, issuerLineY)
  issuerLineY += 4
  doc.text(doc.splitTextToSize(`Domicilio comercial: ${fiscalTemplate.address || ''}`, issuerTextWidth).slice(0, 2), textX, issuerLineY)

  doc.setDrawColor(180, 180, 180)
  doc.rect(letterBoxX, y - 1, 26, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(voucherLetters[invoice.voucherType] || '?', pageWidth / 2, y + 8, { align: 'center' })
  doc.setFontSize(7)
  doc.text(voucherName, pageWidth / 2, y + 14, { align: 'center', maxWidth: 24 })
  doc.setFont('helvetica', 'normal')
  doc.text(`Código Nº ${voucherCodes[invoice.voucherType] || invoice.voucherType}`, pageWidth / 2, y + 21, { align: 'center', maxWidth: 24 })

  const issuerBoxX = pageWidth / 2 + 19
  doc.rect(issuerBoxX, y - 1, right - issuerBoxX, 30)
  doc.setFontSize(7.5)
  doc.text(`Nº ${String(invoice.pointOfSale).padStart(5, '0')}-${String(invoice.voucherNumber).padStart(8, '0')}`, issuerBoxX + 2, y + 4)
  doc.text(`Fecha: ${printableDate(payload.voucher?.date)}`, issuerBoxX + 2, y + 9)
  doc.text(`CUIT: ${fiscalTemplate.issuerCuit}`, issuerBoxX + 2, y + 14)
  doc.text(`Ingresos Brutos: ${fiscalTemplate.grossIncomeRegistration || ''}`, issuerBoxX + 2, y + 19, { maxWidth: right - issuerBoxX - 4 })
  doc.text(`Inicio actividades: ${printableDate(fiscalTemplate.startActivity)}`, issuerBoxX + 2, y + 24)
  y += 35

  doc.setDrawColor(215, 215, 215)
  doc.line(margin, y, right, y)
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('ORIGINAL', pageWidth / 2, y, { align: 'center' })
  doc.text(`${voucherName} · ${String(invoice.pointOfSale).padStart(5, '0')}-${String(invoice.voucherNumber).padStart(8, '0')}`, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha: ${printableDate(payload.voucher?.date)}`, right, y, { align: 'right' })
  y += 6
  doc.text(`Condición frente al IVA del receptor: ${typeof payload.customer?.vatCondition === 'number' ? receiverVatConditions[payload.customer.vatCondition] || `Código ${payload.customer.vatCondition}` : 'No informada'}`, margin, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text(payload.customer?.vatCondition === 5 ? 'A CONSUMIDOR FINAL' : 'RECEPTOR', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(payload.customer?.name || 'Consumidor / receptor', margin, y + 5)
  doc.text(`Documento: ${typeof payload.customer?.docType === 'number' ? documentTypes[payload.customer.docType] || `tipo ${payload.customer.docType}` : '—'} · ${payload.customer?.docNumber}`, margin, y + 10)
  if (payload.customer?.address) doc.text(`Domicilio: ${payload.customer.address}`, margin, y + 15, { maxWidth: right - margin })
  if (payload.voucher?.saleCondition) doc.text(`Condición de venta: ${payload.voucher.saleCondition}`, right, y + (payload.customer?.address ? 20 : 15), { align: 'right' })
  y += payload.voucher?.saleCondition ? (payload.customer?.address ? 28 : 23) : (payload.customer?.address ? 23 : 18)

  const conceptNames: Record<number, string> = { 1: 'Productos', 2: 'Servicios', 3: 'Productos y servicios' }
  doc.text(`Concepto: ${conceptNames[payload.voucher?.concept ?? 0] || 'No informado'}`, margin, y)
  y += 6

  if (payload.voucher?.concept === 2 || payload.voucher?.concept === 3) {
    doc.setFontSize(8)
    doc.text(`Período de servicio: ${printableDate(payload.voucher.serviceFrom)} al ${printableDate(payload.voucher.serviceTo)}`, margin, y)
    doc.text(`Vencimiento de pago: ${printableDate(payload.voucher.paymentDueDate)}`, right, y, { align: 'right' })
    y += 7
  }

  const col = { description: margin + 2, quantity: right - 88, unit: right - 66, discount: right - 45, vat: right - 25, total: right - 2 }
  doc.setFillColor(...rgb)
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Descripción', col.description, y + 5)
  doc.text('Cant.', col.quantity, y + 5, { align: 'right' })
  doc.text('Unitario', col.unit, y + 5, { align: 'right' })
  doc.text('Bonif.', col.discount, y + 5, { align: 'right' })
  doc.text('IVA', col.vat, y + 5, { align: 'right' })
  doc.text('Importe', col.total, y + 5, { align: 'right' })
  y += 8
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'normal')
  for (const item of payload.items || []) {
    const lines = doc.splitTextToSize(item.description || 'Ítem', col.quantity - col.description - 5)
    const rowHeight = Math.max(7, lines.length * 4 + 3)
    if (y + rowHeight > 230) {
      doc.addPage()
      y = 18
    }
    doc.setDrawColor(230, 230, 230)
    doc.line(margin, y + rowHeight, right, y + rowHeight)
    doc.text(lines, col.description, y + 4)
    doc.text(`${item.quantity}${item.unit ? ` ${item.unit}` : ''}`, col.quantity, y + 4, { align: 'right' })
    doc.text(money(item.unitPrice), col.unit, y + 4, { align: 'right' })
    if (item.discountAmount) doc.text(money(item.discountAmount), col.discount, y + 4, { align: 'right' })
    doc.text(typeof item.vatRate === 'number' ? `${item.vatRate}%` : (item.exemptAmount ?? 0) > 0 ? 'Exento' : '—', col.vat, y + 4, { align: 'right' })
    doc.text(money(item.totalAmount), col.total, y + 4, { align: 'right' })
    y += rowHeight
  }

  y = Math.max(y + 8, 190)
  const amounts = payload.amounts!
  doc.setFontSize(8)
  doc.setTextColor(50, 50, 50)
  doc.text(`Subtotal neto gravado: ${money(amounts.net ?? 0)}`, right, y, { align: 'right' }); y += 5
  if ([6, 11].includes(invoice.voucherType) && payload.customer?.vatCondition === 5) {
    doc.setFont('helvetica', 'bold')
    doc.text('Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)', right, y, { align: 'right' }); y += 4
    doc.setFont('helvetica', 'normal')
    doc.text(`IVA contenido: ${money(amounts.vat ?? 0)}`, right, y, { align: 'right' }); y += 4
    if (typeof amounts.otherNationalIndirectTaxes === 'number') {
      doc.text(`Otros impuestos nacionales indirectos: ${money(amounts.otherNationalIndirectTaxes)}`, right, y, { align: 'right' }); y += 4
    }
  } else if (invoice.voucherType !== 11 && (amounts.vat ?? 0) > 0) {
    doc.text('IVA discriminado:', right, y, { align: 'right' }); y += 4
    for (const rate of effectiveVatBreakdown(payload)) {
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
  doc.text('Comprobante Autorizado', margin, y + 10)
  const qrUrl = officialQr(invoice)
  const qrData = await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'M', margin: 1, width: 160 })
  doc.addImage(qrData, 'PNG', right - 28, y - 2, 27, 27)
  doc.setFontSize(7)
  doc.text('Código QR fiscal ARCA', right - 14, y + 28, { align: 'center' })
  doc.setFontSize(8)
  const footer = [template.footerText, template.showWebsite ? template.website : '', template.showWhatsapp ? template.whatsapp : ''].filter(Boolean).join(' · ')
  if (footer) doc.text(footer, margin, Math.min(y + 14, 276), { maxWidth: right - margin - 35 })
}

export async function buildFiscalInvoicePdfBlob(invoice: FiscalPdfInvoice, template: FiscalPdfTemplate) {
  const missing = validate(invoice, template)
  if (missing.length) throw new Error(`No se puede generar una representación fiscal todavía. Falta completar: ${missing.join(', ')}. Completá y verificá los datos fiscales antes de exportar.`)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let logoData: string | undefined
  if (template.logoUrl) logoData = await imageUrlToPng(template.logoUrl)
  await addInvoicePage(doc, invoice, template, logoData)
  return doc.output('blob') as Blob
}

export async function downloadFiscalInvoicePdf(invoice: FiscalPdfInvoice, template: FiscalPdfTemplate) {
  const blob = await buildFiscalInvoicePdfBlob(invoice, template)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `factura-${invoice.pointOfSale.toString().padStart(5, '0')}-${invoice.voucherNumber}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
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
