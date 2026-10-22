'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Check, Copy, KeyRound, Plus, RefreshCw, ShieldAlert, ShieldCheck, X } from 'lucide-react'

type ApiKey = {
  id: string
  label: string
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

type Tenant = {
  id: string
  name: string
  slug: string
  status: string
  createdAt: string
  apiKeys: ApiKey[]
}

type OneTimeKey = {
  tenantName: string
  label: string
  value: string
}

function formatDate(value: string | null, emptyLabel = 'Sin vencimiento') {
  if (!value) return emptyLabel
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function keyState(key: ApiKey) {
  if (key.revokedAt) return { label: 'Revocada', className: 'bg-gray-100 text-gray-600' }
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) {
    return { label: 'Vencida', className: 'bg-amber-100 text-amber-800' }
  }
  return { label: 'Activa', className: 'bg-emerald-100 text-emerald-800' }
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

export default function FiscalAdminClient() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [keyDraft, setKeyDraft] = useState<{ tenantId: string; label: string } | null>(null)
  const [oneTimeKey, setOneTimeKey] = useState<OneTimeKey | null>(null)
  const [copied, setCopied] = useState(false)

  const activeTenants = useMemo(() => tenants.filter(t => t.status === 'ACTIVE').length, [tenants])
  const totalKeys = useMemo(() => tenants.reduce((n, t) => n + t.apiKeys.length, 0), [tenants])

  const loadTenants = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/fiscal/tenants', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message || payload?.error || 'No se pudo consultar el Worker fiscal.')
      setTenants(Array.isArray(payload?.tenants) ? payload.tenants : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo consultar el Worker fiscal.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadTenants() }, [loadTenants])

  async function createTenant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/fiscal/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message || payload?.error || 'No se pudo crear la cuenta fiscal.')
      setOneTimeKey({
        tenantName: payload.tenant.name,
        label: payload.apiKey.label,
        value: payload.apiKey.value,
      })
      setName('')
      setSlug('')
      setSlugEdited(false)
      setNotice('Cuenta fiscal creada. Copiá la clave ahora: no se puede volver a consultar.')
      await loadTenants()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la cuenta fiscal.')
    } finally {
      setBusy(false)
    }
  }

  async function createApiKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!keyDraft) return
    const tenant = tenants.find(item => item.id === keyDraft.tenantId)
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/admin/fiscal/tenants/${encodeURIComponent(keyDraft.tenantId)}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: keyDraft.label.trim() }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message || payload?.error || 'No se pudo crear la API key.')
      setOneTimeKey({
        tenantName: tenant?.name || 'Cuenta fiscal',
        label: payload.apiKey.label,
        value: payload.apiKey.value,
      })
      setKeyDraft(null)
      setNotice('API key creada. Copiala ahora; el Worker no permite recuperarla después.')
      await loadTenants()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la API key.')
    } finally {
      setBusy(false)
    }
  }

  async function revokeKey(tenant: Tenant, key: ApiKey) {
    if (!confirm(`¿Revocar la clave “${key.label}” de ${tenant.name}? Esta acción no se puede deshacer.`)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/admin/fiscal/tenants/${encodeURIComponent(tenant.id)}/api-keys/${encodeURIComponent(key.id)}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error?.message || payload?.error || 'No se pudo revocar la clave.')
      setNotice('API key revocada.')
      await loadTenants()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo revocar la clave.')
    } finally {
      setBusy(false)
    }
  }

  async function copyOneTimeKey() {
    if (!oneTimeKey) return
    try {
      await navigator.clipboard.writeText(oneTimeKey.value)
      setCopied(true)
    } catch {
      setError('No se pudo copiar automáticamente. Seleccioná la clave y copiala manualmente.')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Operación · Fiscal</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Cuentas fiscales</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Administrá cuentas y accesos del servicio fiscal. Las credenciales se transmiten desde el servidor; nunca desde el navegador al Worker.
          </p>
        </div>
        <button onClick={() => void loadTenants()} disabled={loading || busy}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldAlert size={18} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

      {oneTimeKey && (
        <section className="rounded-2xl border border-orange-300 bg-orange-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-semibold text-orange-950"><KeyRound size={18} /> Clave disponible por única vez</div>
              <p className="mt-1 text-sm text-orange-900">{oneTimeKey.tenantName} · {oneTimeKey.label}</p>
            </div>
            <button onClick={() => { setOneTimeKey(null); setCopied(false) }} aria-label="Cerrar aviso" className="rounded-lg p-1 text-orange-900 hover:bg-orange-100"><X size={18} /></button>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-orange-200 bg-white p-3 text-sm text-gray-900">{oneTimeKey.value}</code>
            <button onClick={() => void copyOneTimeKey()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800">
              {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copiada' : 'Copiar clave'}
            </button>
          </div>
          <p className="mt-2 text-xs text-orange-900">Guardala en un gestor seguro y entregala por un canal seguro. Al cerrar este aviso no vas a poder verla otra vez.</p>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-sm text-gray-500">Cuentas registradas</p><p className="mt-2 text-2xl font-bold text-gray-900">{loading ? '—' : tenants.length}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-sm text-gray-500">Cuentas activas</p><p className="mt-2 text-2xl font-bold text-gray-900">{loading ? '—' : activeTenants}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-sm text-gray-500">Claves registradas</p><p className="mt-2 text-2xl font-bold text-gray-900">{loading ? '—' : totalKeys}</p></div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Crear cuenta fiscal</h2>
        <p className="mt-1 text-sm text-gray-500">El Worker crea la cuenta y su primera API key en una misma operación.</p>
        <form onSubmit={createTenant} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-medium text-gray-700">Nombre de la cuenta
            <input required maxLength={120} value={name} onChange={e => {
              const value = e.target.value
              setName(value)
              if (!slugEdited) setSlug(slugify(value))
            }} placeholder="Ej. Comercio Ejemplo" className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal outline-none focus:border-orange-500" />
          </label>
          <label className="text-sm font-medium text-gray-700">Identificador (slug)
            <input required maxLength={60} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={e => { setSlug(e.target.value); setSlugEdited(true) }} placeholder="comercio-ejemplo" className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm font-normal outline-none focus:border-orange-500" />
          </label>
          <div className="flex items-end"><button disabled={busy || !name.trim() || !slug.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"><Plus size={16} /> Crear cuenta</button></div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2"><Activity size={18} className="text-gray-500" /><h2 className="font-semibold text-gray-900">Cuentas y API keys</h2></div>
        {loading ? <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Consultando el Worker fiscal…</div>
          : tenants.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center"><p className="font-medium text-gray-900">Todavía no hay cuentas para mostrar</p><p className="mt-1 text-sm text-gray-500">Si esperabas ver cuentas existentes, revisá la configuración y el acceso al Worker.</p></div>
          : tenants.map(tenant => (
            <article key={tenant.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 p-4 sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-gray-900">{tenant.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tenant.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>{tenant.status}</span></div>
                  <p className="mt-1 break-all font-mono text-xs text-gray-500">{tenant.slug} · ID {tenant.id}</p>
                  <p className="mt-1 text-xs text-gray-400">Creada {formatDate(tenant.createdAt)}</p>
                </div>
                <button onClick={() => setKeyDraft({ tenantId: tenant.id, label: '' })} disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Plus size={15} /> Nueva API key</button>
              </div>
              {keyDraft?.tenantId === tenant.id && (
                <form onSubmit={createApiKey} className="grid gap-2 border-b border-gray-100 bg-gray-50 p-4 sm:grid-cols-[1fr_auto_auto]">
                  <input required maxLength={80} value={keyDraft.label} onChange={e => setKeyDraft(current => current ? { ...current, label: e.target.value } : current)} placeholder="Etiqueta: sitio web, sistema de ventas…" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500" />
                  <button disabled={busy || !keyDraft.label.trim()} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Crear clave</button>
                  <button type="button" onClick={() => setKeyDraft(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">Cancelar</button>
                </form>
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3 font-semibold">Etiqueta</th><th className="px-4 py-3 font-semibold">Estado</th><th className="px-4 py-3 font-semibold">Último uso</th><th className="px-4 py-3 font-semibold">Vencimiento</th><th className="px-4 py-3 text-right font-semibold">Acción</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {tenant.apiKeys.length === 0 ? <tr><td colSpan={5} className="px-4 py-5 text-center text-sm text-gray-500">No hay claves registradas.</td></tr>
                    : tenant.apiKeys.map(key => {
                      const state = keyState(key)
                      const canRevoke = !key.revokedAt && state.label !== 'Vencida'
                      return <tr key={key.id}>
                        <td className="px-4 py-3"><p className="font-medium text-gray-800">{key.label}</p><p className="mt-0.5 text-xs text-gray-400">Creada {formatDate(key.createdAt)}</p></td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${state.className}`}>{state.label}</span></td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(key.lastUsedAt, 'Nunca')}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(key.expiresAt)}</td>
                        <td className="px-4 py-3 text-right">{canRevoke ? <button disabled={busy} onClick={() => void revokeKey(tenant, key)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Revocar</button> : <span className="inline-flex items-center gap-1 text-xs text-gray-400"><ShieldCheck size={14} /> Sin acción</span>}</td>
                      </tr>
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-2"><ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-800" /><div><h2 className="text-sm font-semibold text-amber-950">Uso y autorización fiscal</h2><p className="mt-1 text-sm leading-6 text-amber-900">El Worker actual expone el uso por CUIT en producción a través de una API key de tenant y requiere autorización de emisión activa. No expone un saldo global de cuenta en la ruta interna de administración. Por eso, esta pantalla todavía no presenta un saldo consolidado ni un estado de certificado como si fueran datos verificados.</p></div></div>
      </section>
    </div>
  )
}
