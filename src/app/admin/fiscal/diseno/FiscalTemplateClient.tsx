'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Eye, ImagePlus, LoaderCircle, Save, ShieldAlert, Upload } from 'lucide-react'

type Template = {
  commercialName: string
  address: string
  locality: string
  province: string
  phone: string
  whatsapp: string
  website: string
  logoUrl: string
  primaryColor: string
  showWebsite: boolean
  showWhatsapp: boolean
  footerText: string
}

const defaults: Template = {
  commercialName: '',
  address: '',
  locality: '',
  province: '',
  phone: '',
  whatsapp: '',
  website: '',
  logoUrl: '',
  primaryColor: '#ed164f',
  showWebsite: true,
  showWhatsapp: true,
  footerText: 'Gracias por elegirnos.',
}

const fields: { key: keyof Pick<Template, 'commercialName' | 'address' | 'locality' | 'province' | 'phone' | 'whatsapp' | 'website' | 'footerText'>; label: string; placeholder: string }[] = [
  { key: 'commercialName', label: 'Nombre comercial', placeholder: 'Nombre que verá el cliente' },
  { key: 'address', label: 'Dirección', placeholder: 'Calle y altura' },
  { key: 'locality', label: 'Localidad', placeholder: 'Localidad' },
  { key: 'province', label: 'Provincia', placeholder: 'Provincia' },
  { key: 'phone', label: 'Teléfono', placeholder: '+54 11 …' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '54911…' },
  { key: 'website', label: 'Sitio web', placeholder: 'https://tusitio.com' },
  { key: 'footerText', label: 'Texto de cierre', placeholder: 'Gracias por elegirnos.' },
]

function Field({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder}
        className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-normal text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
    </label>
  )
}

