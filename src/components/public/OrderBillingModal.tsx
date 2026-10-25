'use client'

import { useState } from 'react'

type PadronResult = { success?: boolean; data?: { cuit?: string; razonSocial?: string; estadoRegistral?: string }; error?: string }
type InvoiceInfo = { id?: string; jobId?: string | null; result: string | null; voucherNumber: number | null; cae: string | null }
type EmitResult = { error?: string; invoice?: InvoiceInfo; result?: { status?: string; jobId?: string; voucher?: { voucherNumber?: number; cae?: string } } }

export default function OrderBillingModal({ orderId, accessToken, initial, initialVoucherType, initialVatCondition, initialVatConditionConfirmed, hasServiceItems, initialServiceDates, initialInvoice }: {
  orderId: string
  accessToken?: string
  initial: { cuit: string; name: string; address: string; city: string; province: string }
  initialVoucherType: 'A' | 'B' | 'C' | null
  initialVatCondition: number | null
  initialVatConditionConfirmed: boolean
  hasServiceItems: boolean
  initialServiceDates: { serviceFrom: string; serviceTo: string; paymentDueDate: string }
  initialInvoice: InvoiceInfo | null
}) {
  const [open, setOpen] = useState(!initial.cuit || !initial.name || !initial.address || !initial.city || !initial.province || !initialVoucherType || !initialVatCondition || !initialVatConditionConfirmed || (hasServiceItems && (!initialServiceDates.serviceFrom || !initialServiceDates.serviceTo || !initialServiceDates.paymentDueDate)))
  const [cuit, setCuit] = useState(initial.cuit)
  const [name, setName] = useState(initial.name)
  const [address, setAddress] = useState(initial.address)
  const [city, setCity] = useState(initial.city)
  const [province, setProvince] = useState(initial.province)
  const [serviceFrom, setServiceFrom] = useState(initialServiceDates.serviceFrom)
  const [serviceTo, setServiceTo] = useState(initialServiceDates.serviceTo)
  const [paymentDueDate, setPaymentDueDate] = useState(initialServiceDates.paymentDueDate)
  const [voucherType, setVoucherType] = useState<'B' | 'A' | 'C'>(initialVoucherType ?? 'B')
  const [vatCondition, setVatCondition] = useState(initialVatCondition?.toString() ?? '')
  const [vatConditionConfirmed, setVatConditionConfirmed] = useState(initialVatConditionConfirmed)
  const [padron, setPadron] = useState<PadronResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(Boolean(initial.cuit && initial.name && initial.address && initial.city && initial.province && initialVoucherType && initialVatCondition && initialVatConditionConfirmed && (!hasServiceItems || (initialServiceDates.serviceFrom && initialServiceDates.serviceTo && initialServiceDates.paymentDueDate))))
  const [invoice, setInvoice] = useState<InvoiceInfo | null>(initialInvoice)

  function applyEmissionResult(result: EmitResult) {
    if (result.invoice) setInvoice(result.invoice)
    const voucherNumber = result.result?.voucher?.voucherNumber
    const cae = result.result?.voucher?.cae
    if (voucherNumber) setInvoice(current => ({
      ...(current ?? { result: result.result?.status ?? 'DONE', voucherNumber: null, cae: null }),
      result: result.result?.status ?? 'DONE',
      voucherNumber,
      cae: cae ?? current?.cae ?? null,
    }))
  }

  async function requestInvoiceStatus() {
    const response = await fetch('/api/checkout/billing/emit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, accessToken }),
    })
    const result = await response.json() as EmitResult
    if (!response.ok) throw new Error(result.error || 'No pudimos consultar el estado de la factura.')
    applyEmissionResult(result)
    return result
  }

  async function refreshInvoice() {
    setBusy(true); setMessage('')
    try {
      const result = await requestInvoiceStatus()
      setMessage(result.invoice?.result === 'DONE'
        ? `Factura emitida${result.invoice.voucherNumber ? `: ${String(result.invoice.voucherNumber).padStart(8, '0')}` : ''}${result.invoice.cae ? ` · CAE ${result.invoice.cae}` : ''}.`
        : result.invoice?.result === 'FAILED' || result.invoice?.result === 'DEAD'
          ? 'El Worker informa que la emisión no se completó. Contactanos para revisar el job antes de reintentar.'
          : 'La factura sigue en proceso en el Worker.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No pudimos consultar el estado.') }
    finally { setBusy(false) }
  }

  async function lookup() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/checkout/billing/padron', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, accessToken, cuit }),
      })
      const result = await response.json() as PadronResult
      if (!response.ok || !result.success || !result.data?.razonSocial) throw new Error(result.error || 'No pudimos validar la CUIT en el padrón.')
      setPadron(result)
      setName(result.data.razonSocial)
      setMessage('CUIT consultada. Revisá los datos antes de guardar; el comprobante sugerido sigue siendo Factura B.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No pudimos consultar el padrón.') }
    finally { setBusy(false) }
  }

  async function save() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/checkout/billing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, accessToken, cuit, name, address, city, province, voucherType, vatCondition: Number(vatCondition), vatConditionConfirmed, serviceFrom, serviceTo, paymentDueDate, padronName: padron?.data?.razonSocial }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'No pudimos guardar los datos.')
      setSaved(true)
      setOpen(false)
      let emitResult = await requestInvoiceStatus()
      let currentStatus = emitResult.result?.status ?? emitResult.invoice?.result
      for (let attempt = 0; attempt < 5 && ['PENDING', 'PROCESSING'].includes(currentStatus ?? ''); attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        emitResult = await requestInvoiceStatus()
        currentStatus = emitResult.result?.status ?? emitResult.invoice?.result
      }
      const voucherNumber = emitResult.invoice?.voucherNumber ?? emitResult.result?.voucher?.voucherNumber
      const cae = emitResult.invoice?.cae ?? emitResult.result?.voucher?.cae
      if (currentStatus === 'DONE') setMessage(`Factura emitida${voucherNumber ? `: ${String(voucherNumber).padStart(8, '0')}` : ''}${cae ? ` · CAE ${cae}` : ''}.`)
      else if (currentStatus === 'FAILED' || currentStatus === 'DEAD') setMessage('El Worker informa que la emisión no se completó. Contactanos para revisar el job antes de reintentar.')
      else setMessage('La solicitud está en proceso en el Worker. Podés consultar el estado en unos momentos.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No pudimos guardar los datos.') }
    finally { setBusy(false) }
  }

  return <section className="rounded-2xl border border-gray-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-bold text-gray-950">Datos para la factura</h3><p className="mt-1 text-sm text-gray-600">Factura B a consumidor final por defecto.</p></div>
    {!open && <div className="flex gap-2">{!invoice && <button type="button" onClick={() => setOpen(true)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Editar datos</button>}{saved && !invoice && <button type="button" disabled={busy} onClick={() => void save()} className="rounded-lg bg-[#ED164F] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Procesando…' : 'Emitir factura'}</button>}{invoice?.jobId && ['PENDING', 'PROCESSING'].includes(invoice.result ?? '') && <button type="button" disabled={busy} onClick={() => void refreshInvoice()} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Consultando…' : 'Actualizar estado'}</button>}</div>}
    </div>
    {open && <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">CUIT<input value={cuit} onChange={event => { setCuit(event.target.value); setPadron(null); setVatConditionConfirmed(false) }} inputMode="numeric" className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      <div className="flex items-end"><button type="button" disabled={busy} onClick={() => void lookup()} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Consultando…' : 'Consultar ARCA'}</button></div>
      {padron?.data && <div className="sm:col-span-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-950">{padron.data.razonSocial}{padron.data.estadoRegistral ? ` · Estado registral A13: ${padron.data.estadoRegistral}` : ''}. A13 no informa la condición IVA, las exenciones ni el estado administrativo detallado de la CUIT; revisá los datos y el comprobante.</div>}
      <label className="text-sm font-medium">Nombre / razón social<input value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      <label className="text-sm font-medium">Tipo de comprobante<select value={voucherType} onChange={event => { setVoucherType(event.target.value as 'A' | 'B' | 'C'); setVatConditionConfirmed(false) }} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="B">Factura B (predeterminada)</option><option value="A">Factura A</option><option value="C">Factura C</option></select></label>
      <label className="text-sm font-medium sm:col-span-2">Condición frente al IVA del receptor<select value={vatCondition} onChange={event => { setVatCondition(event.target.value); setVatConditionConfirmed(false) }} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="">Seleccioná la condición declarada</option><option value="1">IVA Responsable Inscripto</option><option value="4">IVA Sujeto Exento</option><option value="5">Consumidor Final</option><option value="6">Monotributo</option><option value="13">Monotributo Social</option><option value="15">IVA No Alcanzado</option></select></label>
      <label className="flex gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={vatConditionConfirmed} disabled={!vatCondition} onChange={event => setVatConditionConfirmed(event.target.checked)} /><span>Confirmo que la condición IVA y el comprobante seleccionado corresponden a los datos del receptor. La consulta A13 no informa IVA ni acredita exenciones.</span></label>
      <label className="text-sm font-medium sm:col-span-2">Domicilio<input value={address} onChange={event => setAddress(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      <label className="text-sm font-medium">Localidad<input value={city} onChange={event => setCity(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      <label className="text-sm font-medium">Provincia<input value={province} onChange={event => setProvince(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      {hasServiceItems && <>
        <label className="text-sm font-medium">Inicio del período de servicio<input required type="date" value={serviceFrom} onChange={event => setServiceFrom(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Fin del período de servicio<input required type="date" value={serviceTo} onChange={event => setServiceTo(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <label className="text-sm font-medium">Vencimiento de pago<input required type="date" value={paymentDueDate} onChange={event => setPaymentDueDate(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      </>}
      <button type="button" disabled={busy || !vatCondition || !vatConditionConfirmed} onClick={() => void save()} className="rounded-lg bg-[#ED164F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{busy ? 'Guardando y solicitando factura…' : 'Guardar y emitir factura'}</button>
    </div>}
    {invoice && <p className={`mt-4 rounded-xl p-3 text-sm ${invoice.result === 'DONE' ? 'bg-emerald-50 text-emerald-900' : invoice.result === 'FAILED' || invoice.result === 'DEAD' ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-950'}`}>Factura {invoice.result === 'DONE' ? 'emitida' : invoice.result === 'FAILED' || invoice.result === 'DEAD' ? 'con error' : 'en proceso'}{invoice.voucherNumber ? ` · comprobante ${invoice.voucherNumber}` : ''}{invoice.cae ? ` · CAE ${invoice.cae}` : ''}</p>}
    {message && <p role="status" className="mt-3 text-sm text-gray-700">{message}</p>}
  </section>
}
