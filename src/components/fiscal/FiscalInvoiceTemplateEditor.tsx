'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import type { FiscalPdfTemplate } from '@/lib/fiscal-invoice-pdf'

type LinkedContributor = { cuit: string; environment: 'TEST' | 'PROD'; razonSocial: string | null }
type PadronPayload = {
  data?: { cuit?: string; razonSocial?: string; estadoRegistral?: string; domicilioFiscal?: string; condicionIva?: string; actividades?: string }
  source?: string
  consultedAt?: string
  retryAfterSeconds?: number
  error?: string | { message?: string }
  code?: string
}
type Props = { api: (path: string) => string; contributors: LinkedContributor[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePadronPayload(value: unknown): PadronPayload {
  if (!isRecord(value)) return {}
  const rawData = value.data
  const data = isRecord(rawData)?{
    ...(typeof rawData.cuit === 'string'?{ cuit: rawData.cuit } : {}),
    ...(typeof rawData.razonSocial === 'string'?{ razonSocial: rawData.razonSocial } : {}),
    ...(typeof rawData.estadoRegistral === 'string'?{ estadoRegistral: rawData.estadoRegistral } : {}),
    ...(typeof rawData.domicilioFiscal === 'string'?{ domicilioFiscal: rawData.domicilioFiscal } : {}),
    ...(typeof rawData.condicionIva === 'string'?{ condicionIva: rawData.condicionIva } : {}),
    ...(typeof rawData.actividades === 'string'?{ actividades: rawData.actividades } : {}),
  } : undefined
  const rawError = value.error
  const error = typeof rawError === 'string'
   ?rawError
    : isRecord(rawError) && typeof rawError.message === 'string'
     ?{ message: rawError.message }
      : undefined
  const errorCode = isRecord(rawError) && typeof rawError.code === 'string' ? rawError.code : undefined
  return {
    ...(data?{ data } : {}),
    ...(typeof value.retryAfterSeconds === 'number'?{ retryAfterSeconds: value.retryAfterSeconds } : {}),
    ...(error?{ error } : {}),
    ...(typeof value.source === 'string'?{ source: value.source } : {}),
    ...(typeof value.consultedAt === 'string'?{ consultedAt: value.consultedAt } : {}),
    ...(typeof value.code === 'string'?{ code: value.code } : errorCode ? { code: errorCode } : {}),
  }
}

const fields: Array<{ key: Exclude<keyof FiscalPdfTemplate, 'showWebsite' | 'showWhatsapp' | 'arcaSource' | 'arcaConsultedAt' | 'designVariant'>; label: string; maxLength?: number }> = [
  { key: 'legalName', label: 'Razón social' },
  { key: 'issuerCuit', label: 'CUIT emisor', maxLength: 11 },
  { key: 'ivaCondition', label: 'Condición frente al IVA' },
  { key: 'startActivity', label: 'Inicio de actividades', maxLength: 10 },
  { key: 'activities', label: 'Actividades declaradas' },
  { key: 'taxAddress', label: 'Domicilio fiscal' },
  { key: 'commercialName', label: 'Nombre comercial' },
  { key: 'address', label: 'Domicilio comercial' },
  { key: 'locality', label: 'Localidad' },
  { key: 'province', label: 'Provincia' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'website', label: 'Sitio web' },
]

export default function FiscalInvoiceTemplateEditor({ api, contributors }: Props) {
  const [template, setTemplate] = useState<FiscalPdfTemplate | null>(null)
  const [selectedCuit, setSelectedCuit] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [padronError, setPadronError] = useState('')
  const [notice, setNotice] = useState('')
  const [padronKey, setPadronKey] = useState('')
  const [padronCuit, setPadronCuit] = useState('')
  const autoLookupCuit = useRef('')
  const [iibbType, setIibbType] = useState('')
  const [iibbNumber, setIibbNumber] = useState('')

  const linkedCuits = useMemo(
    () => Array.from(new Map(contributors.map(contributor => [contributor.cuit, contributor])).values()),
    [contributors],
  )

  useEffect(() => {
    if (selectedCuit && linkedCuits.some(contributor => contributor.cuit === selectedCuit)) return
    setSelectedCuit(linkedCuits.length === 1?linkedCuits[0].cuit : '')
  }, [linkedCuits, selectedCuit])

  useEffect(() => {
    if (loading || !template || linkedCuits.length !== 1) return
    const contributor = linkedCuits[0]
    const legalName = contributor.razonSocial?.trim() ?? ''
    const needsCuit = !template.issuerCuit?.trim()
    const needsLegalName = !template.legalName?.trim() && Boolean(legalName)
    if (!needsCuit && !needsLegalName) return
    setTemplate(current => current?{
      ...current,
      ...(needsCuit?{ issuerCuit: contributor.cuit } : {}),
      ...(needsLegalName?{ legalName } : {}),
    } : current)
    setNotice('Se precargaron los datos disponibles de la CUIT vinculada. Revisá los datos antes de guardar.')
  }, [linkedCuits, loading, template])

  useEffect(() => {
    let active = true
    void fetch(api('/api/nodo/template'), { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => ({})) as { template?: FiscalPdfTemplate; error?: string }
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la plantilla.')
        if (active) setTemplate(payload.template || {})
      })
      .catch(reason => { if (active) setError(reason instanceof Error?reason.message : 'No se pudo cargar la plantilla.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api])

  function update<K extends keyof FiscalPdfTemplate>(key: K, value: FiscalPdfTemplate[K]) {
    setTemplate(current => current?{ ...current, [key]: value } : current)
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

  const loadIssuerFromPadron = useCallback(async (overwriteExisting = true) => {
    if (!selectedCuit) return
    const key = padronCuit === selectedCuit && padronKey?padronKey : `nodo-template-${crypto.randomUUID()}`
    setPadronKey(key); setPadronCuit(selectedCuit); setBusy(true); setPadronError(''); setNotice('')
    try {
      let { response, payload } = await queryPadron('constancia', `${key}:constancia`)
      if (response.status === 202) {
        setNotice(`La consulta sigue en curso. Volvé a intentar en ${payload.retryAfterSeconds || 5} segundos.`)
        return
      }
      let fallback = false
      if (!response.ok && payload.code === 'CONSTANCIA_DELEGATION_REQUIRED') {
        fallback = true
        ;({ response, payload } = await queryPadron('a13', `${key}:a13`))
        if (response.status === 202) {
          setNotice('Constancia requiere delegación del servicio. A13 sigue consultándose; volvé a intentar en unos segundos.')
          return
        }
      }
      if (!response.ok) throw new Error(typeof payload.error === 'string'?payload.error : payload.error?.message || 'No se pudieron traer los datos de ARCA.')
      const arcaData = payload.data
      const usedA13 = fallback || payload.source === 'ARCA_A13'
      const legalName = arcaData?.razonSocial?.trim()
      if (arcaData?.cuit !== selectedCuit || !legalName) {
        throw new Error('ARCA no devolvió una razón social verificable para esta CUIT.')
      }
      setTemplate(current => current?{
        ...current,
        ...((overwriteExisting || !current.issuerCuit?.trim()) ? { issuerCuit: selectedCuit } : {}),
        ...((overwriteExisting || !current.legalName?.trim()) ? { legalName } : {}),
        ...(arcaData.domicilioFiscal && (overwriteExisting || !current.taxAddress?.trim()) ? { taxAddress: arcaData.domicilioFiscal } : {}),
        ...(arcaData.condicionIva && (overwriteExisting || !current.ivaCondition?.trim()) ? { ivaCondition: arcaData.condicionIva } : {}),
        ...(arcaData.actividades && (overwriteExisting || !current.activities?.trim()) ? { activities: arcaData.actividades } : {}),
        arcaSource: usedA13?'ARCA_A13' : 'ARCA_CONSTANCIA',
        arcaConsultedAt: payload.consultedAt || new Date().toISOString(),
      } : current)
      setPadronKey(''); setPadronCuit('')
      const missingArcaFields = [
        !arcaData.domicilioFiscal && 'domicilio fiscal',
        !arcaData.condicionIva && 'condición frente al IVA',
        !arcaData.actividades && 'actividades declaradas',
      ].filter((field): field is string => Boolean(field))
      setNotice(usedA13
        ? `Consulta realizada por A13${arcaData.estadoRegistral ? ` · Estado registral: ${arcaData.estadoRegistral}` : ''}.${missingArcaFields.length ? ` ARCA no devolvió ${missingArcaFields.join(', ')}; completá esos campos manualmente.` : ''} Revisá y guardá la plantilla.`
        : `Consulta realizada por Constancia de Inscripción${arcaData.estadoRegistral ? ` · Estado registral: ${arcaData.estadoRegistral}` : ''}.${missingArcaFields.length ? ` ARCA no devolvió ${missingArcaFields.join(', ')}; completá esos campos manualmente.` : ''} Revisá y guardá la plantilla.`)
    } catch (reason) {
      setPadronError(reason instanceof Error?reason.message : 'No se pudieron consultar los datos de ARCA.')
    } finally {
      setBusy(false)
    }
  }, [api, padronCuit, padronKey, queryPadron, selectedCuit])

  useEffect(() => {
    if (!template || loading || !selectedCuit) return
    if (template.issuerCuit === selectedCuit && template.arcaSource) return
    if (autoLookupCuit.current === selectedCuit) return
    autoLookupCuit.current = selectedCuit
    void loadIssuerFromPadron(false)
  }, [loadIssuerFromPadron, loading, selectedCuit, template])

  async function uploadLogo(file: File | undefined) {
    if (!file) return
    setBusy(true); setError(''); setNotice('')
    try {
      const form = new FormData()
      form.set('file', file)
      const response = await fetch(api('/api/nodo/template/logo-upload'), { method: 'POST', body: form })
      const payload = await response.json().catch(() => ({})) as { publicUrl?: string; error?: string }
      if (!response.ok || !payload.publicUrl) throw new Error(payload.error || 'No se pudo subir el logo.')
      update('logoUrl', payload.publicUrl)
      setNotice('Logo cargado. Guardá la plantilla para aplicarlo a los próximos PDF.')
    } catch (reason) {
      setError(reason instanceof Error?reason.message : 'No se pudo subir el logo.')
    } finally {
      setBusy(false)
    }
  }

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!template) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api('/api/nodo/template'), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(template),
      })
      const payload = await response.json().catch(() => ({})) as { template?: FiscalPdfTemplate; error?: string }
      if (!response.ok) throw new Error(payload.error || 'No se pudo guardar la plantilla.')
      if (payload.template) setTemplate(payload.template)
      setNotice('Plantilla guardada. Se usará al generar los próximos PDF; los comprobantes autorizados conservan sus datos fiscales originales.')
    } catch (reason) {
      setError(reason instanceof Error?reason.message : 'No se pudo guardar la plantilla.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-900/5 shadow-sm">
    <h2 className="font-semibold text-gray-900">Datos del emisor y diseño del PDF</h2>
    <p className="mt-1 text-sm leading-5 text-gray-500">Completá la información comercial que acompaña la representación impresa. Los datos fiscales del comprobante autorizado provienen del Worker y ARCA.</p>
    {loading?<p role="status" className="mt-4 text-sm text-gray-500">Cargando configuración…</p> : !template?<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error || 'No se pudo cargar la configuración.'}</p> : <form onSubmit={event => void saveTemplate(event)} className="mt-5 space-y-4">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Traer datos fiscales básicos de ARCA</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">Se consulta Constancia de Inscripción; si no está disponible, se usa A13, que devuelve menos datos. Revisá los campos vacíos y completalos. El domicilio comercial puede diferir del fiscal. Inicio de actividades e Ingresos Brutos son manuales.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-sm font-medium text-gray-700">CUIT vinculada
            <select value={selectedCuit} onChange={event => { setSelectedCuit(event.target.value); setPadronKey(''); setPadronCuit(''); setPadronError(''); setNotice('') }} disabled={busy || linkedCuits.length === 0} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal">
              <option value="">{linkedCuits.length?'Seleccioná una CUIT…' : 'Primero vinculá una CUIT'}</option>
              {linkedCuits.map(contributor => <option key={contributor.cuit} value={contributor.cuit}>{contributor.cuit}{contributor.razonSocial?` / ${contributor.razonSocial}` : ''} / ${contributor.environment}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void loadIssuerFromPadron()} disabled={busy || !selectedCuit} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-50">
            {busy?'Consultando…' : 'Actualizar desde ARCA'}
          </button>
        </div>
        {padronError && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{padronError} La consulta no guarda ni modifica el diseño; podés completar los datos manualmente o volver a intentar.</p>}
      </section>
      {template.arcaSource && <p className="text-xs text-slate-600">Fuente: {template.arcaSource === 'ARCA_CONSTANCIA' ? 'ARCA / Constancia de Inscripcion' : 'ARCA / A13'}{template.arcaConsultedAt ? ` / Consultado ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(template.arcaConsultedAt))}` : ''}</p>}
      <section className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Datos fiscales</h3>
        <p className="mt-1 text-xs text-gray-500">Se completan con lo que informa ARCA. Podés corregirlos.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {fields.filter(({ key }) => ['legalName', 'issuerCuit', 'ivaCondition', 'startActivity', 'activities', 'taxAddress'].includes(key)).map(({ key, label, maxLength }) => <label key={key} className="block text-sm font-medium text-gray-700">{label}
          <input value={String(template[key] ?? '')} maxLength={maxLength} onChange={event => update(key, event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 font-normal" />
        </label>)}
        <label className="block text-sm font-medium text-gray-700">Ingresos Brutos (manual)
          <select value={iibbType || template.grossIncomeRegistration?.split(' / ')[0] || ''} onChange={event => {
            const type = event.target.value
            setIibbType(type)
            update('grossIncomeRegistration', ['Convenio Multilateral', 'Inscripcion provincial'].includes(type) ? `${type}${iibbNumber ? ` / ${iibbNumber}` : ''}` : type)
          }} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal">
            <option value="">Selecciona una condicion</option><option>Convenio Multilateral</option><option>Inscripcion provincial</option><option>Exento</option><option>No inscripto</option>
          </select>
          {['Convenio Multilateral', 'Inscripcion provincial'].includes(iibbType || template.grossIncomeRegistration?.split(' / ')[0] || '') && <input aria-label="Numero de Ingresos Brutos" value={iibbNumber || template.grossIncomeRegistration?.split(' / ')[1] || ''} onChange={event => {
            setIibbNumber(event.target.value)
            const type = iibbType || template.grossIncomeRegistration?.split(' / ')[0] || 'Inscripcion provincial'
            update('grossIncomeRegistration', `${type}${event.target.value ? ` / ${event.target.value}` : ''}`)
          }} maxLength={100} placeholder="Numero de inscripcion" className="mt-2 block w-full rounded-lg border border-gray-200 px-3 py-2.5 font-normal" />}
        </label>
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Datos comerciales</h3>
        <p className="mt-1 text-xs text-gray-500">Completá cómo querés que aparezca tu negocio en el PDF.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {fields.filter(({ key }) => !['legalName', 'issuerCuit', 'ivaCondition', 'startActivity', 'activities', 'taxAddress'].includes(key)).map(({ key, label, maxLength }) => <label key={key} className="block text-sm font-medium text-gray-700">{label}
          <input value={String(template[key] ?? '')} maxLength={maxLength} onChange={event => update(key, event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 font-normal" />
        </label>)}
        <label className="block text-sm font-medium text-gray-700">Color de marca
          <input type="color" value={template.primaryColor || '#ed164f'} onChange={event => update('primaryColor', event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-gray-200 bg-white p-1" />
        </label>
        </div>
      </section>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-gray-800">Diseno de factura y vista previa</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {([
            ['classic', 'Clasica', 'Presentacion formal con acento de marca.'],
            ['modern', 'Moderna', 'Banda de color y jerarquia simple.'],
            ['editorial', 'Editorial', 'Titulos destacados y separadores amplios.'],
          ] as const).map(([variant, title, description]) => <label key={variant} className={`cursor-pointer rounded-xl border p-3 ${template.designVariant === variant ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200'}`}>
            <input type="radio" name="designVariant" checked={(template.designVariant || 'classic') === variant} onChange={() => update('designVariant', variant)} />
            <span className="ml-2 font-semibold">{title}</span><span className="mt-1 block text-xs text-slate-600">{description}</span>
            <span className={`mt-3 block rounded border bg-white p-3 text-xs ${variant === 'modern' ? 'border-teal-700 border-t-4' : variant === 'editorial' ? 'border-violet-700 border-y-2' : 'border-rose-600 border-t-2'}`}>
              <span className="block font-bold">{template.commercialName || template.legalName || 'Nombre del comercio'}</span>
              <span className="mt-2 block border-b pb-2">FACTURA B / 00001-00000001</span>
              <span className="mt-2 flex justify-between"><span>Producto de ejemplo</span><span>$ 12.100</span></span>
              <span className="mt-2 block text-right font-bold">TOTAL $ 12.100</span>
            </span>
          </label>)}
        </div>
        <p className="text-xs text-slate-500">Vista previa ilustrativa; muestra el formato con datos de ejemplo. El PDF final conserva el diseno elegido al emitir.</p>
      </fieldset>
      <label className="block text-sm font-medium text-gray-700">Logo (PNG, JPG o WEBP; hasta 2 MB)
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => { void uploadLogo(event.target.files?.[0]); event.currentTarget.value = '' }} className="mt-1 block w-full rounded-lg border border-gray-200 p-2 text-sm font-normal" />
      </label>
      {template.logoUrl && <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"><Image src={template.logoUrl} alt="Logo para la factura" width={160} height={56} unoptimized className="max-h-14 max-w-40 object-contain" /><button type="button" onClick={() => update('logoUrl', '')} className="text-sm font-semibold text-red-700">Quitar logo</button></div>}
      <label className="block text-sm font-medium text-gray-700">Texto al pie
        <input value={template.footerText || ''} maxLength={180} onChange={event => update('footerText', event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 font-normal" />
      </label>
      <div className="flex flex-wrap gap-5 text-sm text-gray-700">
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={template.showWebsite ?? true} onChange={event => update('showWebsite', event.target.checked)} />Mostrar sitio web</label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={template.showWhatsapp ?? true} onChange={event => update('showWhatsapp', event.target.checked)} />Mostrar WhatsApp</label>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <button type="submit" disabled={busy} className="rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?'Guardando…' : 'Guardar diseño'}</button>
    </form>}
  </section>
}
