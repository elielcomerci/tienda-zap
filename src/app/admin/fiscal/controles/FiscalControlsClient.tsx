'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, LoaderCircle, Save, ShieldAlert, ShieldCheck, Power } from 'lucide-react'

type Flag = { key: string; label: string; description: string; enabled: boolean; updatedAt: string | null; updatedBy: string | null }

export default function FiscalControlsClient() {
  const [flags, setFlags] = useState<Flag[]>([])
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/admin/fiscal/feature-flags', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los controles.')
      setFlags(payload.flags || [])
      setSaved(Object.fromEntries((payload.flags || []).map((flag: Flag) => [flag.key, flag.enabled])))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los controles.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const dirty = flags.some(flag => saved[flag.key] !== flag.enabled)
  const productionEnabled = flags.some(flag => flag.key === 'invoiceEmissionProd' && flag.enabled)
  const setFlag = (key: string, enabled: boolean) => {
    setFlags(current => current.map(flag => flag.key === key ? { ...flag, enabled } : flag))
    setNotice('')
  }

  async function save() {
    if (productionEnabled && saved.invoiceEmissionProd !== true &&
      !confirm('Vas a habilitar la emisión en PRODUCCIÓN. Esto permite emitir comprobantes fiscales reales. ¿Confirmás?')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/fiscal/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags: Object.fromEntries(flags.map(flag => [flag.key, flag.enabled])) }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudieron guardar los controles.')
      setSaved(Object.fromEntries(flags.map(flag => [flag.key, flag.enabled])))
      setNotice('Controles guardados. Los permisos operativos se verifican también en el servidor.')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron guardar los controles.')
    } finally { setBusy(false) }
  }

  function disableAll() {
    setFlags(current => current.map(flag => ({ ...flag, enabled: false })))
    setNotice('Todas las funciones quedaron apagadas en este formulario. Guardá para aplicar el cambio.')
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/fiscal" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"><ArrowLeft size={16} /> Cuentas fiscales</Link>
          <p className="text-sm font-semibold uppercase tracking-wide text-zap-magenta">Operación · Fiscal</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Controles de operación</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">Activá cada capacidad por separado. Los cambios no se aplican hasta guardar y quedan registrados en la auditoría de administración.</p>
        </div>
        <button onClick={() => void load()} disabled={loading || busy} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Actualizar</button>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <ShieldAlert size={20} className="mt-0.5 shrink-0" />
        <div><strong>Producción requiere atención.</strong><p className="mt-1">Dejá desactivada la emisión PROD hasta terminar las pruebas de homologación, revisar los puntos de venta y confirmar la autorización del contribuyente. Si la base o la migración no están disponibles, las operaciones quedan bloqueadas.</p></div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

      {loading ? <div className="flex items-center gap-2 py-10 text-sm text-gray-500"><LoaderCircle className="animate-spin" size={18} /> Cargando controles…</div> : (
        <section className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
          {flags.map(flag => (
            <div key={flag.key} className="flex items-start justify-between gap-4 p-4 sm:p-5">
              <div className="min-w-0">
                <div className="font-semibold text-gray-900">{flag.label}</div>
                <p className="mt-1 text-sm text-gray-600">{flag.description}</p>
                <p className="mt-2 text-xs text-gray-400">{flag.enabled ? 'Habilitada' : 'Deshabilitada'}{flag.updatedAt ? ` · Último cambio: ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(flag.updatedAt))}` : ' · Sin cambios guardados'}</p>
              </div>
              <button type="button" role="switch" aria-checked={flag.enabled} aria-label={flag.label} onClick={() => setFlag(flag.key, !flag.enabled)} className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zap-magenta focus:ring-offset-2 ${flag.enabled ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${flag.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
          {!flags.length && <p className="p-5 text-sm text-gray-600">No hay controles disponibles.</p>}
        </section>
      )}

      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {dirty ? <><span className="h-2 w-2 rounded-full bg-amber-500" /> Cambios sin guardar</> : <><ShieldCheck size={16} /> Configuración guardada</>}
        </div>
        <div className="flex gap-2">
          <button onClick={disableAll} disabled={loading || busy || !flags.some(flag => flag.enabled)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-40"><Power size={15} /> Apagar todo</button>
          <button onClick={() => void save()} disabled={loading || busy || !dirty} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />} Guardar cambios</button>
        </div>
      </div>
    </main>
  )
}
