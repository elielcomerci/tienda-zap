'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildFiscalInvoicePdfBlob, downloadFiscalInvoiceBatchPdf, downloadFiscalInvoicePdf, type FiscalPdfInvoice, type FiscalPdfTemplate } from '@/lib/fiscal-invoice-pdf'
import { AlertCircle, CheckCircle2, FileKey2, FileText, LoaderCircle, Plus, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react'

type Account = { id: string; userId: string; tenantName: string; tenantSlug: string; status: string; notes?: string | null; customer?: { name: string | null; email: string; phone: string | null } }
type Contributor = {
  id: string; cuit: string; environment: 'TEST' | 'PROD'; representativeCuit: string;
  razonSocial: string | null; authorizationStatus: string; permissions: Record<string, boolean> | null;
}
type Invoice = {
  id: string; environment: string; cuit: string; pointOfSale: number; voucherType: number;
  voucherNumber: number | null; result: string | null; cae: string | null;
  caeExpiresAt: string | null; amount: string | null; currency: string | null;
  jobId: string | null; invoicePdfUrl: string | null; createdAt: string; payload?: FiscalPdfInvoice['payload'] | null;
}
type CertificateInfo = { id: string; environment: string; status: string; cn?: string; expiresAt: string; daysUntilExpiry: number }
type Props = { accountId?: string; adminMode?: boolean }

const money = (value: string | null) => value === null ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value))
const date = (value: string | null) => value ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(value)) : '—'
const voucherName: Record<number, string> = { 1: 'Factura A', 6: 'Factura B', 11: 'Factura C', 51: 'Factura M' }

