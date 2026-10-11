import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client, getR2SensitiveBucketName } from '@/lib/r2'
import type { InvoiceRecipient } from './fiscal-invoice-calculation'

export {
  buildInvoiceDetails,
  deriveVoucherType,
  getFiscalWorkerConfig,
} from './fiscal-invoice-calculation'
export type { InvoiceRecipient } from './fiscal-invoice-calculation'

export async function createFiscalInvoicePdf(params: {
  orderId: string
  recipient: InvoiceRecipient
  items: Array<Record<string, any>>
  amounts: Record<string, number>
  voucher: { voucherType: number; voucherNumber: number; pointOfSale: number; cae: string; caeFchVto: string | Date; issuedAt: string | Date }
  issuer: Record<string, any>
}) {
  const { orderId, recipient, items, amounts, voucher, issuer } = params
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 18
  const issuedAtDate = voucher.issuedAt instanceof Date ? voucher.issuedAt : new Date(voucher.issuedAt)
  const caeExpiresAtDate = voucher.caeFchVto instanceof Date ? voucher.caeFchVto : new Date(voucher.caeFchVto)
  const issuerName = String(issuer.razonSocial || issuer.name || 'Emisor')
  const issuerCuit = String(issuer.cuit || '')
  const issuerAddress = String(issuer.domicilioFiscal || '')
  const voucherLetter = voucher.voucherType === 1 ? 'A' : voucher.voucherType === 6 ? 'B' : voucher.voucherType === 11 ? 'C' : String(voucher.voucherType)
  const isInvoiceA = voucher.voucherType === 1
  const isInvoiceC = voucher.voucherType === 11
  const issuerVatLabels: Record<string, string> = { RESP_INSCRIPTO: 'IVA RESPONSABLE INSCRIPTO', MONOTRIBUTO: 'RESPONSABLE MONOTRIBUTO', EXENTO: 'IVA EXENTO', NO_RESPONSABLE: 'NO RESPONSABLE IVA' }
  const recipientVatLabels: Record<number, string> = { 1: 'IVA Responsable Inscripto', 4: 'IVA Sujeto Exento', 5: 'Consumidor final', 6: 'Responsable Monotributo', 13: 'Monotributista social', 15: 'IVA no alcanzado', 16: 'Monotributo trabajador independiente promovido' }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('Representación impresa del comprobante electrónico', 14, y)
  doc.setFontSize(10)
  doc.text(`Factura ${voucherLetter}`, pageWidth - 14, y, { align: 'right' })
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.text(issuerName, 14, y); y += 5
  doc.text(`CUIT: ${issuerCuit}`, 14, y); y += 5
  doc.text(issuerAddress, 14, y); y += 5
  const issuerVatCondition = String(issuer.condicionIva || '').toUpperCase()
  if (issuerVatCondition) { doc.text(issuerVatLabels[issuerVatCondition] || issuerVatCondition, 14, y); y += 5 }
  if (issuer.ingresosBrutos) { doc.text(`Ingresos Brutos: ${issuer.ingresosBrutos}`, 14, y); y += 5 }
  if (issuer.inicioActividad) { doc.text(`Inicio de actividades: ${new Date(issuer.inicioActividad).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`, 14, y); y += 5 }
  y += 3
  doc.setFont('helvetica', 'bold')
  doc.text(`Punto de venta: ${voucher.pointOfSale} · Comprobante: ${String(voucher.voucherNumber).padStart(8, '0')}`, 14, y); y += 6
  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha: ${issuedAtDate.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`, 14, y); y += 9
  doc.setFont('helvetica', 'bold'); doc.text('Receptor', 14, y); y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(recipient.name, 14, y); y += 5
  doc.text(`Documento: ${recipient.docNumber || 'Consumidor final'}`, 14, y); y += 5
  doc.text(`Condición frente al IVA: ${recipientVatLabels[recipient.vatCondition] || recipient.vatCondition}`, 14, y); y += 5
  if (recipient.address) { doc.text(`Domicilio: ${recipient.address}`, 14, y); y += 5 }
  if (recipient.city || recipient.province) { doc.text([recipient.city, recipient.province].filter(Boolean).join(', '), 14, y); y += 5 }
  y += 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Detalle comercial del pedido', 14, y); y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Los artículos y descuentos describen la operación comercial. El CAE y el QR identifican el comprobante autorizado por ARCA.', 14, y); y += 6
  doc.setFontSize(10)

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold')
    doc.text('Artículo', 14, y)
    doc.text('Cant.', 101, y, { align: 'right' })
    if (isInvoiceA) {
      doc.text('P. neto', 124, y, { align: 'right' })
      doc.text('Desc.', 146, y, { align: 'right' })
      doc.text('Base', 166, y, { align: 'right' })
      doc.text('IVA', 182, y, { align: 'right' })
    } else {
      doc.text('P. unitario', 139, y, { align: 'right' })
      doc.text('Desc.', 166, y, { align: 'right' })
    }
    doc.text('Total', pageWidth - 14, y, { align: 'right' })
    y += 3
    doc.line(14, y, pageWidth - 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
  }
  drawHeader()
  for (const item of items) {
    const taxLabel = item.exemptAmount > 0 ? 'Exento' : item.nonTaxableAmount > 0 ? 'No gravado' : `IVA ${item.vatRate ?? 0}%`
    const description = isInvoiceA ? `${String(item.description)} · ${taxLabel}` : String(item.description)
    const lines = doc.splitTextToSize(description, isInvoiceA ? 74 : 88)
    if (y + Math.max(6, lines.length * 4) > 250) { doc.addPage(); y = 18; drawHeader() }
    doc.text(lines, 14, y)
    doc.text(String(item.quantity), 101, y, { align: 'right' })
    if (isInvoiceA) {
      const rate = Number(item.vatRate || 0)
      const divisor = item.netAmount > 0 && item.vatAmount > 0 && rate > 0 ? 1 + rate / 100 : 1
      const netUnitPrice = Number(item.unitPrice) / divisor
      const netDiscount = Number(item.discountAmount || 0) / divisor
      const lineBase = Number(item.netAmount || 0) + Number(item.exemptAmount || 0) + Number(item.nonTaxableAmount || 0)
      const lineVat = Number(item.vatAmount || 0)
      doc.text(netUnitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 124, y, { align: 'right' })
      doc.text(netDiscount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 146, y, { align: 'right' })
      doc.text(lineBase.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 166, y, { align: 'right' })
      doc.text(lineVat.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 182, y, { align: 'right' })
      doc.text((lineBase + lineVat).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), pageWidth - 14, y, { align: 'right' })
    } else {
      doc.text(Number(item.unitPrice).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 139, y, { align: 'right' })
      doc.text(Number(item.discountAmount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 166, y, { align: 'right' })
      doc.text(Number(item.totalAmount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), pageWidth - 14, y, { align: 'right' })
    }
    y += Math.max(6, lines.length * 4)
  }

  if (y > 245) { doc.addPage(); y = 18 }
  y += 4
  doc.line(105, y, pageWidth - 14, y); y += 7
  doc.setFont('helvetica', 'normal')
  if (isInvoiceA) {
    doc.text(`Neto gravado: $${amounts.net.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, pageWidth - 14, y, { align: 'right' }); y += 5
    doc.text(`IVA: $${amounts.vat.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, pageWidth - 14, y, { align: 'right' }); y += 5
    doc.text(`Exento: $${amounts.exempt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, pageWidth - 14, y, { align: 'right' }); y += 5
    doc.text(`No gravado: $${amounts.nonTaxable.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, pageWidth - 14, y, { align: 'right' }); y += 6
  } else {
    doc.text(isInvoiceC ? 'Subtotal (Factura C, sin IVA discriminado)' : 'Total de la operación (IVA incluido)', pageWidth - 14, y, { align: 'right' }); y += 5
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`TOTAL: $${amounts.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, pageWidth - 14, y, { align: 'right' }); y += 8
  doc.setFontSize(9)
  doc.text(`CAE: ${voucher.cae}`, 14, y); y += 5
  doc.text(`Vencimiento CAE: ${caeExpiresAtDate.toLocaleDateString('es-AR')}`, 14, y); y += 8

  if (y + 32 > 280) { doc.addPage(); y = 18 }
  const qrDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(issuedAtDate)
  const qrPayload = {
    ver: 1,
    fecha: qrDate,
    cuit: Number(issuerCuit),
    ptoVta: voucher.pointOfSale,
    tipoCmp: voucher.voucherType,
    nroCmp: voucher.voucherNumber,
    importe: Number(amounts.total.toFixed(2)),
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: recipient.docType,
    nroDocRec: Number(recipient.docNumber || 0),
    tipoCodAut: 'E',
    codAut: Number(voucher.cae),
  }
  const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(qrPayload)).toString('base64')}`
  const qr = await QRCode.toDataURL(qrUrl, { margin: 1, width: 220 })
  doc.addImage(qr, 'PNG', 14, y, 28, 28)
  doc.setFont('helvetica', 'normal')
  doc.text('Representación impresa de comprobante electrónico.', 46, y + 8)
  doc.text(`Referencia interna: pedido ${orderId}`, 46, y + 14)

  const objectKey = `invoices/${orderId}/${voucher.voucherType}-${voucher.pointOfSale}-${voucher.voucherNumber}.pdf`
  const pdf = doc.output('arraybuffer')
  await getR2Client().send(new PutObjectCommand({
    Bucket: getR2SensitiveBucketName(),
    Key: objectKey,
    Body: Buffer.from(pdf),
    ContentType: 'application/pdf',
    CacheControl: 'private, max-age=0, no-store',
  }))
  return { objectKey, fileName: `Factura-${voucherLetter}-${voucher.pointOfSale}-${voucher.voucherNumber}.pdf` }
}
