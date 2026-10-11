'use client'

import { useState, type FormEvent } from 'react'
import { Download, FileCheck2, FileText, LoaderCircle, RefreshCw } from 'lucide-react'

type Props = {
  orderId: string
  canRequest: boolean
  fiscalClassificationReady: boolean
  fiscalPreviewError: string | null
  previewItems: Array<Record<string, any>>
  previewAmounts: Record<string, number> | null
  invoiceSource: string | null
  invoiceStatus: string | null
  invoicePdfStatus: string | null
  invoiceFiscalJobId: string | null
  invoiceCae: string | null
  invoiceVoucherType: string | null
  invoiceObjectKey: string | null
  invoiceUrl: string | null
  invoiceError: string | null
  defaultName: string
  defaultDocumentId: string
  defaultAddress: string
  defaultCity: string
  defaultProvince: string
  issuerVatCondition: string | null
}

const VAT_CONDITIONS = [
  { value: 1, label: 'IVA Responsable Inscripto' },
  { value: 4, label: 'IVA Sujeto Exento' },
  { value: 5, label: 'Consumidor final' },
  { value: 6, label: 'Responsable Monotributo' },
  { value: 13, label: 'Monotributista social' },
  { value: 15, label: 'IVA no alcanzado' },
  { value: 16, label: 'Monotributo trabajador independiente promovido' },
]

function voucherType(issuerCondition: string | null, recipientCondition: number) {
  if (issuerCondition === 'MONOTRIBUTO' || issuerCondition === 'EXENTO') return 'C'
  if (issuerCondition === 'RESP_INSCRIPTO') return recipientCondition === 1 ? 'A' : 'B'
  return null
}