export default function FiscalWorkspaceClient({ accountId, adminMode = false }: Props) {
  const [account, setAccount] = useState<Account | null>(null)
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [pdfTemplate, setPdfTemplate] = useState<FiscalPdfTemplate | null>(null)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('Vista previa del comprobante')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cuit, setCuit] = useState('')
  const [representativeCuit, setRepresentativeCuit] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [environment, setEnvironment] = useState<'TEST' | 'PROD'>('TEST')
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null)
  const [certificateInfo, setCertificateInfo] = useState<{ active: CertificateInfo[] | null; others: CertificateInfo[] } | null>(null)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [keyFile, setKeyFile] = useState<File | null>(null)
  const [supportNotes, setSupportNotes] = useState('')
  const [platformStatus, setPlatformStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE')
  const [manualInvoice, setManualInvoice] = useState({ cuit: '', environment: 'PROD' as 'TEST' | 'PROD', pointOfSale: '1', voucherType: '6', voucherNumber: '', cae: '', caeFchVto: '', amount: '' })

  const scope = useMemo(() => accountId ? `?accountId=${encodeURIComponent(accountId)}` : '', [accountId])
  const api = useCallback((path: string) => `${path}${path.includes('?') ? '&' : '?'}${scope.replace(/^\?/, '')}`.replace(/\?$/, ''), [scope])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [accountResponse, contributorResponse] = await Promise.all([
        fetch(api('/api/fiscal/account'), { cache: 'no-store' }),
        fetch(api('/api/fiscal/contributors'), { cache: 'no-store' }),
      ])
      const accountPayload = await accountResponse.json()
      const contributorPayload = await contributorResponse.json()
      if (!accountResponse.ok) throw new Error(accountPayload.error || 'No se pudo cargar la cuenta fiscal.')
      if (!contributorResponse.ok) throw new Error(contributorPayload.error || 'No se pudieron consultar las CUIT.')
      setAccount(accountPayload.account || null)
      setSupportNotes(accountPayload.account?.notes || '')
      setPlatformStatus(accountPayload.account?.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE')
      setInvoices(accountPayload.invoices || [])
      setSelectedInvoiceIds([])
      setContributors(contributorPayload.contributors || [])
      const templateResponse = await fetch(api('/api/fiscal/template'), { cache: 'no-store' })
      if (templateResponse.ok) {
        const templatePayload = await templateResponse.json()
        setPdfTemplate(templatePayload.template || null)
      } else {
        setPdfTemplate(null)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar el espacio fiscal.')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { void load() }, [load])
  useEffect(() => () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
  }, [pdfPreviewUrl])

  async function addContributor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api('/api/fiscal/contributors'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit, representativeCuit: representativeCuit || cuit, razonSocial, environment }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'No se pudo vincular la CUIT.')
      setNotice(payload.message || 'CUIT vinculada. El acceso queda pendiente hasta completar la autorización fiscal.')
      setCuit(''); setRepresentativeCuit(''); setRazonSocial('')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo vincular la CUIT.')
    } finally { setBusy(false) }
  }

  async function loadCertificate(contributor: Contributor) {
    setSelectedContributor(contributor); setCertificateInfo(null); setError(''); setNotice('')
    try {
      const response = await fetch(api(`/api/fiscal/contributors/${encodeURIComponent(contributor.cuit)}/certificate?environment=${contributor.environment}`), { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'No se pudo consultar el certificado.')
      setCertificateInfo(payload)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo consultar el certificado.') }
  }

  async function uploadCertificate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedContributor || !certFile || !keyFile) return
    setBusy(true); setError(''); setNotice('')
    try {
      const form = new FormData()
      form.append('cert', certFile, certFile.name)
      form.append('key', keyFile, keyFile.name)
      form.append('environment', selectedContributor.environment)
      const response = await fetch(api(`/api/fiscal/contributors/${encodeURIComponent(selectedContributor.cuit)}/certificate`), { method: 'POST', body: form })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'No se pudo validar el certificado.')
      setNotice(payload.message || 'Certificado recibido. Revisá el estado y la fecha de vencimiento.')
      setCertFile(null); setKeyFile(null)
      await loadCertificate(selectedContributor)
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cargar el certificado.') }
    finally { setBusy(false) }
  }

  async function saveSupportSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accountId || !adminMode) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(`/api/admin/fiscal/clients/${encodeURIComponent(accountId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: supportNotes, status: platformStatus }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudieron guardar las notas.')
      setNotice('Notas y estado de acceso guardados.')
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron guardar las notas.') }
    finally { setBusy(false) }
  }


  function toggleInvoiceSelection(invoiceId: string, checked: boolean) {
    setSelectedInvoiceIds(current => checked
      ? [...new Set([...current, invoiceId])]
      : current.filter(id => id !== invoiceId))
  }

  async function previewInvoicePdf(invoice: Invoice) {
    setError(''); setNotice('')
    if (!pdfTemplate) {
      setError('No se pudo cargar el diseño fiscal. Verificá la configuración de la plantilla y las migraciones antes de previsualizar.')
      return
    }
    try {
      const blob = await buildFiscalInvoicePdfBlob(invoice as FiscalPdfInvoice, pdfTemplate)
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
      setPdfPreviewUrl(URL.createObjectURL(blob))
      setPdfPreviewTitle(`${voucherName[invoice.voucherType] || 'Comprobante'} ${invoice.voucherNumber ?? ''}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo preparar la vista previa.')
    }
  }

  async function exportInvoicePdf(invoice: Invoice) {
    setError(''); setNotice('')
    if (!pdfTemplate) {
      setError('No se pudo cargar el diseño fiscal. Verificá la configuración de la plantilla y las migraciones antes de exportar.')
      return
    }
    try {
      await downloadFiscalInvoicePdf(invoice as FiscalPdfInvoice, pdfTemplate)
      setNotice('PDF generado en este dispositivo.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo generar el PDF.')
    }
  }

  async function exportBatchPdf() {
    setError(''); setNotice('')
    if (!pdfTemplate) {
      setError('No se pudo cargar el diseño fiscal. Verificá la configuración de la plantilla y las migraciones antes de exportar.')
      return
    }
    const selected = invoices.filter(invoice => selectedInvoiceIds.includes(invoice.id))
    try {
      await downloadFiscalInvoiceBatchPdf(selected as FiscalPdfInvoice[], pdfTemplate)
      setNotice(`PDF de lote generado en este dispositivo: ${selected.length} comprobante(s).`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo generar el PDF del lote.')
    }
  }

  const isInvoiceExportable = (invoice: Invoice) => ['A', 'DONE'].includes(String(invoice.result)) && Boolean(invoice.cae && invoice.voucherNumber && invoice.payload?.voucher?.date && invoice.payload?.amounts?.total !== undefined && invoice.payload?.customer?.docType !== undefined && invoice.payload?.customer?.docNumber && invoice.payload?.items?.length)
  const authorizedInvoices = invoices.filter(isInvoiceExportable)

  async function registerExistingInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accountId || !adminMode) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(`/api/admin/fiscal/clients/${encodeURIComponent(accountId)}/invoices`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualInvoice,
          pointOfSale: Number(manualInvoice.pointOfSale),
          voucherType: Number(manualInvoice.voucherType),
          voucherNumber: Number(manualInvoice.voucherNumber),
          amount: Number(manualInvoice.amount),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo asignar el comprobante.')
      setNotice(payload.message || 'Comprobante asignado al cliente.')
      setManualInvoice(current => ({ ...current, voucherNumber: '', cae: '', caeFchVto: '', amount: '' }))
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo asignar el comprobante.') }
    finally { setBusy(false) }
  }

  if (loading) return <div className="mx-auto max-w-7xl p-8 text-sm text-gray-500">Cargando espacio fiscal…</div>
  if (!account) return <div className="mx-auto max-w-4xl p-8"><div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8"><h1 className="text-xl font-bold text-gray-900">Cuenta fiscal todavía no vinculada</h1><p className="mt-2 text-sm leading-6 text-gray-600">{adminMode ? 'Esta cuenta no tiene un vínculo fiscal activo. Volvé a Clientes fiscales y asigná una cuenta del Worker.' : 'Estamos preparando tu espacio fiscal. Contactá a ZAP para vincular tu cuenta y ayudarte con la configuración inicial.'}</p></div></div>

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">{adminMode ? 'ZAP · Soporte fiscal' : 'Mi cuenta · Fiscal'}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{adminMode ? account.customer?.name || account.tenantName : 'Mi cuenta fiscal'}</h1>
          <p className="mt-2 text-sm text-gray-500">{adminMode ? account.customer?.email : 'Administrá tus datos fiscales con asistencia de ZAP.'} · {account.tenantName}</p>
        </div>
        <button onClick={() => void load()} disabled={loading || busy} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={16} /> Actualizar</button>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{notice}</div>}

      {adminMode && accountId && <div><a href={`/admin/fiscal/clientes/${encodeURIComponent(accountId)}/diseno`} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Configurar diseño del comprobante</a></div>}

      {adminMode && accountId && <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Seguimiento interno de ZAP</h2>
        <p className="mt-1 text-sm text-gray-500">Notas para el equipo y control de acceso a través de este panel. Pausar acá no suspende directamente el tenant en el Worker.</p>
        <form onSubmit={event => void saveSupportSettings(event)} className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <label className="block text-sm font-medium text-gray-700">Notas de soporte
            <textarea rows={3} maxLength={5000} value={supportNotes} onChange={event => setSupportNotes(event.target.value)} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" placeholder="Pendientes, gestiones, contacto, observaciones internas…" />
          </label>
          <label className="block text-sm font-medium text-gray-700">Acceso al panel
            <select value={platformStatus} onChange={event => setPlatformStatus(event.target.value as 'ACTIVE' | 'PAUSED')} className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-normal">
              <option value="ACTIVE">Activo</option><option value="PAUSED">Pausado</option>
            </select>
          </label>
          <button disabled={busy} className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar'}</button>
        </form>
      </section>}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">CUIT vinculadas</p><p className="mt-2 text-3xl font-bold text-gray-900">{contributors.length}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">Comprobantes registrados</p><p className="mt-2 text-3xl font-bold text-gray-900">{invoices.length}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">Estado de la cuenta</p><p className="mt-2 text-lg font-bold text-emerald-700">{account.status === 'ACTIVE' ? 'Activa' : account.status}</p></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Vincular CUIT</h2>
          <p className="mt-1 text-sm leading-5 text-gray-500">Cada CUIT y ambiente se autorizan por separado. TEST y producción no comparten puntos de venta ni certificados.</p>
          <form onSubmit={event => void addContributor(event)} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">CUIT emisor
              <input required inputMode="numeric" pattern="\d{11}" maxLength={11} value={cuit} onChange={event => setCuit(event.target.value.replace(/\D/g, '').slice(0,11))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" placeholder="11 dígitos" />
            </label>
            <label className="block text-sm font-medium text-gray-700">CUIT representante del certificado
              <input inputMode="numeric" pattern="\d{11}" maxLength={11} value={representativeCuit} onChange={event => setRepresentativeCuit(event.target.value.replace(/\D/g, '').slice(0,11))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" placeholder="Si es la misma, dejalo vacío" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Razón social
              <input required value={razonSocial} onChange={event => setRazonSocial(event.target.value)} maxLength={180} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" placeholder="Tal como figura en ARCA" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Ambiente
              <select value={environment} onChange={event => setEnvironment(event.target.value as 'TEST' | 'PROD')} className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-normal">
                <option value="TEST">Homologación (TEST)</option><option value="PROD">Producción (PROD)</option>
              </select>
            </label>
            <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Vincular CUIT</button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-gray-900">CUIT y autorización</h2><span className="text-xs text-gray-400">{contributors.length} registros</span></div>
          {contributors.length === 0 ? <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Todavía no hay CUIT vinculadas a esta cuenta.</p> : <div className="mt-4 space-y-3">
            {contributors.map(item => <article key={item.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-semibold text-gray-900">{item.razonSocial || 'Contribuyente'}</p><p className="mt-1 font-mono text-sm text-gray-600">{item.cuit}</p><p className="mt-1 text-xs text-gray-500">Representante {item.representativeCuit} · {item.environment === 'TEST' ? 'Homologación' : 'Producción'}</p></div>
                <span className={item.authorizationStatus === 'ACTIVE' ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700'}>{item.authorizationStatus === 'ACTIVE' ? 'Autorizada' : item.authorizationStatus === 'PENDING' ? 'Pendiente' : item.authorizationStatus}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void loadCertificate(item)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"><FileKey2 size={14} /> Certificado</button>
                <button onClick={() => { setSelectedContributor(item); setCertificateInfo(null) }} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"><UploadCloud size={14} /> Cargar certificado</button>
              </div>
            </article>)}
          </div>}
        </div>
      </section>

      {selectedContributor && <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-gray-900">Certificado digital</h2><p className="mt-1 text-sm text-gray-500">CUIT {selectedContributor.cuit} · {selectedContributor.environment === 'TEST' ? 'Homologación' : 'Producción'}</p></div><button onClick={() => { setSelectedContributor(null); setCertificateInfo(null); setCertFile(null); setKeyFile(null) }} className="text-sm text-gray-500 hover:text-gray-900">Cerrar</button></div>
        {certificateInfo && <div className="mt-4 space-y-2">
          {(certificateInfo.active || []).concat(certificateInfo.others || []).filter(cert => cert.environment === selectedContributor.environment).map(cert => <div key={cert.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 text-sm"><div><p className="font-semibold text-gray-800">{cert.cn || 'Certificado'} · {cert.status}</p><p className="text-xs text-gray-500">Vence {date(cert.expiresAt)} · {cert.daysUntilExpiry} días</p></div><span className="font-mono text-xs text-gray-500">{cert.environment}</span></div>)}
          {!(certificateInfo.active || []).length && !(certificateInfo.others || []).length && <p className="text-sm text-gray-500">No hay certificados cargados para este ambiente.</p>}
        </div>}
        <form onSubmit={event => void uploadCertificate(event)} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">Certificado (.crt o .pem)
            <input required type="file" accept=".crt,.pem,.cer,application/x-pem-file" onChange={event => setCertFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-xl border border-gray-200 p-2 text-sm font-normal" />
          </label>
          <label className="block text-sm font-medium text-gray-700">Clave privada (.key o .pem)
            <input required type="file" accept=".key,.pem,application/x-pem-file" onChange={event => setKeyFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-xl border border-gray-200 p-2 text-sm font-normal" />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button disabled={busy || !certFile || !keyFile} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <UploadCloud size={16} />} Validar y cargar</button>
            <p className="text-xs leading-5 text-gray-500">Los archivos se envían al Worker para validación y cifrado. No se guardan en el navegador ni en el CDN público.</p>
          </div>
        </form>
      </section>}

      {adminMode && <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Asignar comprobante ya emitido</h2>
        <p className="mt-1 text-sm leading-5 text-gray-500">Para comprobantes autorizados fuera del panel. Esto registra los datos que ingreses; no consulta ni valida el CAE ante ARCA.</p>
        <form onSubmit={event => void registerExistingInvoice(event)} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-gray-700">CUIT emisor<input required pattern="\d{11}" maxLength={11} value={manualInvoice.cuit} onChange={event => setManualInvoice(v => ({ ...v, cuit: event.target.value.replace(/\D/g, '').slice(0,11) }))} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm font-normal" /></label>
          <label className="text-sm font-medium text-gray-700">Ambiente<select value={manualInvoice.environment} onChange={event => setManualInvoice(v => ({ ...v, environment: event.target.value as 'TEST' | 'PROD' }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-normal"><option value="TEST">TEST</option><option value="PROD">PROD</option></select></label>
          <label className="text-sm font-medium text-gray-700">Punto de venta<input required type="number" min="1" value={manualInvoice.pointOfSale} onChange={event => setManualInvoice(v => ({ ...v, pointOfSale: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 font-normal" /></label>
          <label className="text-sm font-medium text-gray-700">Tipo<select value={manualInvoice.voucherType} onChange={event => setManualInvoice(v => ({ ...v, voucherType: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-normal"><option value="1">Factura A</option><option value="6">Factura B</option><option value="11">Factura C</option><option value="51">Factura M</option></select></label>
          <label className="text-sm font-medium text-gray-700">Número<input required type="number" min="1" value={manualInvoice.voucherNumber} onChange={event => setManualInvoice(v => ({ ...v, voucherNumber: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 font-normal" /></label>
          <label className="text-sm font-medium text-gray-700">CAE<input required inputMode="numeric" pattern="\d{14}" maxLength={14} value={manualInvoice.cae} onChange={event => setManualInvoice(v => ({ ...v, cae: event.target.value.replace(/\D/g, '').slice(0,14) }))} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm font-normal" /></label>
          <label className="text-sm font-medium text-gray-700">Vencimiento CAE<input required type="date" value={manualInvoice.caeFchVto ? `${manualInvoice.caeFchVto.slice(0,4)}-${manualInvoice.caeFchVto.slice(4,6)}-${manualInvoice.caeFchVto.slice(6,8)}` : ''} onChange={event => setManualInvoice(v => ({ ...v, caeFchVto: event.target.value.replace(/-/g, '') }))} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 font-normal" /></label>
          <label className="text-sm font-medium text-gray-700">Total (ARS)<input required type="number" min="0" step="0.01" value={manualInvoice.amount} onChange={event => setManualInvoice(v => ({ ...v, amount: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 font-normal" /></label>
          <div className="sm:col-span-2 lg:col-span-4"><button disabled={busy} className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Registrando…' : 'Asignar a esta cuenta'}</button></div>
        </form>
      </section>}

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><FileText size={18} className="text-gray-500" /><h2 className="font-semibold text-gray-900">Comprobantes registrados</h2></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSelectedInvoiceIds(authorizedInvoices.map(invoice => invoice.id))} disabled={!authorizedInvoices.length} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-40">Seleccionar autorizadas</button>
            <button type="button" onClick={() => setSelectedInvoiceIds([])} disabled={!selectedInvoiceIds.length} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-40">Limpiar</button>
            <button type="button" onClick={() => void exportBatchPdf()} disabled={!selectedInvoiceIds.length || !pdfTemplate} className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Descargar lote PDF</button>
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-gray-500">La generación del PDF y del QR se ejecuta en este dispositivo. Solo se habilita para comprobantes autorizados con datos fiscales completos; los comprobantes cargados manualmente no se consideran verificados por ARCA.</p>
        {invoices.length === 0 ? <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Las facturas emitidas desde este panel aparecerán acá con su CAE y vencimiento.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm"><thead><tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500"><th className="pb-3 pr-3">PDF</th><th className="pb-3 pr-4">Fecha</th><th className="pb-3 pr-4">Comprobante</th><th className="pb-3 pr-4">CUIT</th><th className="pb-3 pr-4">Ambiente</th><th className="pb-3 pr-4">Total</th><th className="pb-3 pr-4">CAE</th><th className="pb-3 pr-4">Vencimiento</th><th className="pb-3">Acción</th></tr></thead><tbody>{invoices.map(invoice => <tr key={invoice.id} className="border-b border-gray-100"><td className="py-3 pr-3"><input aria-label={`Seleccionar ${voucherName[invoice.voucherType] || 'comprobante'} ${invoice.voucherNumber ?? ''}`} type="checkbox" checked={selectedInvoiceIds.includes(invoice.id)} disabled={!isInvoiceExportable(invoice)} onChange={event => toggleInvoiceSelection(invoice.id, event.target.checked)} /></td><td className="py-3 pr-4 text-gray-600">{date(invoice.createdAt)}</td><td className="py-3 pr-4 font-medium text-gray-900">{voucherName[invoice.voucherType] || `Tipo ${invoice.voucherType}`} {invoice.voucherNumber ?? 'Pendiente'}</td><td className="py-3 pr-4 font-mono text-xs">{invoice.cuit}</td><td className="py-3 pr-4">{invoice.environment}</td><td className="py-3 pr-4">{money(invoice.amount)}</td><td className="py-3 pr-4 font-mono text-xs">{invoice.cae || '—'}</td><td className="py-3 pr-4">{date(invoice.caeExpiresAt)}</td><td className="py-3"><div className="flex gap-2"><button type="button" onClick={() => void previewInvoicePdf(invoice)} disabled={!isInvoiceExportable(invoice) || !pdfTemplate} className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-40">Previsualizar</button><button type="button" onClick={() => void exportInvoicePdf(invoice)} disabled={!isInvoiceExportable(invoice) || !pdfTemplate} className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-40">Descargar PDF</button></div></td></tr>)}</tbody></table></div>}
      </section>
      <p className="flex items-start gap-2 text-xs leading-5 text-gray-500"><ShieldCheck size={15} className="mt-0.5 shrink-0" />La interfaz distingue homologación y producción. La autorización para emitir depende del estado real informado por el Worker y ARCA.</p>
      {pdfPreviewUrl && <div role="dialog" aria-modal="true" aria-label={pdfPreviewTitle} className="fixed inset-0 z-50 flex flex-col bg-black/60 p-3 sm:p-8">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <h2 className="font-semibold text-gray-900">{pdfPreviewTitle}</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null) }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">Cerrar</button>
            </div>
          </div>
          <iframe title={pdfPreviewTitle} src={pdfPreviewUrl} className="min-h-0 flex-1 bg-gray-100" />
        </div>
      </div>}
    </div>
  )
}
