'use client'

import { QRCodeSVG } from 'qrcode.react'
import type { FiscalPdfInvoice, FiscalPdfTemplate } from '@/lib/fiscal-invoice-pdf'

type Props = {
  invoices: FiscalPdfInvoice[]
  template: FiscalPdfTemplate
  previewMode?: boolean
  interactive?: boolean
  onSelectArea?: (area: 'identity' | 'fiscal' | 'design' | 'footer') => void
  selectedArea?: 'identity' | 'fiscal' | 'design' | 'footer'
}

const voucherNames: Record<number, string> = { 1: 'FACTURA A', 6: 'FACTURA B', 11: 'FACTURA C', 51: 'FACTURA M' }
const voucherLetters: Record<number, string> = { 1: 'A', 6: 'B', 11: 'C', 51: 'M' }
const voucherCodes: Record<number, string> = { 1: '001', 6: '006', 11: '011', 51: '051' }
const vatConditions: Record<number, string> = { 1: 'IVA Responsable Inscripto', 4: 'IVA Sujeto Exento', 5: 'Consumidor Final', 6: 'Responsable Monotributo', 13: 'Monotributista Social' }
const documentTypes: Record<number, string> = { 80: 'CUIT', 86: 'CUIL', 87: 'CDI', 96: 'DNI', 99: 'Consumidor Final' }

function formatMoney(value: number | undefined, currency = 'ARS') {
  const displayCurrency = currency === 'PES' ? 'ARS' : currency === 'DOL' ? 'USD' : /^[A-Z]{3}$/.test(currency) ? currency : 'ARS'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: displayCurrency, minimumFractionDigits: 2 }).format(value ?? 0)
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const normalized = /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value.slice(0, 10)
  const [year, month, day] = normalized.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function getQrUrl(invoice: FiscalPdfInvoice) {
  const payload = invoice.documentSnapshot
    ? { voucher: { ...invoice.payload?.voucher, ...invoice.documentSnapshot.invoice }, amounts: invoice.documentSnapshot.amounts ?? invoice.payload?.amounts, customer: invoice.documentSnapshot.recipient ?? invoice.payload?.customer }
    : invoice.payload
  const date = payload?.voucher?.date
  const customer = payload?.customer
  const total = payload?.amounts?.total
  if (!date || !customer?.docType || !customer.docNumber || total === undefined || !invoice.cae || !invoice.voucherNumber) return null
  const qrData = {
    ver: 1,
    fecha: /^\d{8}$/.test(date) ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : date,
    cuit: Number(invoice.cuit),
    ptoVta: invoice.pointOfSale,
    tipoCmp: invoice.voucherType,
    nroCmp: invoice.voucherNumber,
    importe: total,
    moneda: invoice.currency === 'ARS' ? 'PES' : invoice.currency || 'PES',
    ctz: 1,
    tipoDocRec: customer.docType,
    nroDocRec: Number(customer.docNumber),
    tipoCodAut: 'E',
    codAut: Number(invoice.cae),
  }
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(qrData))))
  return `https://www.arca.gob.ar/fe/qr/?p=${encoded}`
}

