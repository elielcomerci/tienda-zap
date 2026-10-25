'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { buildFiscalInvoicePdfBlob, downloadFiscalInvoiceBatchPdf, downloadFiscalInvoicePdf, type FiscalPdfInvoice, type FiscalPdfTemplate } from '@/lib/fiscal-invoice-pdf'
import FiscalBatchImport from '@/components/fiscal/FiscalBatchImport'
import FiscalWorkerTools from '@/components/fiscal/FiscalWorkerTools'
import CertificateCsrAssistant from '@/components/fiscal/CertificateCsrAssistant'
import FiscalInvoiceTemplateEditor from '@/components/fiscal/FiscalInvoiceTemplateEditor'
import { AlertCircle, CheckCircle2, FileText, LoaderCircle, Plus, RefreshCw, Search, ShieldCheck, UploadCloud } from 'lucide-react'

type Account = { id: string; userId: string; tenantName: string; tenantSlug: string; status: string; notes?: string | null; customer?: { name: string | null; email: string; phone: string | null } }
type Contributor = {
  id: string; cuit: string; environment: 'TEST' | 'PROD'; representativeCuit: string;
  razonSocial: string | null; authorizationStatus: string; permissions: Record<string, boolean> | null; authorizationVerified?: boolean;
}
type Invoice = {
  id: string; environment: string; cuit: string; pointOfSale: number; voucherType: number;
  voucherNumber: number | null; result: string | null; cae: string | null;
  caeExpiresAt: string | null; amount: string | null; currency: string | null;
  jobId: string | null; workerVoucherId?: string | null; invoicePdfUrl: string | null; createdAt: string; payload?: (FiscalPdfInvoice['payload'] & { documentSnapshot?: FiscalPdfInvoice['documentSnapshot']; pdfTemplateSnapshot?: FiscalPdfTemplate | null }) | null; documentSnapshot?: FiscalPdfInvoice['documentSnapshot']; pdfTemplateSnapshot?: FiscalPdfTemplate | null
}
type InvoiceStatusFilter = 'all' | 'authorized' | 'processing' | 'review'

function getInvoiceStatus(invoice: Invoice): Exclude<InvoiceStatusFilter, 'all'> {
  const result = String(invoice.result || '').toUpperCase()
  if (invoice.cae && ['A', 'DONE'].includes(result)) return 'authorized'
  if (['PENDING', 'CREATED', 'PROCESSING', 'RUNNING'].includes(result) || (invoice.jobId && !invoice.cae)) return 'processing'
  return 'review'
}
type CertificateInfo = { id: string; environment: string; status: string; cn?: string; expiresAt: string; daysUntilExpiry: number }
type SavedCustomer = { id: string; name: string; documentType: string | null; documentNumber: string | null; vatCondition: string | null; address: string | null }
type SavedProduct = { id: string; kind: 'PRODUCT' | 'SERVICE'; description: string; unit: string; unitPrice: string; vatRatePercent: string | null }
const emissionDraftSchema = z.object({
  cuit: z.string(), environment: z.enum(['TEST', 'PROD']), pointOfSale: z.string(), type: z.enum(['A', 'B', 'C', 'M']),
  concept: z.string(), date: z.string(), serviceFrom: z.string(), serviceTo: z.string(), paymentDueDate: z.string(),
  docType: z.string(), docNumber: z.string(), customerName: z.string(), customerAddress: z.string(),
  vatCondition: z.string(), saleCondition: z.string(), description: z.string(), netBase: z.string(),
  vatRate: z.string(), otherNationalIndirectTaxes: z.string(),
})
const emissionDraftStorageKey = 'zap-nodo-emission-draft'
export type FiscalWorkspaceSection = 'all' | 'summary' | 'emit' | 'batch' | 'invoices' | 'settings' | 'tools'
type Props = { accountId?: string; adminMode?: boolean; section?: FiscalWorkspaceSection }
type Usage = { plan: string; planVersion: number; periodStart: string; invoices: { included: number | null; consumed: number; reserved: number; remaining: number | null; overage: number }; padron: { included: number | null; consumed: number; reserved: number; remaining: number | null; overage: number }; requests: { included: number | null; consumed: number; reserved: number; remaining: number | null; overage: number }; linkedCuits: number; maxCuits: number | null }
type FiscalEmissionRequest = {
  externalId: string
  idempotencyKey: string
  contributor: { cuit: string; pointOfSale: number; environment: 'TEST' | 'PROD' }
  voucher: { type: 'A' | 'B' | 'C' | 'M'; concept: number; date: string; serviceFrom?: string; serviceTo?: string; paymentDueDate?: string; saleCondition?: string }
  amounts: { total: number; net: number; vat: number; exempt: number; nonTaxable: number; otherNationalIndirectTaxes?: number; vatBreakdown?: Array<{ rate: number; base: number; amount: number }> }
  items: Array<{ description: string; quantity: number; unitPrice: number; discountAmount: number; netAmount: number; vatRate: number | null; vatAmount: number; exemptAmount: number; nonTaxableAmount: number; totalAmount: number }>
  customer: { docType: number; docNumber: string; name?: string; address?: string; vatCondition?: number }
}

const money = (value: string | null) => value === null ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value))
const date = (value: string | null) => value ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(value)) : '—'
const voucherName: Record<number, string> = { 1: 'Factura A', 6: 'Factura B', 11: 'Factura C', 51: 'Factura M' }
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const surfaceShadow = "ring-1 ring-slate-900/5 shadow-[0_1px_2px_0_rgba(15,23,42,0.03),0_8px_16px_-4px_rgba(15,23,42,0.04)]"

function UsageMetric({ title, included, consumed, reserved, remaining, overage }: { title: string; included: number | null; consumed: number; reserved: number; remaining: number | null; overage: number }) {
  const format = (value: number | null) => value === null ? 'Sin limite' : new Intl.NumberFormat('es-AR').format(value)
  return <div className="rounded-xl border border-gray-200 p-4"><p className="text-sm text-gray-600">{title}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-gray-950">{format(consumed)}{reserved ? ` + ${format(reserved)} reservados` : ''}{included !== null ? ` / ${format(included)}` : ''}</p><p className="mt-1 text-sm text-gray-500">{included === null ? 'Sin limite establecido en el plan' : `${format(included)} incluidos · ${format(remaining)} disponibles`}</p>{overage > 0 && <p className="mt-2 text-xs font-semibold text-amber-800">Excedente registrado: {format(overage)}.</p>}</div>
}

