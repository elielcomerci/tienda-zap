'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, LoaderCircle, Search, ShieldCheck } from 'lucide-react'

type PadronResult = { success?: boolean; data?: { cuit?: string; razonSocial?: string; estadoRegistral?: string }; environment?: string; source?: string; proof?: string; error?: string | { message?: string } }

export default function FiscalOnboardingClient({ provisioningEnabled }: { provisioningEnabled: boolean }) {
  const [cuit, setCuit] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [estadoRegistral, setEstadoRegistral] = useState('')
  const [lookupKey, setLookupKey] = useState('')
  const [lookupProof, setLookupProof] = useState('')
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'success' | 'pending' | 'manual'>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function lookupPadron() {
    if (!/^\d{11}$/.test(cuit)) return
    const key = lookupState === 'pending' && lookupKey ? lookupKey : `nodo-onboarding-${crypto.randomUUID()}`
    setLookupKey(key); setLookupState('loading'); setError('')
    try {
      const response = await fetch('/api/nodo/onboarding/padron', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ cuit }), cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({})) as PadronResult & { retryAfterSeconds?: number }
      if (response.status === 202) {
        setLookupState('pending')
        setError(`La consulta sigue en curso. Podés volver a consultar en ${payload.retryAfterSeconds || 5} segundos.`)
        return
      }
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : payload.error?.message || 'No se pudo consultar el padrón.')
      if (payload.data?.razonSocial) {
        setRazonSocial(payload.data.razonSocial)
        setEstadoRegistral(payload.data.estadoRegistral || '')
        setLookupProof(payload.proof || '')
        setLookupState('success')
      } else {
        setLookupState('manual')
        setError('No encontramos la razón social. Podés completarla manualmente y continuar.')
      }
    } catch (reason) {
      setLookupState('manual')
      setError(reason instanceof Error ? reason.message : 'No se pudo consultar el padrón.')
    }
  }

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/nodo/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit, razonSocial, ...(lookupProof ? { proof: lookupProof } : {}) }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string; message?: string }
      if (!response.ok) throw new Error(payload.error || 'No se pudo crear NODO ZAP.')
      setError(payload.message || 'NODO ZAP quedó creado. Abriendo Facturación…')
      window.location.assign('/perfil/nodo/configuracion')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear NODO ZAP.')
      setBusy(false)
    }
  }

  return <main className="min-h-screen bg-[#FAF9F6] px-4 py-8 sm:px-6 sm:py-12">
    <section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-[0_1px_2px_0_rgba(15,23,42,0.03),0_12px_28px_-8px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5 sm:p-9">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800"><ShieldCheck size={23} /></div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">NODO ZAP · Cuenta fiscal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0F172A]">Empezá con tu CUIT</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Ingresá tu CUIT para consultar los datos registrales disponibles y crear tu cuenta.</p>

      {!provisioningEnabled && <div role="status" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">El alta autoservicio todavía no está habilitada. Tu información no se enviará ni se creará una cuenta hasta que el servicio esté disponible.</div>}

      <form onSubmit={event => void createAccount(event)} className="mt-7 space-y-5">
        <label className="block text-sm font-semibold text-slate-800">CUIT del contribuyente
          <input required inputMode="numeric" autoComplete="off" pattern="\d{11}" maxLength={11} value={cuit} onChange={event => { setCuit(event.target.value.replace(/\D/g, '').slice(0, 11)); setRazonSocial(''); setEstadoRegistral(''); setLookupKey(''); setLookupProof(''); setLookupState('idle'); setError('') }} className="mt-2 block w-full rounded-xl border border-slate-200 bg-[#F4F4F1] px-4 py-3 font-mono text-base font-normal tracking-wide text-slate-950 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" placeholder="11 dígitos" />
        </label>
        <button type="button" onClick={() => void lookupPadron()} disabled={cuit.length !== 11 || lookupState === 'loading' || !provisioningEnabled} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          {lookupState === 'loading' ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={16} />}Consultar padrón
        </button>

        {lookupState === 'success' && <div role="status" className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Datos encontrados</p>{estadoRegistral && <p className="mt-1">Estado registral: {estadoRegistral}</p>}</div></div>}

        {(razonSocial || lookupState === 'manual') && <label className="block text-sm font-semibold text-slate-800">Razón social
          <input required maxLength={180} value={razonSocial} onChange={event => { setRazonSocial(event.target.value); setLookupProof('') }} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-950 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
        </label>}

        {error && <p role="status" className="rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-700">{error}</p>}

        <div className="rounded-xl bg-[#F4F4F1] p-4 text-xs leading-5 text-slate-600">Podrás completar la configuración de facturación después de crear tu cuenta.</div>

        <button type="submit" disabled={busy || !provisioningEnabled || cuit.length !== 11 || razonSocial.trim().length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />}Crear mi cuenta NODO
        </button>
      </form>
      <a href="/perfil" className="mt-4 inline-flex w-full justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">Seguir sin activar NODO por ahora</a>
    </section>
  </main>
}
