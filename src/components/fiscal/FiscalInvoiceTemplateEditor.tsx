'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { FiscalPdfTemplate } from '@/lib/fiscal-invoice-pdf'

type Props = { api: (path: string) => string }

const fields: Array<{ key: Exclude<keyof FiscalPdfTemplate, 'showWebsite' | 'showWhatsapp'>; label: string; maxLength?: number }> = [
  { key: 'legalName', label: 'Razón social' },
  { key: 'issuerCuit', label: 'CUIT emisor', maxLength: 11 },
  { key: 'ivaCondition', label: 'Condición frente al IVA' },
  { key: 'grossIncomeRegistration', label: 'Ingresos Brutos' },
  { key: 'startActivity', label: 'Inicio de actividades', maxLength: 10 },
  { key: 'taxAddress', label: 'Domicilio fiscal' },
  { key: 'commercialName', label: 'Nombre comercial' },
  { key: 'address', label: 'Domicilio comercial' },
  { key: 'locality', label: 'Localidad' },
  { key: 'province', label: 'Provincia' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'website', label: 'Sitio web' },
]

export default function FiscalInvoiceTemplateEditor({ api }: Props) {
  const [template, setTemplate] = useState<FiscalPdfTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    void fetch(api('/api/nodo/template'), { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => ({})) as { template?: FiscalPdfTemplate; error?: string }
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la plantilla.')
        if (active) setTemplate(payload.template || {})
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar la plantilla.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api])

  function update<K extends keyof FiscalPdfTemplate>(key: K, value: FiscalPdfTemplate[K]) {
    setTemplate(current => current ? { ...current, [key]: value } : current)
  }

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
      setError(reason instanceof Error ? reason.message : 'No se pudo subir el logo.')
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
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la plantilla.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-900/5 shadow-sm">
    <h2 className="font-semibold text-gray-900">Datos del emisor y diseño del PDF</h2>
    <p className="mt-1 text-sm leading-5 text-gray-500">Completá la información comercial que acompaña la representación impresa. Los datos fiscales del comprobante autorizado provienen del Worker y ARCA.</p>
    {loading ? <p role="status" className="mt-4 text-sm text-gray-500">Cargando configuración…</p> : !template ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error || 'No se pudo cargar la configuración.'}</p> : <form onSubmit={event => void saveTemplate(event)} className="mt-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(({ key, label, maxLength }) => <label key={key} className="block text-sm font-medium text-gray-700">{label}
          <input value={String(template[key] ?? '')} maxLength={maxLength} onChange={event => update(key, event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 font-normal" />
        </label>)}
        <label className="block text-sm font-medium text-gray-700">Color de marca
          <input type="color" value={template.primaryColor || '#ed164f'} onChange={event => update('primaryColor', event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-gray-200 bg-white p-1" />
        </label>
      </div>
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
      <button type="submit" disabled={busy} className="rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar diseño'}</button>
    </form>}
  </section>
}