function InvoiceDocument({ invoice, template, previewMode = false, interactive = false, onSelectArea, selectedArea }: Omit<Props, 'invoices'> & { invoice: FiscalPdfInvoice }) {
  const snapshot = invoice.documentSnapshot
  const payload = snapshot
    ? { voucher: { ...invoice.payload?.voucher, ...snapshot.invoice }, amounts: snapshot.amounts ?? invoice.payload?.amounts, items: snapshot.items ?? invoice.payload?.items, customer: snapshot.recipient ?? invoice.payload?.customer }
    : invoice.payload
  const savedTemplate = invoice.pdfTemplateSnapshot ?? template
  const emitter = snapshot?.emitter
  const issuerName = emitter?.razonSocial || savedTemplate.legalName || ''
  const issuerCuit = emitter?.cuit || savedTemplate.issuerCuit || invoice.cuit
  const address = [savedTemplate.address, savedTemplate.locality, savedTemplate.province].filter(Boolean).join(', ')
  const letter = voucherLetters[invoice.voucherType] || '?'
  const currency = invoice.currency || 'ARS'
  const vatRows = payload?.amounts?.vatBreakdown ?? []
  const accent = /^#[0-9a-fA-F]{6}$/.test(savedTemplate.primaryColor || '') ? savedTemplate.primaryColor! : '#202833'
  const qrUrl = getQrUrl(invoice)
  const selectArea = (area: 'identity' | 'fiscal' | 'design' | 'footer', role: 'button' | 'none' = 'button') => interactive ? {
    ...(role === 'button' ? { role: 'button' as const } : {}),
    tabIndex: 0,
    'aria-label': `Editar ${area === 'identity' ? 'identidad comercial' : area === 'fiscal' ? 'datos fiscales' : area === 'design' ? 'presentación' : 'pie de factura'}`,
    onClick: () => onSelectArea?.(area),
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectArea?.(area) }
    },
    className: `fiscal-editable-area${selectedArea === area ? ' is-selected' : ''}`,
  } : {}

  return (
    <article className={`fiscal-invoice-sheet variant-${savedTemplate.designVariant || 'classic'}`} style={{ '--invoice-accent': accent } as React.CSSProperties}>
      <header className="fiscal-invoice-header">
        <div className="fiscal-invoice-issuer" {...selectArea('identity')}>
          {savedTemplate.logoUrl && <img className="fiscal-invoice-logo" src={savedTemplate.logoUrl} alt="" />}
          <div>
            <h2>{issuerName}</h2>
            {savedTemplate.commercialName && savedTemplate.commercialName !== issuerName && <p>{savedTemplate.commercialName}</p>}
            <p>{emitter?.condicionIva || savedTemplate.ivaCondition || ''}</p>
            <p>Domicilio comercial: {address || '—'}</p>
            <p>CUIT: {issuerCuit}</p>
          </div>
        </div>
        <div className="fiscal-invoice-letter" {...selectArea('design')}><strong>{letter}</strong><span>{voucherNames[invoice.voucherType] || 'COMPROBANTE'}</span><small>Código Nº {voucherCodes[invoice.voucherType] || invoice.voucherType}</small></div>
        <div className="fiscal-invoice-number" {...selectArea('fiscal')}><strong>{previewMode ? 'Numeración pendiente de ARCA' : `Nº ${String(invoice.pointOfSale).padStart(5, '0')}-${String(invoice.voucherNumber).padStart(8, '0')}`}</strong><span>Fecha: {formatDate(payload?.voucher?.date)}</span><span>Condición IVA: {emitter?.condicionIva || savedTemplate.ivaCondition || '—'}</span><span>Inicio actividades: {emitter?.inicioActividad || savedTemplate.startActivity || '—'}</span></div>
      </header>

      <section className="fiscal-invoice-recipient" {...selectArea('fiscal')}>
        <div><span>Señor/a</span><strong>{payload?.customer?.name || '—'}</strong></div>
        <div><span>{documentTypes[payload?.customer?.docType || 0] || 'Documento'}</span><strong>{payload?.customer?.docNumber || '—'}</strong></div>
        <div><span>Condición frente al IVA</span><strong>{vatConditions[payload?.customer?.vatCondition || 0] || '—'}</strong></div>
        <div><span>Domicilio</span><strong>{payload?.customer?.address || '—'}</strong></div>
        <div><span>Condición de venta</span><strong>{payload?.voucher?.saleCondition || '—'}</strong></div>
      </section>

      <table className="fiscal-invoice-items" {...selectArea('design', 'none')}>
        <thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th></tr></thead>
        <tbody>{(payload?.items || []).map((item, index) => <tr key={`${index}-${item.description}`}><td>{item.description}</td><td>{item.quantity} {item.unit || ''}</td><td>{formatMoney(item.unitPrice, currency)}</td><td>{formatMoney(item.netAmount, currency)}</td></tr>)}</tbody>
      </table>

      <section className="fiscal-invoice-totals">
        <div className="fiscal-invoice-tax-breakdown">
          {typeof payload?.amounts?.net === 'number' && <p><span>Neto gravado</span><strong>{formatMoney(payload.amounts.net, currency)}</strong></p>}
          {typeof payload?.amounts?.exempt === 'number' && payload.amounts.exempt > 0 && <p><span>Operaciones exentas</span><strong>{formatMoney(payload.amounts.exempt, currency)}</strong></p>}
          {typeof payload?.amounts?.nonTaxable === 'number' && payload.amounts.nonTaxable > 0 && <p><span>No gravado</span><strong>{formatMoney(payload.amounts.nonTaxable, currency)}</strong></p>}
          {vatRows.map(row => <p key={row.rate}><span>IVA {row.rate}%</span><strong>{formatMoney(row.amount, currency)}</strong></p>)}
          {typeof payload?.amounts?.otherNationalIndirectTaxes === 'number' && payload.amounts.otherNationalIndirectTaxes > 0 && <p><span>Otros impuestos nacionales</span><strong>{formatMoney(payload.amounts.otherNationalIndirectTaxes, currency)}</strong></p>}
        </div>
        <p className="fiscal-invoice-total"><span>TOTAL</span><strong>{formatMoney(payload?.amounts?.total, currency)}</strong></p>
      </section>

      <footer className="fiscal-invoice-legal-footer" {...selectArea('fiscal')}>
        <div>{previewMode ? <p>Sin emitir · autorización pendiente de ARCA</p> : <><p>CAE: <strong>{invoice.cae}</strong></p><p>Vencimiento CAE: <strong>{formatDate(invoice.caeExpiresAt)}</strong></p><p>Comprobante autorizado</p></>}</div>
        {qrUrl && <QRCodeSVG value={qrUrl} size={92} level="M" aria-label="Código QR de validación de ARCA" />}
      </footer>
      {savedTemplate.footerText && <p className="fiscal-invoice-custom-footer" {...selectArea('footer')}>{savedTemplate.footerText}</p>}
      {previewMode && <div className="fiscal-invoice-preview-stamp">VISTA PREVIA · SIN VALOR FISCAL</div>}
    </article>
  )
}