export default function FiscalTemplateClient() {
  const [template, setTemplate] = useState<Template>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/fiscal/template', { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el diseño.')
        if (!cancelled) setTemplate({ ...defaults, ...payload.template })
      })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se pudo cargar el diseño.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  function update<K extends keyof Template>(key: K, value: Template[K]) {
    setTemplate(current => ({ ...current, [key]: value }))
  }

  async function uploadLogo(file?: File) {
    if (!file) return
    setError('')
    setNotice('')
    if (file.size <= 0 || file.size > 2 * 1024 * 1024) {
      setError('El logo debe pesar hasta 2 MB.')
      return
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Usá una imagen PNG, JPG o WEBP.')
      return
    }
    setUploading(true)
    try {
      const prepared = await fetch('/api/admin/fiscal/template/logo-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
      })
      const data = await prepared.json()
      if (!prepared.ok) throw new Error(data.error || 'No se pudo preparar la subida del logo.')
      const uploaded = await fetch(data.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!uploaded.ok) throw new Error('No se pudo subir el logo al CDN.')
      update('logoUrl', data.publicUrl)
      setNotice('Logo subido al CDN. Guardá el diseño para conservar los cambios.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo subir el logo.')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/fiscal/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el diseño.')
      setTemplate({ ...defaults, ...payload.template })
      setNotice('Diseño guardado.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el diseño.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Fiscal · Presentación</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Diseño de comprobantes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">Configurá la identidad visual y los datos de contacto que acompañan al comprobante. La vista previa es ilustrativa; todavía no emite ni modifica facturas.</p>
        </div>
        <button onClick={() => void save()} disabled={loading || saving || uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Guardando…' : 'Guardar diseño'}
        </button>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert size={18} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{notice}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div>
            <h2 className="font-semibold text-gray-900">Identidad y contacto</h2>
            <p className="mt-1 text-sm text-gray-500">Estos datos son comerciales. La identificación y los valores fiscales deben venir de la emisión autorizada por ARCA.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(field => (
              <div key={field.key} className={field.key === 'commercialName' || field.key === 'address' || field.key === 'website' || field.key === 'footerText' ? 'sm:col-span-2' : ''}>
                <Field label={field.label} value={template[field.key]} placeholder={field.placeholder} onChange={value => update(field.key, value)} />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700">Logo comercial</label>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {template.logoUrl ? <img src={template.logoUrl} alt="Logo configurado" className="h-16 max-w-40 rounded-lg border border-gray-100 object-contain p-2" /> : <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400"><ImagePlus size={24} /></div>}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                {uploading ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? 'Subiendo…' : 'Subir logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={event => { void uploadLogo(event.target.files?.[0]); event.currentTarget.value = '' }} className="sr-only" />
              </label>
              {template.logoUrl && <button type="button" onClick={() => update('logoUrl', '')} className="text-sm font-medium text-red-700 hover:underline">Quitar logo</button>}
            </div>
            <p className="mt-2 text-xs text-gray-500">PNG, JPG o WEBP · máximo 2 MB · se guarda en el CDN existente media.zap.com.ar.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">Color de acento
              <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
                <input type="color" value={template.primaryColor} onChange={event => update('primaryColor', event.target.value)} className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0" />
                <span className="font-mono text-sm text-gray-600">{template.primaryColor.toUpperCase()}</span>
              </div>
            </label>
            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={template.showWebsite} onChange={event => update('showWebsite', event.target.checked)} className="rounded border-gray-300" /> Mostrar sitio web</label>
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={template.showWhatsapp} onChange={event => update('showWhatsapp', event.target.checked)} className="rounded border-gray-300" /> Mostrar WhatsApp</label>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2"><Eye size={18} className="text-gray-500" /><h2 className="font-semibold text-gray-900">Vista previa del diseño</h2></div>
          <div className="rounded-2xl border border-gray-200 bg-gray-100 p-3 sm:p-5">
            <article className="mx-auto max-w-[595px] bg-white p-5 shadow-sm sm:p-8">
              <div className="flex items-start justify-between gap-4 border-b-2 pb-5" style={{ borderColor: template.primaryColor }}>
                <div className="min-w-0">
                  {template.logoUrl && <img src={template.logoUrl} alt="" className="mb-3 max-h-14 max-w-36 object-contain object-left" />}
                  <h3 className="break-words text-lg font-bold text-gray-900">{template.commercialName || 'Nombre comercial'}</h3>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{[template.address, template.locality, template.province].filter(Boolean).join(' · ') || 'Dirección · Localidad · Provincia'}</p>
                  {template.phone && <p className="mt-1 text-xs text-gray-500">Tel. {template.phone}</p>}
                  {template.showWebsite && template.website && <p className="mt-1 break-all text-xs text-gray-500">{template.website}</p>}
                  {template.showWhatsapp && template.whatsapp && <p className="mt-1 text-xs text-gray-500">WhatsApp {template.whatsapp}</p>}
                </div>
                <div className="shrink-0 border border-gray-300 px-3 py-2 text-center">
                  <div className="text-xl font-bold text-gray-900">B</div>
                  <div className="text-[9px] uppercase tracking-wide text-gray-500">Ejemplo</div>
                </div>
              </div>
              <div className="mt-5 flex items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Comprobante ilustrativo</p><p className="mt-1 text-sm font-semibold text-gray-900">00004-00001234</p><p className="mt-1 text-xs text-gray-500">Fecha: 21/10/2026</p></div>
                <div className="text-right"><p className="text-xs text-gray-500">CAE</p><p className="mt-1 text-sm font-semibold text-gray-900">—</p><p className="mt-1 text-xs text-gray-500">Vencimiento: —</p></div>
              </div>
              <div className="mt-5 rounded-lg p-3 text-xs" style={{ backgroundColor: `${template.primaryColor}12` }}>
                <p className="font-semibold text-gray-900">Datos fiscales de ejemplo</p>
                <p className="mt-1 leading-5 text-gray-600">Razón social, CUIT, condición frente al IVA y QR fiscal se incorporarán desde los datos verificados de la emisión. No se editan desde este diseñador.</p>
              </div>
              <table className="mt-5 w-full text-left text-xs">
                <thead><tr style={{ backgroundColor: template.primaryColor, color: '#fff' }}><th className="px-2 py-2 font-semibold">Descripción</th><th className="px-2 py-2 text-right font-semibold">Cant.</th><th className="px-2 py-2 text-right font-semibold">Importe</th></tr></thead>
                <tbody><tr className="border-b border-gray-100"><td className="px-2 py-3 text-gray-700">Producto de ejemplo</td><td className="px-2 py-3 text-right text-gray-700">1</td><td className="px-2 py-3 text-right text-gray-700">$ 10.000,00</td></tr></tbody>
              </table>
              <div className="mt-4 flex justify-end"><div className="w-44 border-t border-gray-200 pt-3 text-right"><p className="text-xs text-gray-500">Total ilustrativo</p><p className="mt-1 text-xl font-bold" style={{ color: template.primaryColor }}>$ 10.000,00</p></div></div>
              <div className="mt-6 flex items-end justify-between gap-4 border-t border-gray-100 pt-4">
                <p className="max-w-[70%] text-xs leading-5 text-gray-500">{template.footerText || 'Texto de cierre'}</p>
                <div className="flex h-14 w-14 items-center justify-center border border-dashed border-gray-300 text-center text-[8px] leading-3 text-gray-400">QR<br />fiscal</div>
              </div>
            </article>
          </div>
          <p className="text-xs leading-5 text-gray-500">La vista previa muestra jerarquía visual y espacios reservados. No reemplaza el diseño legal final ni genera un comprobante válido.</p>
        </section>
      </div>
    </div>
  )
}