export default function FiscalWorkspaceClient({ accountId, adminMode = false, section = 'all' }: Props) {
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [usage, setUsage] = useState<Usage | null>(null)
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([])
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoiceCount, setInvoiceCount] = useState<number | null>(null)
  const [pdfTemplate, setPdfTemplate] = useState<FiscalPdfTemplate | null>(null)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('Vista previa del comprobante')
  const [loading, setLoading] = useState(true)
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false)
  const [showAddContributor, setShowAddContributor] = useState(false)
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cuit, setCuit] = useState('')
  const [representativeCuit, setRepresentativeCuit] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [padronLookup, setPadronLookup] = useState<{ cuit: string; key: string; status: 'idle' | 'loading' | 'pending' | 'success' | 'manual'; message: string; estado?: string }>({ cuit: '', key: '', status: 'idle', message: '' })
  const [environment, setEnvironment] = useState<'TEST' | 'PROD'>('TEST')
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null)
  const [settingsTab, setSettingsTab] = useState<'access' | 'invoice'>('access')
  const [certificateInfo, setCertificateInfo] = useState<{ active: CertificateInfo[] | null; others: CertificateInfo[] } | null>(null)
  const [certificateLoading, setCertificateLoading] = useState(false)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [keyFile, setKeyFile] = useState<File | null>(null)
  const [supportNotes, setSupportNotes] = useState('')
  const [platformStatus, setPlatformStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE')
  const [manualInvoice, setManualInvoice] = useState({ cuit: '', environment: 'PROD' as 'TEST' | 'PROD', pointOfSale: '1', voucherType: '6', voucherNumber: '', cae: '', caeFchVto: '', amount: '' })
  const [emission, setEmission] = useState({
    cuit: '', environment: 'TEST' as 'TEST' | 'PROD', pointOfSale: '1', type: 'B' as 'A' | 'B' | 'C' | 'M',
    concept: '1', date: '', serviceFrom: '', serviceTo: '', paymentDueDate: '',
    docType: '99', docNumber: '0', customerName: '', customerAddress: '', vatCondition: '5', saleCondition: 'Contado',
    description: '', netBase: '', vatRate: '21', otherNationalIndirectTaxes: '0',
  })
  const [emissionStep, setEmissionStep] = useState<1 | 2>(1)
  const [preparedEmission, setPreparedEmission] = useState<FiscalEmissionRequest | null>(null)
  const [preparedMode, setPreparedMode] = useState<'validated' | 'uncertain' | null>(null)
  const [emissionPreview, setEmissionPreview] = useState<{ cbteTipo: number; impTotal: number } | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [invoiceEnvironmentFilter, setInvoiceEnvironmentFilter] = useState<'ALL' | 'TEST' | 'PROD'>('ALL')
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatusFilter>('all')

  const scope = useMemo(() => accountId ? `?accountId=${encodeURIComponent(accountId)}` : '', [accountId])
  const api = useCallback((path: string) => `${path}${path.includes('?') ? '&' : '?'}${scope.replace(/^\?/, '')}`.replace(/\?$/, ''), [scope])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [accountResponse, contributorResponse, featureResponse, usageResponse, customersResponse, productsResponse] = await Promise.all([
        fetch(api('/api/nodo/account'), { cache: 'no-store' }),
        fetch(api('/api/nodo/contributors'), { cache: 'no-store' }),
        fetch(api('/api/nodo/feature-flags'), { cache: 'no-store' }).catch(() => null),
        fetch(api('/api/nodo/usage'), { cache: 'no-store' }).catch(() => null),
        fetch(api('/api/nodo/customers'), { cache: 'no-store' }).catch(() => null),
        fetch(api('/api/nodo/products'), { cache: 'no-store' }).catch(() => null),
      ])
      const accountPayload = await accountResponse.json()
      const contributorPayload = await contributorResponse.json()
      const featurePayload = featureResponse?.ok ? await featureResponse.json().catch(() => ({})) : {}
      setFeatureFlags(featurePayload.flags && typeof featurePayload.flags === 'object' ? featurePayload.flags : {})
      if (!accountResponse.ok) throw new Error(accountPayload.error || 'No se pudo cargar la cuenta fiscal.')
      if (!contributorResponse.ok) throw new Error(contributorPayload.error || 'No se pudieron consultar las CUIT.')
      setAccount(accountPayload.account || null)
      setInvoiceCount(Number.isInteger(accountPayload.invoicesCount) ? accountPayload.invoicesCount : null)
      setSupportNotes(accountPayload.account?.notes || '')
      setPlatformStatus(accountPayload.account?.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE')
      setInvoices((accountPayload.invoices || []).map((invoice: Invoice) => ({
        ...invoice,
        documentSnapshot: invoice.documentSnapshot || invoice.payload?.documentSnapshot || null,
        pdfTemplateSnapshot: invoice.pdfTemplateSnapshot || invoice.payload?.pdfTemplateSnapshot || null,
      })))
      setSelectedInvoiceIds([])
      setContributors(contributorPayload.contributors || [])
      setWorkspaceLoaded(true)
      const customersPayload = customersResponse?.ok ? await customersResponse.json().catch(() => ({})) : {}
      const productsPayload = productsResponse?.ok ? await productsResponse.json().catch(() => ({})) : {}
      setSavedCustomers(Array.isArray(customersPayload.customers) ? customersPayload.customers : [])
      setSavedProducts(Array.isArray(productsPayload.products) ? productsPayload.products : [])
      if (usageResponse?.ok) setUsage(await usageResponse.json().catch(() => null))
      else setUsage(null)
      const templateResponse = await fetch(api('/api/nodo/template'), { cache: 'no-store' })
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
  useEffect(() => {
    if (section !== 'emit' || savedCustomers.length === 0) return
    const url = new URL(window.location.href)
    const customerId = url.searchParams.get('clienteId')
    const customer = savedCustomers.find(item => item.id === customerId)
    if (!customer) return
    let savedEmission: ReturnType<typeof emissionDraftSchema.safeParse> | null = null
    try {
      const rawDraft = window.sessionStorage.getItem(emissionDraftStorageKey)
      if (rawDraft) savedEmission = emissionDraftSchema.safeParse(JSON.parse(rawDraft))
    } catch {
      savedEmission = null
    }
    const documentTypes: Record<string, string> = { CUIT: '80', CUIL: '86', DNI: '96', CONSUMIDOR_FINAL: '99' }
    const documentType = customer.documentType ? documentTypes[customer.documentType] : undefined
    setEmission(current => ({
      ...current,
      ...(savedEmission?.success ? savedEmission.data : {}),
      ...(documentType ? { docType: documentType, docNumber: documentType === '99' ? '0' : customer.documentNumber || '' } : {}),
      customerName: customer.name,
      customerAddress: customer.address || '',
      vatCondition: documentType === '99' ? '5' : customer.vatCondition || (savedEmission?.success ? savedEmission.data.vatCondition : current.vatCondition),
    }))
    setEmissionStep(2)
    window.sessionStorage.removeItem(emissionDraftStorageKey)
    url.searchParams.delete('clienteId')
    window.history.replaceState(null, '', url)
  }, [savedCustomers, section])
  useEffect(() => {
    if (!selectedContributor) return
    document.getElementById('certificate-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedContributor])
  useEffect(() => () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
  }, [pdfPreviewUrl])

  async function removeContributor(contributor: Contributor) {
    if (featureFlags.contributorManagement !== true) return
    if (!confirm(`¿Quitar la CUIT ${contributor.cuit} de ${contributor.environment === 'TEST' ? 'homologación' : 'producción'} de esta cuenta? Se revocará el vínculo en el Worker, se bloquearán sus permisos y certificados para esta cuenta y dejará de aparecer en la lista. No se elimina la identidad fiscal global ni los comprobantes históricos.`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api(`/api/nodo/contributors/${encodeURIComponent(contributor.cuit)}?environment=${contributor.environment}`), { method: 'DELETE' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'No se pudo quitar la CUIT.')
      setNotice(payload.message || `Se quitó la CUIT ${contributor.cuit} de ${contributor.environment}.`)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo quitar la CUIT.')
    } finally { setBusy(false) }
  }

  async function addContributor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (padronLookup.cuit !== cuit || !['success', 'manual'].includes(padronLookup.status)) {
      setError('Consultá el padrón para esta CUIT o completá la consulta manual antes de vincularla.')
      return
    }
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api('/api/nodo/contributors'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit, representativeCuit: representativeCuit || cuit, razonSocial, environment }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'No se pudo vincular la CUIT.')
      setNotice(payload.message || 'CUIT vinculada. El acceso queda pendiente hasta completar la autorización fiscal.')
      setCuit(''); setRepresentativeCuit(''); setRazonSocial('')
      setShowAddContributor(false)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo vincular la CUIT.')
    } finally { setBusy(false) }
  }

  async function lookupContributorPadron() {
    if (!/^\d{11}$/.test(cuit)) return
    const key = padronLookup.status === 'pending' && padronLookup.cuit === cuit && padronLookup.key
      ? padronLookup.key
      : `nodo-contributor-${crypto.randomUUID()}`
    setPadronLookup({ cuit, key, status: 'loading', message: '' })
    setRazonSocial('')
    setError('')
    try {
      const response = await fetch('/api/nodo/onboarding/padron', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ cuit }), cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean; data?: { razonSocial?: string; estadoRegistral?: string }; retryAfterSeconds?: number;
        error?: string | { message?: string }
      }
      if (response.status === 202) {
        setPadronLookup({ cuit, key, status: 'pending', message: `Consulta en curso. Reintentá en ${payload.retryAfterSeconds || 5} segundos.` })
        return
      }
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : payload.error?.message || 'No se pudo consultar el padrón.')
      if (!payload.data?.razonSocial) {
        setPadronLookup({ cuit, key: '', status: 'manual', message: 'ZAP no recibió una razón social de ARCA. Podés completarla manualmente.' })
        return
      }
      setRazonSocial(payload.data.razonSocial)
      setPadronLookup({ cuit, key: '', status: 'success', message: `Datos consultados por ZAP${payload.data.estadoRegistral ? ` · Estado registral: ${payload.data.estadoRegistral}` : ''}.` })
    } catch (reason) {
      setPadronLookup({ cuit, key: '', status: 'manual', message: `${reason instanceof Error ? reason.message : 'No se pudo consultar el padrón.'} Podés completar la razón social manualmente.` })
    }
  }

  async function loadCertificate(contributor: Contributor) {
    setSelectedContributor(contributor); setCertificateInfo(null); setError(''); setNotice('')
    setCertificateLoading(true)
    try {
      const response = await fetch(api(`/api/nodo/contributors/${encodeURIComponent(contributor.cuit)}/certificate?environment=${contributor.environment}`), { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'No se pudo consultar el certificado.')
      setCertificateInfo(payload)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo consultar el certificado.') }
    finally { setCertificateLoading(false) }
  }

  async function checkPadronAccess(contributor: Contributor) {
    if (featureFlags.padronQuery !== true) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api(`/api/nodo/contributors/${encodeURIComponent(contributor.cuit)}/padron/connection-check?environment=${contributor.environment}&source=a13`), { method: 'POST' })
      const payload = await response.json().catch(() => ({})) as { error?: string | { message?: string } }
      if (!response.ok) {
        const message = typeof payload.error === 'string' ? payload.error : payload.error?.message
        throw new Error(message || 'ARCA no pudo validar el acceso al padrón.')
      }
      setSelectedContributor(current => current ? {
        ...current,
        authorizationStatus: 'ACTIVE',
        permissions: { ...(current.permissions ?? {}), canQueryPadron: true },
      } : current)
      setNotice(contributor.permissions?.canEmit === true
        ? `Acceso al padrón validado en ${contributor.environment}. Los permisos de emisión no se modificaron.`
        : `Acceso al padrón validado en ${contributor.environment}. La consulta quedó habilitada y la emisión sigue desactivada.`)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo validar el acceso al padrón.')
    } finally { setBusy(false) }
  }

  async function revokeCertificates() {
    if (!selectedContributor || !featureFlags.certificateManagement) return
    if (!confirm(`Se revocarán los certificados activos o pendientes de ${selectedContributor.cuit} en ${selectedContributor.environment}. Esta acción puede impedir nuevas operaciones fiscales. ¿Continuar?`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api(`/api/nodo/contributors/${encodeURIComponent(selectedContributor.cuit)}/certificate?environment=${selectedContributor.environment}`), { method: 'DELETE' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'No se pudieron revocar los certificados.')
      setNotice(payload.message || 'Certificados revocados para este CUIT y ambiente.')
      await loadCertificate(selectedContributor)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron revocar los certificados.')
    } finally { setBusy(false) }
  }

  async function activateCertificate(certificate: CertificateInfo) {
    if (!selectedContributor || !featureFlags.certificateManagement) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api(`/api/nodo/contributors/${encodeURIComponent(selectedContributor.cuit)}/certificate/${encodeURIComponent(certificate.id)}/activate`), {
        method: 'POST',
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'No se pudo activar el certificado.')
      setNotice(payload.message || 'Certificado activado. La autenticación se comprobará en el próximo trabajo.')
      await loadCertificate(selectedContributor)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo activar el certificado.')
    } finally { setBusy(false) }
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
      const response = await fetch(api(`/api/nodo/contributors/${encodeURIComponent(selectedContributor.cuit)}/certificate`), { method: 'POST', body: form })
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
  const estimatedNet = Number(emission.netBase || 0)
  const estimatedVat = emission.type === 'C' ? 0 : roundMoney(estimatedNet * Number(emission.vatRate || 0) / 100)
  const estimatedTotal = roundMoney(estimatedNet + estimatedVat)

  const dateToArca = (value: string) => value ? value.replace(/-/g, '') : ''

  function openCustomerAgenda() {
    try {
      window.sessionStorage.setItem(emissionDraftStorageKey, JSON.stringify(emission))
      router.push('/perfil/nodo/clientes-productos?vista=clientes&returnTo=emit')
    } catch {
      setError('No pudimos conservar esta factura. Probá de nuevo antes de agregar el cliente.')
    }
  }

  async function prepareEmission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(''); setNotice(''); setEmissionPreview(null)
    const net = Number(emission.netBase)
    const quantity = 1
    const rate = emission.type === 'C' ? 0 : Number(emission.vatRate)
    const vat = emission.type === 'C' ? 0 : roundMoney(net * rate / 100)
    const total = roundMoney(net + vat)
    const selected = contributors.find(item => item.cuit === emission.cuit && item.environment === emission.environment)
    if (!selected) {
      setError('Elegí una CUIT vinculada al ambiente seleccionado.')
      return
    }
    if (selected.authorizationStatus !== 'ACTIVE' || selected.permissions?.canEmit !== true) {
      setError(`La CUIT no tiene permiso activo para emitir en ${emission.environment}. Estado actual: ${selected.authorizationStatus}. Completá la autorización antes de continuar.`)
      return
    }
    if (!Number.isInteger(Number(emission.pointOfSale)) || Number(emission.pointOfSale) < 1) {
      setError('Ingresá un punto de venta válido para esta CUIT y este ambiente.')
      return
    }
    if (!Number.isFinite(net) || net <= 0 || !Number.isFinite(total)) {
      setError('Ingresá un importe neto positivo.')
      return
    }
    if (Number(emission.vatCondition) === 5 && total >= 10_000_000 && (!['86', '87', '96'].includes(emission.docType) || !emission.docNumber || emission.docNumber === '0')) {
      setError('Para una operación desde $10.000.000, ingresá el DNI, CUIL o CDI del consumidor final.')
      return
    }
    if (emission.type !== 'C' && ![0, 2.5, 5, 10.5, 21, 27].includes(rate)) {
      setError('Elegí una alícuota de IVA admitida por el contrato fiscal.')
      return
    }
    if (emission.type !== 'C' && emission.vatRate === '') {
      setError('El ítem seleccionado no tiene una alícuota de IVA definida. Confirmala antes de emitir.')
      return
    }
    if (['B', 'C'].includes(emission.type) && Number(emission.vatCondition) === 5) {
      const indirectTaxes = Number(emission.otherNationalIndirectTaxes)
      if (!Number.isFinite(indirectTaxes) || indirectTaxes < 0 || Math.round(indirectTaxes * 100) !== indirectTaxes * 100) {
        setError('Ingresá un importe válido de otros impuestos nacionales indirectos, incluidos en el precio.')
        return
      }
    }
    if ((emission.type === 'A' || emission.type === 'M') && (emission.docType !== '80' || !/^\d{11}$/.test(emission.docNumber))) {
      setError('Factura A y M requieren CUIT válida del receptor.')
      return
    }
    if ((emission.type === 'A' || emission.type === 'M') && !emission.customerAddress.trim()) {
      setError('Factura A y M requieren el domicilio comercial del receptor para generar la representación en PDF.')
      return
    }
    if (emission.concept !== '1' && (!emission.serviceFrom || !emission.serviceTo || !emission.paymentDueDate)) {
      setError('Para servicios o concepto mixto, completá período de servicio y vencimiento de pago.')
      return
    }
    if (!emission.date || !emission.description.trim()) {
      setError('Completá la fecha y la descripción del comprobante.')
      return
    }
    const item = {
      description: emission.description.trim(),
      quantity,
      unitPrice: total,
      discountAmount: 0,
      netAmount: net,
      vatRate: emission.type === 'C' ? null : rate,
      vatAmount: vat,
      exemptAmount: 0,
      nonTaxableAmount: 0,
      totalAmount: total,
    }
    const body: FiscalEmissionRequest = {
      externalId: `zap-ui-${crypto.randomUUID()}`,
      idempotencyKey: crypto.randomUUID(),
      contributor: { cuit: emission.cuit, pointOfSale: Number(emission.pointOfSale), environment: emission.environment },
      voucher: {
        type: emission.type,
        concept: Number(emission.concept),
        date: dateToArca(emission.date),
        saleCondition: emission.saleCondition,
        ...(emission.concept !== '1' ? {
          serviceFrom: dateToArca(emission.serviceFrom),
          serviceTo: dateToArca(emission.serviceTo),
          paymentDueDate: dateToArca(emission.paymentDueDate),
        } : {}),
      },
      amounts: {
        total, net, vat, exempt: 0, nonTaxable: 0,
        ...(['B', 'C'].includes(emission.type) && Number(emission.vatCondition) === 5 ? { otherNationalIndirectTaxes: Number(emission.otherNationalIndirectTaxes) } : {}),
        ...(emission.type !== 'C' ? { vatBreakdown: net > 0 ? [{ rate, base: net, amount: vat }] : [] } : {}),
      },
      items: [item],
      customer: {
        docType: Number(emission.docType),
        docNumber: emission.docType === '99' ? '0' : emission.docNumber,
        ...(emission.customerName.trim() ? { name: emission.customerName.trim() } : {}),
        ...(emission.customerAddress.trim() ? { address: emission.customerAddress.trim() } : {}),
        vatCondition: Number(emission.vatCondition || '5'),
      },
    }
    setPreparedEmission(body)
    setPreparedMode('validated')
    setEmissionPreview({ cbteTipo: ({ A: 1, B: 6, C: 11, M: 51 } as const)[emission.type], impTotal: total })
    setNotice('Vista previa lista. Todavía no se envió ninguna solicitud ni se emitió un comprobante.')
  }

  async function submitPreparedEmission() {
    if (!preparedEmission) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api('/api/nodo/invoices/emit?sync=true'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preparedEmission),
      })
      const payload = await response.json().catch(() => ({}))
      const voucher = payload.voucher as {
        id?: string; voucherType?: number; voucherNumber?: number; cae?: string;
        caeFchVto?: string; issuedAt?: string; documentSnapshot?: FiscalPdfInvoice['documentSnapshot']
      } | undefined
      if (payload.jobId && payload.status === 'DONE' && voucher?.cae && voucher.voucherNumber) {
        const issuedInvoice: Invoice = {
          id: voucher.id || String(payload.jobId),
          environment: preparedEmission.contributor.environment,
          cuit: preparedEmission.contributor.cuit,
          pointOfSale: preparedEmission.contributor.pointOfSale,
          voucherType: voucher.voucherType || ({ A: 1, B: 6, C: 11, M: 51 } as const)[preparedEmission.voucher.type],
          voucherNumber: voucher.voucherNumber,
          result: 'DONE',
          cae: voucher.cae,
          caeExpiresAt: voucher.caeFchVto || null,
          amount: String(preparedEmission.amounts.total),
          currency: 'ARS',
          jobId: String(payload.jobId),
          workerVoucherId: voucher.id || null,
          invoicePdfUrl: null,
          createdAt: voucher.issuedAt || new Date().toISOString(),
          payload: {
            voucher: preparedEmission.voucher,
            amounts: preparedEmission.amounts,
            items: preparedEmission.items,
            customer: preparedEmission.customer,
          },
          documentSnapshot: voucher.documentSnapshot || null,
          pdfTemplateSnapshot: pdfTemplate,
        }
        setInvoices(current => [issuedInvoice, ...current.filter(invoice => invoice.jobId !== issuedInvoice.jobId)])
        setActiveJobId(String(payload.jobId))
        setPreparedEmission(null); setPreparedMode(null); setEmissionPreview(null)
        if (featureFlags.pdfExport === true && pdfTemplate) {
          try {
            await downloadFiscalInvoicePdf(issuedInvoice as FiscalPdfInvoice, pdfTemplate)
            setNotice(`ARCA autorizó el comprobante ${issuedInvoice.pointOfSale.toString().padStart(5, '0')}-${issuedInvoice.voucherNumber.toString().padStart(8, '0')}. CAE ${issuedInvoice.cae}; PDF generado en este dispositivo.`)
          } catch (pdfError) {
            setNotice(`ARCA autorizó el comprobante ${issuedInvoice.pointOfSale.toString().padStart(5, '0')}-${issuedInvoice.voucherNumber.toString().padStart(8, '0')} (CAE ${issuedInvoice.cae}), pero no se pudo generar el PDF: ${pdfError instanceof Error ? pdfError.message : 'revisá los datos del emisor.'}`)
          }
        } else {
          setNotice(`ARCA autorizó el comprobante ${issuedInvoice.pointOfSale.toString().padStart(5, '0')}-${issuedInvoice.voucherNumber.toString().padStart(8, '0')}. CAE ${issuedInvoice.cae}.`)
        }
        return
      }
      if (payload.jobId && ['PENDING', 'PROCESSING'].includes(String(payload.status))) {
        setActiveJobId(String(payload.jobId))
        setPreparedMode('uncertain')
        setNotice('La emisión sigue procesándose en el Worker. Conservamos la misma clave idempotente; consultá este trabajo antes de volver a intentar.')
        return
      }
      if (!response.ok) {
        setPreparedMode('validated')
        throw new Error(payload.error?.message || payload.error || payload.lastError || (payload.jobId ? `El trabajo ${payload.jobId} terminó en ${payload.status || 'error'}. No generes una clave nueva ni repitas la emisión sin revisar el estado.` : 'El Worker rechazó la emisión. No se creó un trabajo según la respuesta recibida.'))
      }
      throw new Error('El Worker respondió sin un estado final ni una referencia de trabajo. Conservamos la solicitud original para consultar o reintentar con la misma clave idempotente.')
    } catch (reason) {
      if (reason instanceof TypeError) {
        setPreparedMode('uncertain')
        setError('No se pudo confirmar la respuesta de red. Conservamos exactamente la misma solicitud y su clave idempotente: consultá o reintentá esa misma solicitud; no generes otra.')
      } else if (reason instanceof Error) {
        setError(reason.message)
      } else {
        setError('No se pudo completar la solicitud.')
      }
    } finally { setBusy(false) }
  }

  async function refreshActiveJob() {
    if (!activeJobId) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api(`/api/nodo/jobs/${encodeURIComponent(activeJobId)}`), { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'No se pudo consultar el trabajo.')
      setNotice(`Trabajo ${payload.jobId}: ${payload.status}.${payload.voucher?.cae ? ` CAE ${payload.voucher.cae}.` : ''}`)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo consultar el trabajo.')
    } finally { setBusy(false) }
  }

  async function refreshInvoiceStatus(invoice: Invoice) {
    if (!invoice.jobId) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api(`/api/nodo/jobs/${encodeURIComponent(invoice.jobId)}`), { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'No se pudo actualizar desde el Worker.')
      setNotice(`Estado actualizado desde el Worker: ${payload.status}.`)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo actualizar desde el Worker.')
    } finally { setBusy(false) }
  }

  async function voidInvoice(invoice: Invoice) {
    if (!invoice.workerVoucherId || !invoice.cae || !featureFlags.invoiceVoid) return
    const permission = contributors.find(item => item.cuit === invoice.cuit && item.environment === invoice.environment)
    if (permission?.permissions?.canVoid !== true || permission.authorizationStatus !== 'ACTIVE') {
      setError('El Worker no informa permiso activo para anular comprobantes de esta CUIT y ambiente.')
      return
    }
    if (![1, 6, 11].includes(invoice.voucherType)) {
      setError('El Worker solo admite Nota de Crédito para comprobantes A, B y C en este flujo.')
      return
    }
    if (!confirm(`Se solicitará una Nota de Crédito para anular ${voucherName[invoice.voucherType] || 'el comprobante'} ${invoice.voucherNumber ?? ''}. No se borra el comprobante original. ¿Continuar?`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      const stableKey = `zap-void-${invoice.workerVoucherId}`
      const response = await fetch(api(`/api/nodo/invoices/void?environment=${encodeURIComponent(invoice.environment)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalId: stableKey,
          idempotencyKey: stableKey,
          originalVoucherId: invoice.workerVoucherId,
          voidReason: 'Solicitud de anulación desde el panel ZAP',
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'No se pudo iniciar la Nota de Crédito.')
      if (payload.jobId) setActiveJobId(payload.jobId)
      setNotice(payload.message || `Solicitud registrada. Trabajo fiscal: ${payload.jobId || 'pendiente'}.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo iniciar la Nota de Crédito.')
    } finally { setBusy(false) }
  }

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
  if (!account) return <div className="mx-auto max-w-4xl p-8"><div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8"><h1 className="text-xl font-bold tabular-nums text-gray-900">Cuenta fiscal todavía no vinculada</h1><p className="mt-2 text-sm leading-6 text-gray-600">{adminMode ? 'Esta cuenta no tiene un vínculo fiscal activo. Volvé a Clientes fiscales y asigná una cuenta del Worker.' : 'Estamos preparando tu espacio fiscal. Contactá a ZAP para vincular tu cuenta y ayudarte con la configuración inicial.'}</p></div></div>

  const selectedEnvironmentCertificates = selectedContributor && certificateInfo
    ? [...(certificateInfo.active ?? []), ...certificateInfo.others].filter(cert => cert.environment === selectedContributor.environment)
    : []
  const activeEnvironmentCertificate = selectedEnvironmentCertificates.find(cert => cert.status === 'ACTIVE')
  const pendingEnvironmentCertificate = selectedEnvironmentCertificates.find(cert => cert.status === 'PENDING_PROPAGATION')
  const selectedPadronIsActive = selectedContributor?.authorizationStatus === 'ACTIVE' && selectedContributor.permissions?.canQueryPadron === true
  const linkedCuitCount = new Set(contributors.map(item => item.cuit)).size
  const visibleInvoices = invoices.filter(invoice =>
    (invoiceEnvironmentFilter === 'ALL' || invoice.environment === invoiceEnvironmentFilter)
    && (invoiceStatusFilter === 'all' || getInvoiceStatus(invoice) === invoiceStatusFilter),
  )
  const workerEmissionCandidates = contributors.filter(item => item.authorizationVerified === true && item.authorizationStatus === 'ACTIVE' && item.permissions?.canEmit === true)
  const emissionReadyContributors = workerEmissionCandidates.filter(item => featureFlags[item.environment === 'PROD' ? 'invoiceEmissionProd' : 'invoiceEmissionTest'] === true)
  const emissionFeatureDisabled = workerEmissionCandidates.some(item => featureFlags[item.environment === 'PROD' ? 'invoiceEmissionProd' : 'invoiceEmissionTest'] === false)
  const emissionFeatureUnknown = workerEmissionCandidates.some(item => featureFlags[item.environment === 'PROD' ? 'invoiceEmissionProd' : 'invoiceEmissionTest'] === undefined)
  const authorizationUnverified = contributors.some(item => item.authorizationVerified !== true)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 text-[#0F172A] tabular-nums sm:p-6 lg:p-8">
      {section !== 'summary' && section !== 'tools' && <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-800">{adminMode ? 'ZAP · Soporte fiscal' : 'NODO ZAP'}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{adminMode ? account.customer?.name || account.tenantName : section === 'emit' ? 'Nueva factura' : section === 'batch' ? 'Facturación por lote' : section === 'invoices' ? 'Comprobantes' : section === 'settings' ? 'Configuración fiscal' : 'Facturación'}</h1>
          <p className="mt-2 text-sm text-gray-500">{adminMode ? account.customer?.email : section === 'emit' ? 'Completá los datos, revisá el importe y confirmá la emisión.' : section === 'batch' ? 'Importá una planilla, revisá las filas y confirmá el envío.' : section === 'invoices' ? 'Consultá el estado y descargá la representación de tus comprobantes.' : section === 'settings' ? 'CUIT, autorización, datos del emisor y diseño.' : ''}</p>
        </div>
        <button onClick={() => void load()} disabled={loading || busy} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={16} /> Actualizar</button>
      </header>}

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{notice}</div>}

      {adminMode && accountId && <div><a href={`/admin/fiscal/clientes/${encodeURIComponent(accountId)}/diseno`} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Configurar diseño del comprobante</a></div>}

      {adminMode && accountId && <section className={`rounded-2xl bg-white p-5 ${surfaceShadow}`}>
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
          <button disabled={busy} className="rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar'}</button>
        </form>
      </section>}

      {section === 'summary' && <>
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#C2103F]">NODO ZAP</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">Tu operación fiscal.</h1><p className="mt-2 text-sm text-gray-600">Todo lo que necesitás para gestionar tu facturación.</p></div>
          <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={16} /> Actualizar</button>
        </header>

        <section aria-labelledby="fiscal-account-state" className={`rounded-2xl bg-white p-5 ${surfaceShadow}`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="fiscal-account-state" className="font-semibold text-gray-950">Estado de tu cuenta</h2><p className="mt-1 text-sm text-gray-600">{account.status === 'ACTIVE' ? 'Cuenta activa' : `Cuenta ${account.status.toLocaleLowerCase('es-AR')}`}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${account.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{account.status === 'ACTIVE' ? 'Activa' : account.status}</span></div>
          <p className="mt-3 text-sm text-gray-600">{linkedCuitCount} {linkedCuitCount === 1 ? 'CUIT vinculada' : 'CUIT vinculadas'}{contributors.length > 0 ? ` · ${Array.from(new Set(contributors.map(item => item.environment))).map(item => item === 'TEST' ? 'Homologación' : 'Producción').join(' y ')}` : ''}</p>
          <div className="mt-5 border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-950">¿Podés emitir comprobantes?</h3>
            {!workspaceLoaded ? <p className="mt-2 text-sm text-amber-800">No pudimos cargar el estado fiscal. Actualizá la página para volver a consultar.</p>
              : !contributors.length ? <div className="mt-2"><p className="text-sm text-amber-800">Todavía no hay una CUIT vinculada.</p><Link href="/perfil/nodo/configuracion" className="mt-2 inline-flex text-sm font-semibold text-[#C2103F] hover:underline">Configurar facturación <span aria-hidden="true" className="ml-1">→</span></Link></div>
              : account.status !== 'ACTIVE' ? <p className="mt-2 text-sm text-amber-800">La cuenta no está activa. Contactá a ZAP para revisar el acceso.</p>
                : emissionReadyContributors.length > 0 ? <div className="mt-2"><p className="text-sm font-semibold text-emerald-800">El Worker confirma permisos para iniciar emisión en {emissionReadyContributors.map(item => item.environment === 'TEST' ? 'homologación' : 'producción').filter((item, index, all) => all.indexOf(item) === index).join(' y ')}.</p><p className="mt-1 text-sm text-gray-600">ARCA confirma la autorización de cada comprobante al emitir.</p><Link href="/perfil/nodo/emitir" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Emitir comprobante <span aria-hidden="true">→</span></Link></div>
                  : workerEmissionCandidates.length > 0 && emissionFeatureDisabled ? <p className="mt-2 text-sm text-amber-800">El permiso fiscal figura activo, pero la emisión está deshabilitada por ZAP para ese ambiente.</p>
                    : workerEmissionCandidates.length > 0 && emissionFeatureUnknown ? <p className="mt-2 text-sm text-amber-800">No pudimos confirmar si ZAP habilitó la emisión para ese ambiente. Actualizá el estado antes de continuar.</p>
                      : authorizationUnverified ? <p className="mt-2 text-sm text-amber-800">No pudimos confirmar ahora los permisos con el Worker. Actualizá el estado o revisá la configuración fiscal.</p>
                        : contributors.some(item => item.authorizationStatus === 'PENDING') ? <div className="mt-2"><p className="text-sm text-amber-800">La autorización de la CUIT todavía está pendiente.</p><Link href="/perfil/nodo/configuracion" className="mt-2 inline-flex text-sm font-semibold text-[#C2103F] hover:underline">Revisar certificado y permisos <span aria-hidden="true" className="ml-1">→</span></Link></div>
                          : contributors.some(item => item.authorizationStatus === 'ACTIVE' && item.permissions?.canQueryPadron === true) ? <div className="mt-2"><p className="text-sm text-amber-800">La consulta está habilitada, pero el permiso de emisión no.</p><Link href="/perfil/nodo/configuracion" className="mt-2 inline-flex text-sm font-semibold text-[#C2103F] hover:underline">Revisar autorización fiscal <span aria-hidden="true" className="ml-1">→</span></Link></div>
                            : <p className="mt-2 text-sm text-amber-800">El Worker no informa permisos de emisión activos. Revisá la configuración fiscal.</p>}
          </div>
        </section>

        <section aria-labelledby="fiscal-activity-heading" className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className={`rounded-2xl bg-white p-5 ${surfaceShadow}`}><h2 id="fiscal-activity-heading" className="text-sm text-gray-600">Comprobantes registrados</h2><p className="mt-2 text-3xl font-semibold tabular-nums text-gray-950">{invoiceCount === null ? '—' : invoiceCount}</p><p className="mt-1 text-sm text-gray-500">En la cuenta fiscal</p></div>
          <div className={`rounded-2xl bg-white p-5 ${surfaceShadow}`}><h2 className="text-sm text-gray-600">CUIT vinculadas</h2><p className="mt-2 text-3xl font-semibold tabular-nums text-gray-950">{workspaceLoaded ? linkedCuitCount : '—'}</p><p className="mt-1 text-sm text-gray-500">Representaciones registradas</p></div>
        </section>

        <section aria-labelledby="fiscal-usage-heading" className={`mt-4 rounded-2xl bg-white p-5 ${surfaceShadow}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="fiscal-usage-heading" className="font-semibold text-gray-950">Plan y consumo</h2><p className="mt-1 text-sm text-gray-600">{usage ? `${usage.plan} · período ${date(usage.periodStart)}` : 'No pudimos consultar el plan y el consumo.'}</p></div><button type="button" onClick={() => void load()} disabled={loading || busy} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Actualizar consumo</button></div>
          {usage ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><UsageMetric title="Comprobantes del período" included={usage.invoices.included} consumed={usage.invoices.consumed} reserved={usage.invoices.reserved} remaining={usage.invoices.remaining} overage={usage.invoices.overage} /><UsageMetric title="Consultas de padrón" included={usage.padron.included} consumed={usage.padron.consumed} reserved={usage.padron.reserved} remaining={usage.padron.remaining} overage={usage.padron.overage} /></div> : <p role="status" className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">Los valores se mostrarán cuando el Worker responda.</p>}
          <p className="mt-3 text-xs leading-5 text-gray-500">El consumo se comparte entre las CUIT de esta cuenta. Los límites se consultan al Worker; esta pantalla no estima cargos adicionales. Revisá las condiciones vigentes de tu plan.</p>
        </section>

        <section aria-labelledby="fiscal-shortcuts-heading" className="mt-8">
          <h2 id="fiscal-shortcuts-heading" className="mb-4 text-xl font-semibold tracking-tight text-gray-950">Accesos directos</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { title: 'Emitir comprobante', description: 'Crear una factura individual.', href: '/perfil/nodo/emitir' },
              { title: 'Facturación por lote', description: 'Importar una planilla y revisar sus comprobantes.', href: '/perfil/nodo/emitir/lote' },
              { title: 'Consultar comprobantes', description: 'Revisar la actividad registrada y sus documentos.', href: '/perfil/nodo/comprobantes' },
              { title: 'Configurar facturación', description: 'Gestionar CUIT, autorización, datos y diseño.', href: '/perfil/nodo/configuracion' },
            ].map(item => <Link key={item.title} href={item.href} className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-[#D6A2B1] hover:bg-[#FFFCFD]"><span className="font-semibold text-gray-950">{item.title}</span><span className="mt-2 block text-sm leading-5 text-gray-600">{item.description}</span><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#C2103F]">Abrir <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span></span></Link>)}
          </div>
        </section>
      </>}

      {section === 'all' && <section className="grid gap-4 sm:grid-cols-3">
        <div className={`rounded-2xl bg-white p-5 ${surfaceShadow}`}><p className="text-sm text-gray-500">CUIT vinculadas</p><p className="mt-2 text-3xl font-bold text-gray-900">{contributors.length}</p></div>
        <div className={`rounded-2xl bg-white p-5 ${surfaceShadow}`}><p className="text-sm text-gray-500">Comprobantes registrados</p><p className="mt-2 text-3xl font-bold text-gray-900">{invoices.length}</p></div>
        <div className={`rounded-2xl bg-white p-5 ${surfaceShadow}`}><p className="text-sm text-gray-500">Estado de la cuenta</p><p className="mt-2 text-lg font-bold text-emerald-700">{account.status === 'ACTIVE' ? 'Activa' : account.status}</p></div>
      </section>}

      {section === 'all' && <section aria-labelledby="fiscal-usage-heading" className={`rounded-2xl bg-white p-5 ${surfaceShadow}`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="fiscal-usage-heading" className="font-semibold text-gray-900">Plan y consumo</h2><p className="mt-1 text-sm text-gray-500">Cuotas mensuales compartidas por la cuenta fiscal - {usage ? `${usage.plan} | periodo ${date(usage.periodStart)}` : 'No se pudo consultar el Worker'}</p></div><button type="button" onClick={() => void load()} disabled={loading || busy} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Actualizar consumo</button></div>
        {usage && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UsageMetric title="Comprobantes incluidos" included={usage.invoices.included} consumed={usage.invoices.consumed} reserved={usage.invoices.reserved} remaining={usage.invoices.remaining} overage={usage.invoices.overage} />
          <UsageMetric title="Consultas de padron" included={usage.padron.included} consumed={usage.padron.consumed} reserved={usage.padron.reserved} remaining={usage.padron.remaining} overage={usage.padron.overage} />
          <div className="rounded-xl bg-[#F4F4F1] p-4"><p className="text-sm text-gray-500">CUIT vinculadas</p><p className="mt-2 text-xl font-bold tabular-nums text-gray-900">{usage.linkedCuits} / {usage.maxCuits === null ? 'Sin limite' : usage.maxCuits}</p></div>
          <UsageMetric title="Requests de otros servicios" included={usage.requests.included} consumed={usage.requests.consumed} reserved={0} remaining={usage.requests.remaining} overage={usage.requests.overage} />
        </div>}
        <p className="mt-3 text-xs text-gray-500">Al superar los comprobantes, consultas de padrón o requests incluidos, el servicio continúa y el excedente se registra por separado. Esta vista no calcula cargos adicionales: las tarifas y la regularización se definirán antes de cobrarlos. El rate limit por minuto es un control operativo independiente.</p>
      </section>}

      {(section === 'all' || section === 'tools') && <FiscalWorkerTools api={api} contributors={contributors} invoices={invoices} flags={featureFlags} onSelectPointOfSale={pointOfSale => setEmission(current => ({ ...current, pointOfSale }))} />}

      {section === 'settings' && <nav aria-label="Secciones de configuración fiscal" className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        <button type="button" aria-current={settingsTab === 'access' ? 'page' : undefined} onClick={() => { setSettingsTab('access'); setSelectedContributor(null) }} className={`rounded-xl px-4 py-3 text-sm font-semibold ${settingsTab === 'access' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Certificado y permisos</button>
        <button type="button" aria-current={settingsTab === 'invoice' ? 'page' : undefined} onClick={() => { setSettingsTab('invoice'); setSelectedContributor(null) }} className={`rounded-xl px-4 py-3 text-sm font-semibold ${settingsTab === 'invoice' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Datos y diseño del PDF</button>
      </nav>}

      {(section === 'all' || (section === 'settings' && settingsTab === 'access')) && <section className={`rounded-2xl bg-white p-5 ${surfaceShadow}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Certificado y permisos de la CUIT</h2>
            <p className="mt-1 text-sm text-gray-500">Cada ambiente se gestiona por separado.</p>
          </div>
          <button type="button" onClick={() => { setCuit(''); setRepresentativeCuit(''); setRazonSocial(''); setPadronLookup({ cuit: '', key: '', status: 'idle', message: '' }); setError(''); setShowAddContributor(true) }} disabled={featureFlags.contributorManagement !== true} className="inline-flex items-center gap-2 rounded-full bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"><Plus size={16} /> Vincular CUIT</button>
        </div>
        {contributors.length === 0 ? <p className="mt-4 rounded-xl bg-[#F4F4F1] p-4 text-sm text-gray-500">Todavía no hay CUIT vinculadas a esta cuenta.</p> : <div className="mt-4 space-y-3">
            {contributors.map(item => <article key={item.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-semibold text-gray-900">{item.razonSocial || 'Contribuyente'}</p><p className="mt-1 font-mono text-sm text-gray-600">{item.cuit}</p><p className="mt-1 text-xs text-gray-500">Representante {item.representativeCuit} · {item.environment === 'TEST' ? 'Homologación' : 'Producción'}</p></div>
                <span className={item.authorizationStatus === 'ACTIVE' ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700'}>{item.authorizationStatus === 'ACTIVE' ? item.permissions?.canEmit === true ? 'Activa · emisión' : item.permissions?.canQueryPadron === true ? 'Activa · solo padrón' : 'Activa · consulta limitada' : item.authorizationStatus === 'PENDING' ? 'Sin validar · certificado propio' : item.authorizationStatus}</span>
              </div>
              {item.authorizationStatus === 'PENDING' && <p className="mt-2 text-xs leading-5 text-gray-600">Este estado corresponde al acceso con certificado de esta CUIT. La consulta de datos fiscales con la cuenta de ZAP funciona por separado y no lo activa.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void loadCertificate(item)} disabled={featureFlags.certificateManagement !== true} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-slate-400 hover:text-slate-900 disabled:opacity-40"><UploadCloud size={14} /> Revisar o configurar certificado</button>
                {featureFlags.certificateManagement !== true && <p role="status" className="self-center text-xs text-amber-800">La carga está desactivada para esta cuenta.</p>}
                <button onClick={() => void removeContributor(item)} disabled={busy || featureFlags.contributorManagement !== true} className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40">Quitar CUIT</button>
              </div>
              <details className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-gray-700">Ayuda oficial para {item.environment === 'TEST' ? 'homologación' : 'producción'} de esta CUIT</summary>
                {item.environment === 'PROD' ? <div className="mt-3 space-y-2 text-xs leading-5 text-gray-600">
                  <p>En ARCA: generá una clave privada y CSR; en “Administrador de Certificados Digitales” cargá el CSR y descargá el CRT. Después, en “Administrador de Relaciones”, autorizá el alias para el Web Service que vas a usar (por ejemplo, Factura Electrónica). Finalmente, cargá aquí el CRT y la clave privada con “Cargar certificado”. El certificado y la autorización deben corresponder a esta CUIT y al ambiente productivo.</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1"><a className="font-semibold text-[#c2103f] hover:underline" href="https://www.arca.gob.ar/landing/default.asp" target="_blank" rel="noreferrer">Portal ARCA ↗</a><a className="font-semibold text-[#c2103f] hover:underline" href="https://www.arca.gob.ar/ws/documentacion/certificados.asp" target="_blank" rel="noreferrer">Certificados oficiales ↗</a><a className="font-semibold text-[#c2103f] hover:underline" href="https://www.arca.gob.ar/ws/WSAA/WSAA.ObtenerCertificado.pdf" target="_blank" rel="noreferrer">Instructivo CSR/certificado ↗</a><a className="font-semibold text-[#c2103f] hover:underline" href="https://www.arca.gob.ar/ws/WSAA/ADMINREL.DelegarWS.pdf" target="_blank" rel="noreferrer">Instructivo de autorización ↗</a></div>
                  <p>Emitir el certificado no autoriza por sí solo `wsfe`. La clave privada debe conservarse protegida; no la compartas por chat ni la subas al repositorio.</p>
                </div> : <div className="mt-3 space-y-2 text-xs leading-5 text-gray-600">
                  <p>Para homologación, usá WSASS y un certificado TEST. En WSASS gestioná el certificado y autorizá el Web Service que corresponda para esta CUIT. Esos certificados no sirven en producción.</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1"><a className="font-semibold text-[#c2103f] hover:underline" href="https://www.arca.gob.ar/ws/WSASS/html/introduccion.html" target="_blank" rel="noreferrer">Guía oficial de WSASS ↗</a><a className="font-semibold text-[#c2103f] hover:underline" href="https://www.arca.gob.ar/ws/WSASS/WSASS_manual.pdf" target="_blank" rel="noreferrer">Manual WSASS (PDF) ↗</a><a className="font-semibold text-[#c2103f] hover:underline" href="https://www.arca.gob.ar/ws/documentacion/wsaa.asp" target="_blank" rel="noreferrer">Documentación WSAA ↗</a></div>
                </div>}
              </details>
            </article>)}
          </div>}
      </section>}

      {(section === 'all' || (section === 'settings' && settingsTab === 'invoice')) && <FiscalInvoiceTemplateEditor api={api} contributors={contributors} />}

      {showAddContributor && (section === 'all' || section === 'settings') && <div role="dialog" aria-modal="true" aria-labelledby="add-contributor-title" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
        <section className="my-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 id="add-contributor-title" className="text-lg font-semibold text-gray-900">Vincular una CUIT</h2><p className="mt-1 text-sm text-gray-500">Podés vincular una CUIT aunque ya esté en otra cuenta NODO. Cada cuenta tiene sus propios permisos y certificados.</p></div>
            <button type="button" onClick={() => setShowAddContributor(false)} aria-label="Cerrar" className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">Cerrar</button>
          </div>
          <form onSubmit={event => void addContributor(event)} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-gray-700">CUIT emisor
              <input required autoFocus inputMode="numeric" pattern="\d{11}" maxLength={11} value={cuit} onChange={event => { const value = event.target.value.replace(/\D/g, '').slice(0,11); setCuit(value); setRazonSocial(''); setPadronLookup({ cuit: '', key: '', status: 'idle', message: '' }) }} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal" placeholder="11 dígitos" />
            </label>
            <div>
              <button type="button" onClick={() => void lookupContributorPadron()} disabled={busy || cuit.length !== 11 || padronLookup.status === 'loading'} className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">{padronLookup.status === 'loading' ? <LoaderCircle size={14} className="animate-spin" /> : <Search size={14} />}Consultar datos con ZAP</button>
              {padronLookup.cuit === cuit && padronLookup.message && <p role="status" className={`mt-2 text-xs ${padronLookup.status === 'success' ? 'text-emerald-700' : 'text-amber-800'}`}>{padronLookup.message}</p>}
            </div>
            <label className="block text-sm font-medium text-gray-700">CUIT representante
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
            <details className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5">
              <summary className="cursor-pointer text-xs font-semibold text-sky-950">Guía y enlaces oficiales para {environment === 'TEST' ? 'homologación' : 'producción'}</summary>
              {environment === 'PROD' ? <div className="mt-2 space-y-2 text-xs leading-5 text-sky-950">
                <p>El certificado productivo se solicita con CSR en “Administrador de Certificados Digitales”. Después hay que autorizar el alias para cada Web Service desde “Administrador de Relaciones”. La CUIT del certificado debe ser la titular o representante habilitada para este contribuyente.</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1"><a className="font-semibold underline" href="https://www.arca.gob.ar/landing/default.asp" target="_blank" rel="noreferrer">Portal ARCA ↗</a><a className="font-semibold underline" href="https://www.arca.gob.ar/ws/documentacion/certificados.asp" target="_blank" rel="noreferrer">Certificados ↗</a><a className="font-semibold underline" href="https://www.arca.gob.ar/ws/WSAA/WSAA.ObtenerCertificado.pdf" target="_blank" rel="noreferrer">Instructivo de certificado ↗</a><a className="font-semibold underline" href="https://www.arca.gob.ar/ws/WSAA/ADMINREL.DelegarWS.pdf" target="_blank" rel="noreferrer">Instructivo de relaciones ↗</a></div>
                <p>El certificado solo no habilita `wsfe`. La clave privada se conserva protegida y se carga en el siguiente paso.</p>
              </div> : <div className="mt-2 space-y-2 text-xs leading-5 text-sky-950">
                <p>Para TEST, obtené el certificado y autorizá el servicio desde WSASS. Los certificados de homologación no se usan en producción.</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1"><a className="font-semibold underline" href="https://www.arca.gob.ar/ws/WSASS/html/introduccion.html" target="_blank" rel="noreferrer">Guía WSASS ↗</a><a className="font-semibold underline" href="https://www.arca.gob.ar/ws/WSASS/WSASS_manual.pdf" target="_blank" rel="noreferrer">Manual WSASS ↗</a><a className="font-semibold underline" href="https://www.arca.gob.ar/ws/documentacion/wsaa.asp" target="_blank" rel="noreferrer">Documentación WSAA ↗</a></div>
              </div>}
            </details>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddContributor(false)} className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">Cancelar</button>
              <button disabled={busy || featureFlags.contributorManagement !== true} className="inline-flex items-center gap-2 rounded-full bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Vincular</button>
            </div>
          </form>
        </section>
      </div>}

      {selectedContributor && (section === 'all' || (section === 'settings' && settingsTab === 'access')) && <section id="certificate-panel" tabIndex={-1} className={`scroll-mt-6 rounded-2xl bg-white p-5 ${surfaceShadow}`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-gray-900">Activar consulta de padrón</h2><p className="mt-1 text-sm text-gray-500">{selectedContributor.razonSocial || 'Contribuyente'} · {selectedContributor.environment === 'TEST' ? 'Homologación' : 'Producción'}</p></div><button onClick={() => { setSelectedContributor(null); setCertificateInfo(null); setCertFile(null); setKeyFile(null) }} className="rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-slate-400 hover:text-slate-900">Cerrar</button></div>
        <p className="mt-3 text-sm text-gray-700">Este flujo habilita únicamente A13 para esta CUIT. No habilita emisión.</p>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          <li className={`rounded-xl border p-3 text-sm ${activeEnvironmentCertificate ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}><span className="font-semibold">1. Certificado</span><p className="mt-1">{certificateLoading ? 'Consultando estado…' : activeEnvironmentCertificate ? 'Activo en NODO' : pendingEnvironmentCertificate ? 'Cargado; falta activarlo en NODO' : 'Falta cargar o activar'}</p></li>
          <li className={`rounded-xl border p-3 text-sm ${selectedPadronIsActive ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}><span className="font-semibold">2. Acceso A13</span><p className="mt-1">{selectedPadronIsActive ? 'Activo · solo consulta' : 'Pendiente de validación con ARCA'}</p></li>
        </ol>
        {certificateLoading && <p role="status" className="mt-4 text-sm text-gray-600">Consultando el certificado…</p>}
        {!certificateLoading && !certificateInfo && <div className="mt-4"><p className="text-sm text-amber-800">No pudimos leer el estado del certificado.</p><button type="button" onClick={() => void loadCertificate(selectedContributor)} className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold">Reintentar</button></div>}
        {!certificateLoading && certificateInfo && activeEnvironmentCertificate && selectedPadronIsActive && <div role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Listo. La consulta A13 está activa para esta CUIT en {selectedContributor.environment}.</div>}
        {!certificateLoading && certificateInfo && activeEnvironmentCertificate && !selectedPadronIsActive && (featureFlags.padronQuery === true
          ? <div className="mt-4 rounded-xl border border-gray-200 p-4"><p className="text-sm text-gray-700">Certificado activo. El siguiente paso es validar A13 con ARCA.</p><button type="button" onClick={() => void checkPadronAccess(selectedContributor)} disabled={busy || selectedContributor.permissions?.canManageCert !== true || selectedContributor.authorizationStatus === 'REVOKED'} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Validar acceso A13</button></div>
          : <p role="status" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">La validación de padrón está desactivada para esta cuenta. Pedile a ZAP que habilite esa función.</p>)}
        {!certificateLoading && certificateInfo && !activeEnvironmentCertificate && pendingEnvironmentCertificate && <div className="mt-4 rounded-xl border border-gray-200 p-4"><p className="text-sm text-gray-700">El certificado ya está cargado. Activálo en NODO para continuar.</p><p className="mt-1 text-xs text-gray-500">Vence {date(pendingEnvironmentCertificate.expiresAt)}.</p><button type="button" onClick={() => void activateCertificate(pendingEnvironmentCertificate)} disabled={busy || featureFlags.certificateManagement !== true} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Activar certificado en NODO</button></div>}
        {!certificateLoading && certificateInfo && !activeEnvironmentCertificate && !pendingEnvironmentCertificate && <div className="mt-4 space-y-3"><p className="text-sm text-gray-700">Cargá el certificado emitido por ARCA y la clave privada que se generó junto con él.</p>
          {featureFlags.certificateManagement === true ? <>
            <form onSubmit={event => void uploadCertificate(event)} className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">Certificado (.crt o .pem)<input required type="file" accept=".crt,.pem,.cer,application/x-pem-file" onChange={event => setCertFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-xl border border-gray-200 p-2 text-sm font-normal" /></label>
              <label className="block text-sm font-medium text-gray-700">Clave privada (.key o .pem)<input required type="file" accept=".key,.pem,application/x-pem-file" onChange={event => setKeyFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-xl border border-gray-200 p-2 text-sm font-normal" /></label>
              <div className="sm:col-span-2"><button disabled={busy || !certFile || !keyFile} className="inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <UploadCloud size={16} />} Guardar certificado</button></div>
            </form>
            <CertificateCsrAssistant key={selectedContributor.id + selectedContributor.environment} contributor={selectedContributor} />
          </> : <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">La gestión de certificados está desactivada para esta cuenta. Pedile a ZAP que la habilite.</p>}
        </div>}
        {certificateInfo && selectedEnvironmentCertificates.some(cert => cert.status !== 'ACTIVE' && cert.status !== 'PENDING_PROPAGATION') && <details className="mt-4 text-xs text-gray-500"><summary className="cursor-pointer">Ver certificados anteriores</summary><ul className="mt-2 space-y-1">{selectedEnvironmentCertificates.filter(cert => cert.status !== 'ACTIVE' && cert.status !== 'PENDING_PROPAGATION').map(cert => <li key={cert.id}>{cert.cn || 'Certificado'} · {cert.status} · vence {date(cert.expiresAt)}</li>)}</ul></details>}
      </section>}

      <section className={`rounded-2xl bg-white p-5 ${surfaceShadow} ${section !== 'all' && section !== 'emit' ? 'hidden' : ''}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">¿A quién y qué vas a facturar?</h2>
          </div>
          {activeJobId && <button type="button" onClick={() => void refreshActiveJob()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"><RefreshCw size={15} /> Consultar último trabajo</button>}
        </div>
        {contributors.length === 0 && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Primero vinculá una CUIT y completá su autorización fiscal. No se puede emitir sin una CUIT asociada al tenant.</p>}
        <form onSubmit={event => {
          if (emissionStep === 1) {
            event.preventDefault()
            setError('')
            setEmissionStep(2)
            return
          }
          void prepareEmission(event)
        }} onChange={() => {
          if (preparedMode !== 'uncertain') {
            setPreparedEmission(null); setPreparedMode(null); setEmissionPreview(null)
          }
        }} className="mt-5 space-y-5">
          <ol aria-label="Pasos para preparar el comprobante" className="flex items-center gap-3 text-xs font-semibold text-gray-500">
            <li aria-current={emissionStep === 1 ? 'step' : undefined} className={emissionStep === 1 ? 'text-slate-900' : 'text-emerald-700'}>1. Emisor</li>
            <li aria-hidden="true" className="h-px flex-1 bg-gray-200" />
            <li aria-current={emissionStep === 2 ? 'step' : undefined} className={emissionStep === 2 ? 'text-slate-900' : ''}>2. Venta y cliente</li>
          </ol>
          <fieldset disabled={preparedMode === 'uncertain' || busy || contributors.length === 0} className="space-y-5">
            {emissionStep === 2 && savedProducts.length > 0 && <label className="block max-w-xl text-sm font-medium text-gray-700">Cargar producto o servicio guardado
              <select defaultValue="" onChange={event => {
                const item = savedProducts.find(saved => saved.id === event.target.value)
                if (item) setEmission(value => ({ ...value, description: item.description, netBase: item.unitPrice, ...(item.vatRatePercent !== null ? { vatRate: item.vatRatePercent } : {}), concept: item.kind === 'SERVICE' ? '2' : '1' }))
              }} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal">
                <option value="">Elegir un ítem…</option>{savedProducts.map(item => <option key={item.id} value={item.id}>{item.kind === 'SERVICE' ? 'Servicio' : 'Producto'} · {item.description} · {item.unit} · ${Number(item.unitPrice).toLocaleString('es-AR')} · IVA {item.vatRatePercent === null ? 'sin definir' : `${item.vatRatePercent}%`}</option>)}
              </select>
            </label>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-medium text-gray-700">Ambiente
                <select value={emission.environment} onChange={event => setEmission(v => ({ ...v, environment: event.target.value as 'TEST' | 'PROD', cuit: '' }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal">
                  <option value="TEST">Homologación (TEST)</option><option value="PROD">Producción (PROD)</option>
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">CUIT emisora
                <select required value={emission.cuit} onChange={event => setEmission(v => ({ ...v, cuit: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm font-normal">
                  <option value="">Seleccionar CUIT…</option>
                  {contributors.filter(item => item.environment === emission.environment).map(item => <option key={item.id} value={item.cuit}>{item.cuit}{item.razonSocial ? ` · ${item.razonSocial}` : ''} · ${item.authorizationStatus}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">Punto de venta
                <input required type="number" min="1" step="1" value={emission.pointOfSale} onChange={event => setEmission(v => ({ ...v, pointOfSale: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 font-normal" />
              </label>
              <label className="text-sm font-medium text-gray-700">Tipo de comprobante
                <select value={emission.type} onChange={event => setEmission(v => {
                  const type = event.target.value as 'A' | 'B' | 'C' | 'M'
                  return { ...v, type, docType: type === 'A' || type === 'M' ? '80' : v.docType, docNumber: type === 'A' || type === 'M' ? '' : v.docNumber, vatRate: type === 'C' ? '0' : (v.vatRate === '0' ? '21' : v.vatRate), vatCondition: type === 'C' ? v.vatCondition : v.vatCondition }
                })} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal">
                  <option value="A">Factura A</option><option value="B">Factura B</option><option value="C">Factura C</option><option value="M">Factura M</option>
                </select>
              </label>
              {emissionStep === 2 && <>
              <label className="text-sm font-medium text-gray-700">Concepto
                <select value={emission.concept} onChange={event => setEmission(v => ({ ...v, concept: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal">
                  <option value="1">Productos</option><option value="2">Servicios</option><option value="3">Productos y servicios</option>
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">Condición de venta
                <select value={emission.saleCondition} onChange={event => setEmission(v => ({ ...v, saleCondition: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal">
                  <option>Contado</option><option>Cuenta corriente</option><option>Tarjeta de crédito</option><option>Transferencia</option><option>Mercado Pago</option>
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">Fecha de emisión
                <input required type="date" value={emission.date} onChange={event => setEmission(v => ({ ...v, date: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 font-normal" />
              </label>
              <label className="text-sm font-medium text-gray-700">Importe neto gravado (ARS)
                <input required type="number" min="0.01" step="0.01" value={emission.netBase} onChange={event => setEmission(v => ({ ...v, netBase: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 font-normal" placeholder="Sin IVA" />
              </label>
              <label className="text-sm font-medium text-gray-700">Alícuota IVA
                <select disabled={emission.type === 'C'} value={emission.type === 'C' ? '0' : emission.vatRate} onChange={event => setEmission(v => ({ ...v, vatRate: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal disabled:bg-gray-100">
                  <option value="0">0%</option><option value="2.5">2,5%</option><option value="5">5%</option><option value="10.5">10,5%</option><option value="21">21%</option><option value="27">27%</option>
                </select>
              </label>
              {['B', 'C'].includes(emission.type) && Number(emission.vatCondition) === 5 && <label className="text-sm font-medium text-gray-700">Otros impuestos nacionales indirectos (incluidos en el precio)
                <input required type="number" min="0" step="0.01" value={emission.otherNationalIndirectTaxes} onChange={event => setEmission(v => ({ ...v, otherNationalIndirectTaxes: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal" />
              </label>}
              </>}
            </div>
            {emissionStep === 2 && <>
            {(emission.concept === '2' || emission.concept === '3') && <div className="grid gap-3 rounded-xl bg-[#F4F4F1] p-4 sm:grid-cols-3">
              <label className="text-sm font-medium text-gray-700">Servicio desde<input required type="date" value={emission.serviceFrom} onChange={event => setEmission(v => ({ ...v, serviceFrom: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal" /></label>
              <label className="text-sm font-medium text-gray-700">Servicio hasta<input required type="date" value={emission.serviceTo} onChange={event => setEmission(v => ({ ...v, serviceTo: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal" /></label>
              <label className="text-sm font-medium text-gray-700">Vencimiento de pago<input required type="date" value={emission.paymentDueDate} onChange={event => setEmission(v => ({ ...v, paymentDueDate: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal" /></label>
            </div>}
            {savedCustomers.length > 0 && <label className="block max-w-xl text-sm font-medium text-gray-700">Cargar cliente guardado
              <select defaultValue="" onChange={event => {
                const item = savedCustomers.find(saved => saved.id === event.target.value)
                if (!item) return
                const docTypes: Record<string, string> = { CUIT: '80', CUIL: '86', DNI: '96', CONSUMIDOR_FINAL: '99' }
                const docType = item.documentType ? docTypes[item.documentType] : undefined
                setEmission(value => ({
                  ...value,
                  ...(docType ? { docType, docNumber: docType === '99' ? '0' : item.documentNumber || '' } : {}),
                  customerName: item.name,
                  customerAddress: item.address || '',
                  vatCondition: docType === '99' ? '5' : item.vatCondition || value.vatCondition,
                }))
              }} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal">
                <option value="">Elegir cliente…</option>{savedCustomers.map(item => <option key={item.id} value={item.id}>{item.name}{item.documentNumber ? ` · ${item.documentNumber}` : ''}</option>)}
              </select>
            </label>}
            <button type="button" onClick={openCustomerAgenda} className="inline-flex items-center gap-2 text-sm font-semibold text-[#C2103F] hover:underline">Agregar cliente y volver a la factura <span aria-hidden="true">→</span></button>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-medium text-gray-700">Tipo de documento receptor
                <select value={emission.docType} onChange={event => setEmission(v => ({ ...v, docType: event.target.value, docNumber: event.target.value === '99' ? '0' : '', vatCondition: event.target.value === '99' ? '5' : v.vatCondition }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal">
                  <option value="99" disabled={emission.type === 'A' || emission.type === 'M'}>Consumidor final</option><option value="80">CUIT</option><option value="96">DNI</option><option value="86">CUIL</option><option value="87">CDI</option>
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">Número de documento
                <input required disabled={emission.docType === '99'} inputMode="numeric" value={emission.docNumber} onChange={event => setEmission(v => ({ ...v, docNumber: event.target.value.replace(/\D/g, '').slice(0, 11) }))} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-sm font-normal disabled:bg-gray-100" placeholder={emission.docType === '96' ? '7 u 8 dígitos' : 'Solo números'} />
              </label>
              <label className="text-sm font-medium text-gray-700">Nombre / razón social receptor
                <input value={emission.customerName} onChange={event => setEmission(v => ({ ...v, customerName: event.target.value }))} maxLength={180} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 font-normal" />
              </label>
              <label className="text-sm font-medium text-gray-700">Domicilio comercial receptor
                <input value={emission.customerAddress} onChange={event => setEmission(v => ({ ...v, customerAddress: event.target.value }))} maxLength={180} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 font-normal" />
              </label>
              <label className="text-sm font-medium text-gray-700">Condición IVA receptor
                <select disabled={emission.docType === '99'} value={emission.docType === '99' ? '5' : emission.vatCondition} onChange={event => setEmission(v => ({ ...v, vatCondition: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-normal disabled:bg-gray-100">
                  <option value="1">IVA Responsable Inscripto</option><option value="4">IVA Sujeto Exento</option><option value="5">Consumidor Final</option><option value="6">Monotributo</option><option value="13">Monotributo Social</option><option value="15">IVA No Alcanzado</option>
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-gray-700">Descripción del producto o servicio
              <input required maxLength={250} value={emission.description} onChange={event => setEmission(v => ({ ...v, description: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 font-normal" placeholder="Descripción que identifique la operación" />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F4F4F1] p-4">
              <div>
                <p className="text-xs text-gray-500">Estimación previa · no es autorización fiscal</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{money(String(estimatedTotal))}</p>
                <p className="text-xs text-gray-500">Neto {money(String(estimatedNet))} · IVA {money(String(estimatedVat))}</p>
              </div>
              <button disabled={busy || featureFlags[emission.environment === 'PROD' ? 'invoiceEmissionProd' : 'invoiceEmissionTest'] !== true} className="inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Preparar vista previa</button>
            </div>
            </>}
            {emissionStep === 1 && <button type="submit" className="rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white">Continuar</button>}
            {emissionStep === 2 && <button type="button" onClick={() => setEmissionStep(1)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">Volver al emisor</button>}
          </fieldset>
        </form>
        {preparedMode === 'uncertain' && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Resultado de red incierto</p><p className="mt-1">La solicitud queda guardada. Consultá su estado antes de intentar de nuevo.</p><button type="button" onClick={() => void submitPreparedEmission()} disabled={busy || featureFlags[preparedEmission?.contributor.environment === 'PROD' ? 'invoiceEmissionProd' : 'invoiceEmissionTest'] !== true} className="mt-3 rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Reintentar misma solicitud</button></div>}
        {preparedMode === 'validated' && preparedEmission && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-semibold text-gray-900">Comprobante listo para confirmar</p><p className="mt-1 text-sm text-gray-600">Revisá emisor, receptor e importes. Al confirmar, Tienda enviará una sola solicitud de emisión al Worker.</p></div>
            <button type="button" onClick={() => void submitPreparedEmission()} disabled={busy || featureFlags[preparedEmission.contributor.environment === 'PROD' ? 'invoiceEmissionProd' : 'invoiceEmissionTest'] !== true} className="rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Confirmar emisión</button>
          </div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div><p className="text-gray-500">Tipo de comprobante</p><p className="font-semibold">{String(emissionPreview?.cbteTipo ?? '—')} · {emission.type}</p></div>
            <div><p className="text-gray-500">Total calculado</p><p className="font-semibold">{money(String(emissionPreview?.impTotal ?? '—'))}</p></div>
            <div><p className="text-gray-500">Punto de venta</p><p className="font-semibold">{emission.pointOfSale} · {emission.environment}</p></div>
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-600">La numeración definitiva y el CAE dependen de ARCA. Una vez confirmada la emisión, consultá el estado del trabajo antes de repetir cualquier operación.</p>
        </div>}
        {activeJobId && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
          <div><p className="text-sm font-semibold text-gray-900">Último trabajo fiscal</p><p className="mt-1 break-all font-mono text-xs text-gray-600">{activeJobId}</p></div>
          <button type="button" onClick={() => void refreshActiveJob()} disabled={busy} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Consultar estado</button>
        </div>}
        <p className="mt-3 text-xs leading-5 text-gray-500">La autorización final depende de ARCA. Homologación y producción usan autorizaciones separadas.</p>
      </section>

      {(section === 'all' || section === 'batch') && <section className={`rounded-2xl bg-white p-5 ${surfaceShadow}`}>
        <h2 className="font-semibold text-gray-900">Importar comprobantes</h2>
        <p className="mt-1 text-sm text-gray-600">Descargá la plantilla, completá una fila por comprobante y revisá la validación antes de confirmar.</p>
        {featureFlags.batchImport === true ? <FiscalBatchImport api={api} contributors={contributors} onComplete={() => { void load() }} /> : <p className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-600">La facturación por lote todavía no está habilitada para esta cuenta.</p>}
      </section>}

      {adminMode && featureFlags.manualInvoiceRegistration === true && <section className={`rounded-2xl bg-white p-5 ${surfaceShadow}`}>
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
          <div className="sm:col-span-2 lg:col-span-4"><button disabled={busy} className="rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Registrando…' : 'Asignar a esta cuenta'}</button></div>
        </form>
      </section>}

      <section className={`rounded-2xl bg-white p-5 ${surfaceShadow} ${section !== 'all' && section !== 'invoices' ? 'hidden' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><FileText size={18} className="text-gray-500" /><h2 className="font-semibold text-gray-900">Tus comprobantes</h2></div>
          {invoices.length > 0 && <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="invoice-environment-filter">Filtrar por ambiente</label>
            <select id="invoice-environment-filter" value={invoiceEnvironmentFilter} onChange={event => setInvoiceEnvironmentFilter(event.target.value as 'ALL' | 'TEST' | 'PROD')} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"><option value="ALL">Todos los ambientes</option><option value="TEST">Homologación</option><option value="PROD">Producción</option></select>
            <label className="sr-only" htmlFor="invoice-status-filter">Filtrar por estado</label>
            <select id="invoice-status-filter" value={invoiceStatusFilter} onChange={event => setInvoiceStatusFilter(event.target.value as InvoiceStatusFilter)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"><option value="all">Todos los estados</option><option value="authorized">Autorizados</option><option value="processing">En proceso</option><option value="review">Revisar</option></select>
            <button type="button" onClick={() => setSelectedInvoiceIds(authorizedInvoices.map(invoice => invoice.id))} disabled={!authorizedInvoices.length} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-40">Seleccionar autorizadas</button>
            <button type="button" onClick={() => setSelectedInvoiceIds([])} disabled={!selectedInvoiceIds.length} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-40">Limpiar</button>
            <button type="button" onClick={() => void exportBatchPdf()} disabled={!selectedInvoiceIds.length || !pdfTemplate || featureFlags.pdfExport !== true} className="rounded-lg bg-[#0F172A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Descargar lote PDF</button>
          </div>}
        </div>
        {invoices.length === 0 ? <div className="mt-4 rounded-xl bg-[#F4F4F1] p-6"><p className="font-semibold text-gray-900">Todavía no hay comprobantes</p><p className="mt-1 max-w-xl text-sm text-gray-600">Acá vas a encontrar las facturas autorizadas, su CAE y las representaciones para descargar.</p><Link href="/perfil/nodo/emitir" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Emitir la primera factura <span aria-hidden="true">→</span></Link></div> : <><p className="mt-2 text-xs leading-5 text-gray-600">El PDF y el QR son una representación descargable. La autorización fiscal se confirma con ARCA y figura en el estado y CAE del comprobante.</p>{visibleInvoices.length === 0 ? <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">No hay comprobantes que coincidan con esos filtros.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm"><thead><tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500"><th className="pb-3 pr-3">PDF</th><th className="pb-3 pr-4">Fecha</th><th className="pb-3 pr-4">Comprobante</th><th className="pb-3 pr-4">CUIT</th><th className="pb-3 pr-4">Ambiente</th><th className="pb-3 pr-4">Total</th><th className="pb-3 pr-4">Estado / CAE</th><th className="pb-3 pr-4">Vencimiento</th><th className="pb-3">Acción</th></tr></thead><tbody>{visibleInvoices.map(invoice => <tr key={invoice.id} className="border-b border-gray-100"><td className="py-3 pr-3"><input aria-label={`Seleccionar ${voucherName[invoice.voucherType] || 'comprobante'} ${invoice.voucherNumber ?? ''}`} type="checkbox" checked={selectedInvoiceIds.includes(invoice.id)} disabled={!isInvoiceExportable(invoice)} onChange={event => toggleInvoiceSelection(invoice.id, event.target.checked)} /></td><td className="py-3 pr-4 text-gray-600">{date(invoice.createdAt)}</td><td className="py-3 pr-4 font-medium text-gray-900">{voucherName[invoice.voucherType] || `Tipo ${invoice.voucherType}`} {invoice.voucherNumber ?? 'Pendiente'}</td><td className="py-3 pr-4 font-mono text-xs">{invoice.cuit}</td><td className="py-3 pr-4">{invoice.environment === 'TEST' ? 'Homologación' : 'Producción'}</td><td className="py-3 pr-4">{money(invoice.amount)}</td><td className="py-3 pr-4"><span className="block text-xs font-semibold">{getInvoiceStatus(invoice) === 'authorized' ? 'Autorizado' : getInvoiceStatus(invoice) === 'processing' ? 'En proceso' : 'Revisar'}</span><span className="font-mono text-xs text-gray-600">{invoice.cae || '—'}</span></td><td className="py-3 pr-4">{date(invoice.caeExpiresAt)}</td><td className="py-3"><div className="flex gap-2"><button type="button" onClick={() => void previewInvoicePdf(invoice)} disabled={!isInvoiceExportable(invoice) || !pdfTemplate || featureFlags.pdfExport !== true} className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-40">Previsualizar</button><button type="button" onClick={() => void exportInvoicePdf(invoice)} disabled={!isInvoiceExportable(invoice) || !pdfTemplate || featureFlags.pdfExport !== true} className="whitespace-nowrap rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-slate-400 hover:text-slate-900 disabled:opacity-40">Descargar PDF</button>{invoice.jobId && !invoice.workerVoucherId && <button type="button" onClick={() => void refreshInvoiceStatus(invoice)} disabled={busy} className="whitespace-nowrap rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-slate-400 hover:text-slate-900 disabled:opacity-40">Actualizar ARCA</button>}{featureFlags.invoiceVoid === true && invoice.workerVoucherId && invoice.cae && [1, 6, 11].includes(invoice.voucherType) && <button type="button" onClick={() => void voidInvoice(invoice)} disabled={busy || contributors.find(item => item.cuit === invoice.cuit && item.environment === invoice.environment)?.permissions?.canVoid !== true} className="whitespace-nowrap rounded-full border border-slate-900/20 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-40">Solicitar NC</button>}</div></td></tr>)}</tbody></table></div>}</>}
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
