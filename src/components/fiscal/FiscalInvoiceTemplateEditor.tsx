'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import FiscalInvoiceDocument from '@/components/fiscal/FiscalInvoiceDocument'
import type { FiscalPdfInvoice, FiscalPdfTemplate } from '@/lib/fiscal-invoice-pdf'

type LinkedContributor = { cuit: string; environment: 'TEST' | 'PROD'; razonSocial: string | null }
type PadronData = { cuit?: string; razonSocial?: string; estadoRegistral?: string; domicilioFiscal?: string; condicionIva?: string; actividades?: string }
type PadronPayload = { data?: PadronData; source?: string; consultedAt?: string; retryAfterSeconds?: number; error?: string | { message?: string }; code?: string }
type EditorArea = 'identity' | 'fiscal' | 'design' | 'footer'
type Props = { api: (path: string) => string; contributors: LinkedContributor[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePadronPayload(value: unknown): PadronPayload {
  if (!isRecord(value)) return {}
  const data = isRecord(value.data) ? Object.fromEntries(
    ['cuit', 'razonSocial', 'estadoRegistral', 'domicilioFiscal', 'condicionIva', 'actividades']
      .flatMap(key => typeof value.data[key] === 'string' ? [[key, value.data[key]]] : []),
  ) as PadronData : undefined
  const rawError = value.error
  const error = typeof rawError === 'string' ? rawError : isRecord(rawError) && typeof rawError.message === 'string' ? { message: rawError.message } : undefined
  const code = typeof value.code === 'string' ? value.code : isRecord(rawError) && typeof rawError.code === 'string' ? rawError.code : undefined
  return {
    ...(data ? { data } : {}),
    ...(typeof value.source === 'string' ? { source: value.source } : {}),
    ...(typeof value.consultedAt === 'string' ? { consultedAt: value.consultedAt } : {}),
    ...(typeof value.retryAfterSeconds === 'number' ? { retryAfterSeconds: value.retryAfterSeconds } : {}),
    ...(error ? { error } : {}),
    ...(code ? { code } : {}),
  }
}

const inputClass = 'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200'
const fieldDefinitions: Array<{ key: keyof FiscalPdfTemplate; label: string; maxLength?: number }> = [
  { key: 'legalName', label: 'Razón social' },
  { key: 'issuerCuit', label: 'CUIT emisor', maxLength: 11 },
  { key: 'ivaCondition', label: 'Condición frente al IVA' },
  { key: 'startActivity', label: 'Inicio de actividades', maxLength: 10 },
  { key: 'activities', label: 'Actividades declaradas' },
  { key: 'taxAddress', label: 'Domicilio fiscal' },
]

export default function FiscalInvoiceTemplateEditor({ api, contributors }: Props) {
  const [template, setTemplate] = useState<FiscalPdfTemplate | null>(null)
  const [savedTemplate, setSavedTemplate] = useState<FiscalPdfTemplate | null>(null)
  const [selectedCuit, setSelectedCuit] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [padronError, setPadronError] = useState('')
  const [notice, setNotice] = useState('')
  const [padronKey, setPadronKey] = useState('')
  const [padronCuit, setPadronCuit] = useState('')
  const [selectedArea, setSelectedArea] = useState<EditorArea>('identity')
  const autoLookupCuit = useRef('')
  const linkedCuits = useMemo(() => Array.from(new Map(contributors.map(contributor => [contributor.cuit, contributor])).values()), [contributors])
  const hasChanges = Boolean(template && savedTemplate && JSON.stringify(template) !== JSON.stringify(savedTemplate))
  const previewInvoice = useMemo<FiscalPdfInvoice | null>(() => {
    if (!template) return null
    const now = new Date()
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const cuit = selectedCuit || template.issuerCuit || '00000000000'
    const sampleItem = { description: 'Producto de ejemplo', quantity: 1, unit: 'unidad', unitPrice: 10000, netAmount: 10000, vatRate: 21, vatAmount: 2100, totalAmount: 12100 }
    return {
      id: 'invoice-template-preview', environment: 'PREVIEW', cuit, pointOfSale: 1, voucherType: 6,
      voucherNumber: 1, result: null, cae: null, caeExpiresAt: null, amount: '12100', currency: 'ARS',
      createdAt: now.toISOString(),
      payload: {
        voucher: { type: '6', concept: 1, date, saleCondition: 'Contado' },
        amounts: { net: 10000, vat: 2100, total: 12100, vatBreakdown: [{ rate: 21, base: 10000, amount: 2100 }] },
        items: [sampleItem],
        customer: { docType: 99, docNumber: '', name: 'Consumidor final', vatCondition: 5 },
      },
      documentSnapshot: {
        emitter: { cuit, razonSocial: template.legalName || 'Mi negocio', domicilioFiscal: template.taxAddress || '', condicionIva: template.ivaCondition || '', inicioActividad: template.startActivity || '' },
        recipient: { docType: 99, docNumber: '', name: 'Consumidor final', vatCondition: 5 },
        items: [sampleItem],
        amounts: { net: 10000, vat: 2100, total: 12100, vatBreakdown: [{ rate: 21, base: 10000, amount: 2100 }] },
        invoice: { concept: 1, date, saleCondition: 'Contado' },
      },
      pdfTemplateSnapshot: template,
    }
  }, [selectedCuit, template])

  useEffect(() => {
    if (selectedCuit && linkedCuits.some(contributor => contributor.cuit === selectedCuit)) return
    setSelectedCuit(linkedCuits.length === 1 ? linkedCuits[0].cuit : '')
  }, [linkedCuits, selectedCuit])

  useEffect(() => {
    let active = true
    void fetch(api('/api/nodo/template'), { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => ({})) as { template?: FiscalPdfTemplate; error?: string }
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el diseño.')
        if (active) {
          const nextTemplate = payload.template || {}
          setTemplate(nextTemplate)
          setSavedTemplate(nextTemplate)
        }
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar el diseño.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api])

  function update<K extends keyof FiscalPdfTemplate>(key: K, value: FiscalPdfTemplate[K]) {
    setTemplate(current => current ? { ...current, [key]: value } : current)
    setNotice('')
  }

  const queryPadron = useCallback(async (source: 'constancia' | 'a13', requestKey: string) => {
    const response = await fetch(api('/api/nodo/onboarding/padron'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey },
      body: JSON.stringify({ cuit: selectedCuit, source }),
      cache: 'no-store',
    })
    return { response, payload: parsePadronPayload(await response.json().catch((): unknown => ({}))) }
  }, [api, selectedCuit])

  const loadIssuerFromArca = useCallback(async (overwriteExisting = true) => {
    if (!selectedCuit) return
    const key = padronCuit === selectedCuit && padronKey ? padronKey : `nodo-template-${crypto.randomUUID()}`
    setPadronKey(key); setPadronCuit(selectedCuit); setBusy(true); setPadronError(''); setNotice('')
    try {
      let { response, payload } = await queryPadron('constancia', `${key}:constancia`)
      if (response.status === 202) { setNotice(`ARCA sigue procesando la consulta. Reintentá en ${payload.retryAfterSeconds || 5} segundos.`); return }
      let usedA13 = payload.source === 'ARCA_A13'
      if (!response.ok && payload.code === 'CONSTANCIA_DELEGATION_REQUIRED') {
        ;({ response, payload } = await queryPadron('a13', `${key}:a13`))
        usedA13 = true
        if (response.status === 202) { setNotice('Constancia requiere delegación; A13 sigue en curso. Reintentá en unos segundos.'); return }
      }
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : payload.error?.message || 'No se pudieron consultar los datos fiscales de ARCA.')
      const data = payload.data
      const legalName = data?.razonSocial?.trim()
      if (data?.cuit !== selectedCuit || !legalName) throw new Error('ARCA no devolvió una razón social verificable para esta CUIT.')
      setTemplate(current => current ? {
        ...current,
        ...((overwriteExisting || !current.issuerCuit?.trim()) ? { issuerCuit: selectedCuit } : {}),
        ...((overwriteExisting || !current.legalName?.trim()) ? { legalName } : {}),
        ...(data.domicilioFiscal && (overwriteExisting || !current.taxAddress?.trim()) ? { taxAddress: data.domicilioFiscal } : {}),
        ...(data.condicionIva && (overwriteExisting || !current.ivaCondition?.trim()) ? { ivaCondition: data.condicionIva } : {}),
        ...(data.actividades && (overwriteExisting || !current.activities?.trim()) ? { activities: data.actividades } : {}),
        arcaSource: usedA13 ? 'ARCA_A13' : 'ARCA_CONSTANCIA',
        arcaConsultedAt: payload.consultedAt || new Date().toISOString(),
      } : current)
      setPadronKey(''); setPadronCuit('')
      const missing = [!data.domicilioFiscal && 'domicilio fiscal', !data.condicionIva && 'condición de IVA', !data.actividades && 'actividades'].filter(Boolean)
      setNotice(`${usedA13 ? 'Datos consultados por A13' : 'Datos consultados por Constancia de Inscripción'}${data.estadoRegistral ? ` · Estado: ${data.estadoRegistral}` : ''}.${missing.length ? ` ARCA no informó ${missing.join(', ')}; completalos manualmente.` : ''} Revisá los datos antes de guardar.`)
    } catch (reason) {
      setPadronError(reason instanceof Error ? reason.message : 'No se pudieron consultar los datos de ARCA.')
    } finally { setBusy(false) }
  }, [padronCuit, padronKey, queryPadron, selectedCuit])

  useEffect(() => {
    if (!template || loading || !selectedCuit) return
    if (template.issuerCuit === selectedCuit && template.arcaSource) return
    if (autoLookupCuit.current === selectedCuit) return
    autoLookupCuit.current = selectedCuit
    void loadIssuerFromArca(false)
  }, [loadIssuerFromArca, loading, selectedCuit, template])

  async function uploadLogo(file: File | undefined) {
    if (!file) return
    setBusy(true); setError(''); setNotice('')
    try {
      const form = new FormData(); form.set('file', file)
      const response = await fetch(api('/api/nodo/template/logo-upload'), { method: 'POST', body: form })
      const payload = await response.json().catch(() => ({})) as { publicUrl?: string; error?: string }
      if (!response.ok || !payload.publicUrl) throw new Error(payload.error || 'No se pudo subir el logo.')
      update('logoUrl', payload.publicUrl)
      setNotice('Logo cargado. Guardá los cambios para aplicarlo a los próximos comprobantes.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo subir el logo.') }
    finally { setBusy(false) }
  }

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!template) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api('/api/nodo/template'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(template) })
      const payload = await response.json().catch(() => ({})) as { template?: FiscalPdfTemplate; error?: string }
      if (!response.ok) throw new Error(payload.error || 'No se pudieron guardar los cambios.')
      const nextTemplate = payload.template || template
      setTemplate(nextTemplate); setSavedTemplate(nextTemplate)
      setNotice('Diseño guardado. Se aplicará a los próximos comprobantes; los ya emitidos conservan su copia original.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron guardar los cambios.') }
    finally { setBusy(false) }
  }

  function selectArea(area: EditorArea) {
    setSelectedArea(area)
    document.getElementById('invoice-edit-selection')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-900/5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-[#C2103F]">NODO ZAP / PERSONALIZACIÓN</p><h2 className="mt-1 text-xl font-bold text-slate-950">Tu factura, a tu manera.</h2><p className="mt-1 text-sm text-slate-600">Tocá una parte del documento para editarla. Los cambios se guardan para los próximos comprobantes.</p></div>
      {template && <div className={`rounded-full px-3 py-1.5 text-xs font-semibold ${hasChanges ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{busy ? 'Guardando…' : hasChanges ? 'Cambios sin guardar' : savedTemplate ? 'Diseño guardado' : 'Cargando diseño'}</div>}
    </div>
    {loading ? <p role="status" className="mt-5 text-sm text-slate-500">Cargando tu factura…</p> : !template ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error || 'No se pudo cargar el diseño.'}</p> : <form onSubmit={event => void saveTemplate(event)} className="mt-5">
      {linkedCuits.length > 1 && <label className="mb-4 block max-w-md text-sm font-medium text-slate-700">CUIT del emisor
        <select value={selectedCuit} onChange={event => { setSelectedCuit(event.target.value); setPadronKey(''); setPadronCuit(''); setPadronError('') }} className={inputClass}>
          <option value="">Elegí una CUIT</option>{linkedCuits.map(item => <option key={item.cuit} value={item.cuit}>{item.cuit}{item.razonSocial ? ` · ${item.razonSocial}` : ''}</option>)}
        </select>
      </label>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sin emitir · factura de ejemplo</p></div>
          <div className="mx-auto max-h-[78vh] max-w-[760px] overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-3 shadow-sm"><FiscalInvoiceDocument invoices={previewInvoice ? [previewInvoice] : []} template={template} previewMode interactive selectedArea={selectedArea} onSelectArea={selectArea} /></div>
          <p className="mt-2 text-center text-xs leading-5 text-slate-500">Representación del PDF real con datos de ejemplo. No es un comprobante fiscal ni se comunica con ARCA.</p>
        </div>
        <aside id="invoice-edit-selection" className="rounded-xl border border-slate-200 bg-[#FBFBFA] p-4" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Editar selección</p>
          {selectedArea === 'identity' && <div className="mt-3 space-y-3">
            <h3 className="font-semibold text-slate-900">Tu negocio</h3>
            <label className="block text-sm font-medium text-slate-700">Nombre comercial<input value={template.commercialName || ''} maxLength={120} onChange={event => update('commercialName', event.target.value)} className={inputClass} /></label>
            <label className="block text-sm font-medium text-slate-700">Domicilio comercial<input value={template.address || ''} maxLength={180} onChange={event => update('address', event.target.value)} className={inputClass} /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium text-slate-700">Localidad<input value={template.locality || ''} maxLength={100} onChange={event => update('locality', event.target.value)} className={inputClass} /></label><label className="block text-sm font-medium text-slate-700">Provincia<input value={template.province || ''} maxLength={100} onChange={event => update('province', event.target.value)} className={inputClass} /></label></div>
            <label className="block text-sm font-medium text-slate-700">Logo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => { void uploadLogo(event.target.files?.[0]); event.currentTarget.value = '' }} className={inputClass} /></label>
            {template.logoUrl && <div className="flex items-center justify-between rounded-lg bg-white p-2"><Image src={template.logoUrl} alt="Logo que aparece en la factura" width={120} height={44} unoptimized className="max-h-11 max-w-32 object-contain" /><button type="button" onClick={() => update('logoUrl', '')} className="text-xs font-semibold text-red-700">Quitar logo</button></div>}
          </div>}
          {selectedArea === 'fiscal' && <div className="mt-3 space-y-3">
            <div><h3 className="font-semibold text-slate-900">Datos fiscales</h3><p className="mt-1 text-xs leading-5 text-slate-600">La identidad legal se consulta a ARCA. Podés revisar y corregir la representación; la autorización de cada comprobante es independiente.</p></div>
            <button type="button" onClick={() => void loadIssuerFromArca()} disabled={busy || !selectedCuit} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-50">{busy ? 'Consultando ARCA…' : 'Consultar datos fiscales de ARCA'}</button>
            {template.arcaSource && <p className="text-xs text-slate-600">Fuente: {template.arcaSource === 'ARCA_CONSTANCIA' ? 'Constancia de Inscripción' : 'A13'}{template.arcaConsultedAt ? ` · ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(template.arcaConsultedAt))}` : ''}</p>}
            {padronError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">{padronError}</p>}
            {fieldDefinitions.map(({ key, label, maxLength }) => <label key={key} className="block text-sm font-medium text-slate-700">{label}<input value={String(template[key] || '')} maxLength={maxLength} onChange={event => update(key, event.target.value)} className={inputClass} /></label>)}
            <label className="block text-sm font-medium text-slate-700">Ingresos Brutos <span className="font-normal text-slate-500">· carga manual</span>
              <select value={template.grossIncomeRegistration?.split(' / ')[0] || ''} onChange={event => update('grossIncomeRegistration', event.target.value)} className={inputClass}><option value="">Seleccioná una condición</option><option value="Convenio Multilateral">Convenio Multilateral</option><option value="Inscripción provincial">Inscripción provincial</option><option value="Exento">Exento</option><option value="No inscripto">No inscripto</option></select>
            </label>
            {(['Convenio Multilateral', 'Inscripción provincial'].includes(template.grossIncomeRegistration?.split(' / ')[0] || '')) && <label className="block text-sm font-medium text-slate-700">Número de inscripción<input value={template.grossIncomeRegistration?.split(' / ')[1] || ''} onChange={event => update('grossIncomeRegistration', `${template.grossIncomeRegistration?.split(' / ')[0] || 'Inscripción provincial'}${event.target.value ? ` / ${event.target.value}` : ''}`)} className={inputClass} /></label>}
          </div>}
          {selectedArea === 'design' && <div className="mt-3 space-y-4">
            <div><h3 className="font-semibold text-slate-900">Presentación</h3><p className="mt-1 text-xs text-slate-600">Elegí un estilo y mirá cómo cambia la misma factura.</p></div>
            <div className="grid grid-cols-3 gap-2">{([['classic', 'Clásica'], ['modern', 'Moderna'], ['editorial', 'Editorial']] as const).map(([variant, label]) => <button key={variant} type="button" aria-pressed={(template.designVariant || 'classic') === variant} onClick={() => update('designVariant', variant)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${template.designVariant === variant ? 'border-slate-900 bg-white text-slate-950 ring-1 ring-slate-900' : 'border-slate-200 bg-white text-slate-600'}`}>{label}</button>)}</div>
            <label className="block text-sm font-medium text-slate-700">Color de marca<div className="mt-2 flex flex-wrap gap-2">{[['#111827', 'Negro · sobrio'], ['#1d4ed8', 'Azul · contemporáneo'], ['#047857', 'Verde · distintivo'], ['#ed164f', 'Fucsia · ZAP']].map(([color, label]) => <button key={color} type="button" aria-label={label} aria-pressed={(template.primaryColor || '#ed164f') === color} onClick={() => update('primaryColor', color)} className={`h-9 w-9 rounded-full border-2 ${template.primaryColor === color ? 'border-slate-950 ring-2 ring-slate-300' : 'border-white ring-1 ring-slate-200'}`} style={{ backgroundColor: color }} />)}</div></label>
            <label className="block text-sm font-medium text-slate-700">Otro color<input type="color" value={template.primaryColor || '#ed164f'} onChange={event => update('primaryColor', event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white p-1" /></label>
          </div>}
          {selectedArea === 'footer' && <div className="mt-3 space-y-3">
            <h3 className="font-semibold text-slate-900">Pie y contacto</h3>
            <label className="block text-sm font-medium text-slate-700">Mensaje<input value={template.footerText || ''} maxLength={180} onChange={event => update('footerText', event.target.value)} className={inputClass} /></label>
            <label className="block text-sm font-medium text-slate-700">Teléfono<input value={template.phone || ''} maxLength={40} onChange={event => update('phone', event.target.value)} className={inputClass} /></label>
            <label className="block text-sm font-medium text-slate-700">WhatsApp<input value={template.whatsapp || ''} maxLength={40} onChange={event => update('whatsapp', event.target.value)} className={inputClass} /></label>
            <label className="block text-sm font-medium text-slate-700">Sitio web<input value={template.website || ''} maxLength={200} onChange={event => update('website', event.target.value)} className={inputClass} /></label>
            <div className="space-y-2 text-sm text-slate-700"><label className="flex items-center gap-2"><input type="checkbox" checked={template.showWebsite ?? true} onChange={event => update('showWebsite', event.target.checked)} />Incluir sitio web</label><label className="flex items-center gap-2"><input type="checkbox" checked={template.showWhatsapp ?? true} onChange={event => update('showWhatsapp', event.target.checked)} />Incluir WhatsApp</label></div>
          </div>}
          {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">{notice}</p>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-800">{error}</p>}
        </aside>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">Guardar diseño no emite comprobantes. Se aplica a los próximos PDF.</p>
        <button type="submit" disabled={busy || !hasChanges} className="rounded-xl bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Guardando…' : hasChanges ? 'Guardar diseño' : 'Diseño guardado'}</button>
      </div>
    </form>}
  </section>
}