export default function FiscalInvoiceDocument({ invoices, template, previewMode = false, interactive = false, onSelectArea, selectedArea }: Props) {
  return <div className="fiscal-print-root"><style jsx global>{`
    .fiscal-print-root { color: #17202b; font-family: Arial, Helvetica, sans-serif; }
    .fiscal-invoice-sheet { --invoice-accent: #202833; width: min(100%, 210mm); min-height: 270mm; margin: 0 auto 24px; padding: 15mm; background: #fff; box-shadow: 0 8px 28px #17202b1a; font-size: 10pt; line-height: 1.4; }
    .fiscal-invoice-sheet * { box-sizing: border-box; }
    .fiscal-invoice-header { display: grid; grid-template-columns: 1fr 25mm 1fr; gap: 4mm; border-top: 2px solid var(--invoice-accent); padding-top: 7mm; align-items: stretch; }
    .variant-modern .fiscal-invoice-header { border-top-width: 5mm; }
    .variant-editorial .fiscal-invoice-header { border-top-width: 1px; box-shadow: inset 3mm 0 var(--invoice-accent); padding-left: 5mm; }
    .fiscal-invoice-issuer { display: flex; gap: 4mm; min-width: 0; }
    .fiscal-invoice-issuer h2 { margin: 0 0 2mm; font-size: 13pt; }
    .fiscal-invoice-issuer p { margin: 0 0 1mm; }
    .fiscal-invoice-logo { width: 18mm; height: 18mm; object-fit: contain; }
    .fiscal-invoice-letter, .fiscal-invoice-number { border: 1px solid #a8afb7; padding: 2.5mm; display: flex; flex-direction: column; gap: 1.5mm; }
    .fiscal-invoice-letter { text-align: center; align-items: center; }
    .fiscal-invoice-letter strong { font-size: 20pt; line-height: 1; }
    .fiscal-invoice-letter span { font-weight: 700; font-size: 8pt; }
    .fiscal-invoice-letter small { font-size: 7pt; }
    .fiscal-invoice-number { font-size: 8pt; }
    .fiscal-invoice-recipient { display: grid; grid-template-columns: 1.2fr .8fr 1fr; gap: 3mm 5mm; padding: 6mm 0; margin-top: 6mm; border-top: 1px solid #cbd0d6; border-bottom: 1px solid #cbd0d6; }
    .fiscal-invoice-recipient div { display: flex; flex-direction: column; overflow-wrap: anywhere; }
    .fiscal-invoice-recipient span { color: #59636e; font-size: 8pt; }
    .fiscal-invoice-items { width: 100%; border-collapse: collapse; margin-top: 6mm; }
    .fiscal-invoice-items thead { display: table-header-group; }
    .fiscal-invoice-items th { text-align: left; background: #f1f3f5; border-bottom: 1px solid #a8afb7; padding: 2.5mm; font-size: 8pt; }
    .fiscal-invoice-items td { border-bottom: 1px solid #e1e4e8; padding: 3mm 2.5mm; vertical-align: top; overflow-wrap: anywhere; }
    .fiscal-invoice-items th:nth-child(n+2), .fiscal-invoice-items td:nth-child(n+2) { text-align: right; white-space: nowrap; }
    .fiscal-invoice-totals { display: flex; justify-content: flex-end; gap: 12mm; margin-top: 7mm; break-inside: avoid; page-break-inside: avoid; }
    .fiscal-invoice-tax-breakdown { min-width: 65mm; }
    .fiscal-invoice-tax-breakdown p, .fiscal-invoice-total { display: flex; justify-content: space-between; gap: 8mm; margin: 0; padding: 1mm 0; }
    .fiscal-invoice-total { min-width: 60mm; border-top: 2px solid var(--invoice-accent); padding-top: 2.5mm; font-size: 14pt; font-weight: 700; align-self: flex-end; }
    .fiscal-invoice-legal-footer { display: flex; justify-content: space-between; align-items: flex-end; gap: 8mm; margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #a8afb7; break-inside: avoid; page-break-inside: avoid; font-size: 8pt; }
    .fiscal-invoice-legal-footer p { margin: 0 0 1mm; }
    .fiscal-invoice-custom-footer { margin-top: 5mm; text-align: center; color: #59636e; font-size: 8pt; }
    .fiscal-invoice-preview-stamp { margin-top: 8mm; padding: 2mm; border: 1px solid #cbd0d6; color: #59636e; text-align: center; font-size: 8pt; font-weight: 700; letter-spacing: .08em; }
    .fiscal-editable-area { cursor: pointer; }
    .fiscal-editable-area:hover, .fiscal-editable-area:focus-visible, .fiscal-editable-area.is-selected { outline: 2px solid #c2103f; outline-offset: 2px; }
    @media print {
      @page { size: A4; margin: 12mm; }
      body * { visibility: hidden !important; }
      .fiscal-print-root, .fiscal-print-root * { visibility: visible !important; }
      .fiscal-print-root { position: absolute; inset: 0; width: 100%; }
      .fiscal-invoice-sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; break-after: page; page-break-after: always; }
      .fiscal-invoice-sheet:last-child { break-after: auto; page-break-after: auto; }
      .fiscal-invoice-items tr { break-inside: avoid; page-break-inside: avoid; }
      .fiscal-invoice-totals, .fiscal-invoice-legal-footer { break-inside: avoid; page-break-inside: avoid; }
    }
    @media screen and (max-width: 700px) {
      .fiscal-invoice-sheet { padding: 6mm; font-size: 8pt; }
      .fiscal-invoice-header { grid-template-columns: 1fr 18mm 1fr; gap: 2mm; }
      .fiscal-invoice-letter, .fiscal-invoice-number { padding: 1.5mm; font-size: 7pt; }
      .fiscal-invoice-recipient { grid-template-columns: 1fr 1fr; }
    }
  `}</style>{invoices.map(invoice => <InvoiceDocument key={invoice.id} invoice={invoice} template={template} previewMode={previewMode} interactive={interactive} onSelectArea={onSelectArea} selectedArea={selectedArea} />)}</div>
}