export default function InvoiceRequestPanel(props: Props) {
  const digits = props.defaultDocumentId.replace(/\D/g, '')
  const initialDocType = digits.length === 11 ? '80' : digits.length >= 7 && digits.length <= 8 ? '96' : '99'
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(props.invoiceStatus || '')
  const [pdfStatus, setPdfStatus] = useState(props.invoicePdfStatus || '')
  const [jobId, setJobId] = useState(props.invoiceFiscalJobId || '')
  const [cae, setCae] = useState(props.invoiceCae || '')
  const [pdfAvailable, setPdfAvailable] = useState(Boolean(props.invoiceObjectKey))
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [recipient, setRecipient] = useState({
    name: props.defaultName,
    docType: initialDocType,
    docNumber: initialDocType === '99' ? '0' : digits,
    vatCondition: 5,
    address: props.defaultAddress,
    city: props.defaultCity,
    province: props.defaultProvince,
  })

  const selectedVoucherType = voucherType(props.issuerVatCondition, recipient.vatCondition)
  const updateRecipient = (field: keyof typeof recipient, value: string | number) => {
    setRecipient(current => ({ ...current, [field]: value } as typeof recipient))
    setError('')
  }

  async function syncInvoice() {
    if (!jobId) {
      setError('Todavía no tenemos el identificador fiscal. Abrí el formulario y reintentá con los mismos datos; la clave de idempotencia evita duplicar la emisión.')
      setOpen(true)
      return
    }
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/orders/${props.orderId}/invoice/sync`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo consultar el estado fiscal.')
      setStatus(data.status || status)
      if (data.cae) setCae(data.cae)
      setPdfStatus(data.pdfStatus || '')
      setMessage(data.message || '')
      if (data.status === 'ISSUED' && data.pdfStatus === 'READY') {
        setCae(current => current || props.invoiceCae || '')
        setPdfAvailable(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el estado.')
    } finally {
      setBusy(false)
    }
  }

  async function submitInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/orders/${props.orderId}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo iniciar la emisión.')
      setStatus(data.status || 'PROCESSING')
      if (data.jobId) setJobId(data.jobId)
      setMessage(data.message || 'Solicitud fiscal registrada.')
      setOpen(false)
      if (data.jobId) {
        const syncResponse = await fetch(`/api/orders/${props.orderId}/invoice/sync`, { method: 'POST' })
        const syncData = await syncResponse.json()
        if (syncResponse.ok) {
          setStatus(syncData.status || data.status || 'PROCESSING')
          if (syncData.cae) setCae(syncData.cae)
          setPdfStatus(syncData.pdfStatus || '')
          setMessage(syncData.message || data.message || '')
          if (syncData.status === 'ISSUED' && syncData.pdfStatus === 'READY') {
            setCae(syncData.cae || data.cae || props.invoiceCae || '')
            setPdfAvailable(true)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la emisión.')
      if (!status) setOpen(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card space-y-4 p-5" aria-labelledby="invoice-request-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF1F5] text-[#ED164F]"><FileText size={20} /></span>
        <div className="min-w-0 flex-1">
          <h2 id="invoice-request-title" className="font-bold text-gray-900">Facturación</h2>
          <p className="mt-1 text-sm text-gray-500">La factura se solicita por separado. Antes de emitir, confirmás los datos del receptor y el tipo de comprobante.</p>
        </div>
      </div>

      {props.invoiceSource === 'MANUAL' && props.invoiceUrl && !cae && (
        <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
          Este pedido tiene un comprobante adjuntado manualmente. Para evitar una posible factura duplicada, la emisión automática no está habilitada para este pedido.
          <a href={`/api/orders/${props.orderId}/invoice/download`} className="mt-3 inline-flex items-center gap-2 font-semibold text-[#ED164F]"><Download size={15} /> Descargar comprobante</a>
        </div>
      )}

      {cae && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-emerald-900"><FileCheck2 size={18} /> Factura emitida por ARCA</p>
          <p className="mt-2 text-sm text-emerald-800">CAE: <span className="font-mono font-semibold">{cae}</span></p>
          {pdfAvailable ? (
            <a href={`/api/orders/${props.orderId}/invoice/download`} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#ED164F] px-4 py-2 text-sm font-semibold text-white"><Download size={15} /> Descargar factura PDF</a>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-emerald-800">{pdfStatus === 'FAILED' ? 'El PDF necesita recuperarse. La factura ya está emitida y no se volverá a emitir.' : 'La factura está emitida; el PDF se está preparando.'}</p>
              <button type="button" disabled={busy} onClick={syncInvoice} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-60">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />} Recuperar PDF</button>
            </div>
          )}
        </div>
      )}

      {!cae && status === 'PROCESSING' && (
        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">Solicitud en proceso</p>
          <p className="mt-1 text-sm text-blue-800">Todavía no confirmamos la autorización de ARCA. No se iniciará una segunda emisión.</p>
          <button type="button" disabled={busy} onClick={syncInvoice} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-900 disabled:opacity-60">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />} Actualizar estado</button>
        </div>
      )}


      {!cae && status === 'ISSUED' && (
        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">La emisión está confirmada; falta recuperar sus datos o el PDF.</p>
          <button type="button" disabled={busy} onClick={syncInvoice} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-900 disabled:opacity-60">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />} Recuperar factura</button>
        </div>
      )}

      {!cae && status === 'FAILED' && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">La solicitud fiscal requiere revisión</p>
          {props.invoiceError && <p className="mt-1">{props.invoiceError}</p>}
          <p className="mt-1">Para evitar duplicados, no vamos a repetir la emisión automáticamente. Contactanos para revisar el motivo antes de iniciar otro intento.</p>
        </div>
      )}

      {!cae && !status && props.invoiceSource !== 'MANUAL' && (
        <>
          {!props.canRequest ? (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">La factura estará disponible cuando el pedido esté confirmado y el pago corresponda.</p>
          ) : !props.fiscalClassificationReady ? (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No podemos emitir automáticamente porque uno o más artículos no tienen clasificación fiscal guardada en este pedido. No vamos a inferir el IVA; hace falta revisarlo.</p>
          ) : props.fiscalPreviewError ? (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{props.fiscalPreviewError}</p>
          ) : (
            <button type="button" onClick={() => setOpen(value => !value)} className="rounded-lg bg-[#ED164F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d91346]">{open ? 'Cerrar formulario' : 'Generar factura'}</button>
          )}
        </>
      )}

      {open && !cae && (
        <form onSubmit={submitInvoice} className="space-y-4 border-t border-gray-100 pt-4">

          {props.previewAmounts && props.previewItems.length > 0 && (
            <div className="space-y-3 rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Detalle que se va a facturar</p>
              <div className="divide-y divide-gray-100">
                {props.previewItems.map((item, index) => (
                  <div key={index} className="flex items-start justify-between gap-4 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">{item.description}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{item.quantity} × ${Number(item.unitPrice).toLocaleString('es-AR')} · {item.exemptAmount > 0 ? 'Exento' : item.nonTaxableAmount > 0 ? 'No gravado' : `IVA ${item.vatRate ?? 0}%`}{item.discountAmount > 0 ? ` · Descuento ${Number(item.discountAmount).toLocaleString('es-AR')}` : ''}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-gray-900">${Number(item.totalAmount).toLocaleString('es-AR')}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 border-t border-gray-100 pt-3 text-sm">
                {selectedVoucherType === 'C' ? (
                  <p className="text-gray-600">Factura C: el IVA no se discrimina en el comprobante.</p>
                ) : (
                  <>
                    <div className="flex justify-between"><span className="text-gray-500">Neto gravado</span><span>${props.previewAmounts.net.toLocaleString('es-AR')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">IVA informado</span><span>${props.previewAmounts.vat.toLocaleString('es-AR')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Exento</span><span>${props.previewAmounts.exempt.toLocaleString('es-AR')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">No gravado</span><span>${props.previewAmounts.nonTaxable.toLocaleString('es-AR')}</span></div>
                  </>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-2 font-bold"><span>Total del comprobante</span><span>${props.previewAmounts.total.toLocaleString('es-AR')}</span></div>
              </div>
            </div>
          )}
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-sm font-semibold text-gray-900">Comprobante a confirmar</p>
            <p className="mt-1 text-sm text-gray-600">{selectedVoucherType ? `Factura ${selectedVoucherType}` : 'Tipo de factura pendiente de validación fiscal'}</p>
            <p className="mt-1 text-xs text-gray-500">Los importes y artículos salen del pedido y no se pueden editar desde este formulario.</p>
          </div>
          <label className="block text-sm font-medium text-gray-700">Nombre o razón social<input required maxLength={200} value={recipient.name} onChange={e => updateRecipient('name', e.target.value)} className="input mt-1 w-full" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">Tipo de documento<select value={recipient.docType} onChange={e => { const docType = e.target.value; updateRecipient('docType', docType); if (docType === '99' || docType === '96') updateRecipient('vatCondition', 5); if (docType === '99') updateRecipient('docNumber', '0') }} className="input mt-1 w-full"><option value="80">CUIT</option><option value="96">DNI</option><option value="99">Consumidor final</option></select></label>
            <label className="block text-sm font-medium text-gray-700">Número de documento<input value={recipient.docNumber} disabled={recipient.docType === '99'} onChange={e => updateRecipient('docNumber', e.target.value)} className="input mt-1 w-full disabled:bg-gray-100" placeholder={recipient.docType === '80' ? '11 dígitos' : 'DNI'} /></label>
          </div>
          <label className="block text-sm font-medium text-gray-700">Condición frente al IVA<select value={recipient.vatCondition} onChange={e => updateRecipient('vatCondition', Number(e.target.value))} className="input mt-1 w-full">{VAT_CONDITIONS.filter(option => recipient.docType === '80' || option.value === 5).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-medium text-gray-700">Domicilio<input value={recipient.address} onChange={e => updateRecipient('address', e.target.value)} className="input mt-1 w-full" /></label>
            <label className="block text-sm font-medium text-gray-700">Localidad<input value={recipient.city} onChange={e => updateRecipient('city', e.target.value)} className="input mt-1 w-full" /></label>
            <label className="block text-sm font-medium text-gray-700">Provincia<input value={recipient.province} onChange={e => updateRecipient('province', e.target.value)} className="input mt-1 w-full" /></label>
          </div>
          {!selectedVoucherType && <p className="text-sm text-amber-800">La condición fiscal del emisor no tiene una regla automática habilitada. No se va a enviar la emisión hasta revisar la configuración.</p>}
          <button type="submit" disabled={busy || !selectedVoucherType} className="inline-flex items-center gap-2 rounded-lg bg-[#ED164F] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <FileCheck2 size={16} />} Confirmar datos y generar factura</button>
        </form>
      )}

      {message && <p className="text-sm text-gray-600" role="status">{message}</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  )
}
