'use client'

import { useState } from 'react'
import { createArcaCsr } from '@/lib/fiscal-csr'
import { Check, Copy, Download, ExternalLink, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react'

type Contributor = {
  cuit: string
  representativeCuit: string
  environment: 'TEST' | 'PROD'
  razonSocial: string | null
}

function saveText(filename: string, value: string) {
  const url = URL.createObjectURL(new Blob([value], { type: 'application/x-pem-file;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function CertificateCsrAssistant({ contributor }: { contributor: Contributor }) {
  const [cuit, setCuit] = useState(contributor.environment === 'TEST' ? contributor.representativeCuit : contributor.cuit)
  const [organization, setOrganization] = useState(contributor.razonSocial || '')
  const [commonName, setCommonName] = useState('NODO ZAP ' + contributor.cuit)
  const [csr, setCsr] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  function clearGenerated() { setCsr(''); setPrivateKey('') }

  async function generate() {
    setBusy(true)
    setError('')
    setCsr('')
    setPrivateKey('')
    try {
      const result = await createArcaCsr({ cuit: cuit.replace(/\D/g, ''), organization, commonName })
      setCsr(result.csr)
      setPrivateKey(result.privateKey)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo generar el CSR en este dispositivo.')
    } finally {
      setBusy(false)
    }
  }

  async function copyCsr() {
    await navigator.clipboard.writeText(csr)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const prefix = 'nodo-zap-' + cuit + '-' + contributor.environment.toLowerCase()

  return <details className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
    <summary className="cursor-pointer text-sm font-semibold text-violet-950">Asistente NODO ZAP para generar CSR (PKCS#10)</summary>
    <div className="mt-3 space-y-4 text-sm leading-6 text-gray-700">
      <p>Genera en este navegador una clave RSA de 2048 bits y su solicitud PKCS#10. La clave privada no se envia a Tienda ZAP ni al Worker.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-700">CUIT que identificara el certificado
          <input inputMode="numeric" pattern="\d{11}" maxLength={11} value={cuit} onChange={event => { setCuit(event.target.value.replace(/\D/g, '').slice(0, 11)); clearGenerated() }} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-gray-700">Nombre del sistema (CN)
          <input value={commonName} maxLength={64} onChange={event => { setCommonName(event.target.value); clearGenerated() }} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-gray-700 sm:col-span-2">Organizacion (O)
          <input value={organization} maxLength={128} onChange={event => { setOrganization(event.target.value); clearGenerated() }} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal" />
        </label>
      </div>

      <p className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">Alias sugerido para el alta en ARCA: <code className="font-semibold">nodo-zap-{cuit}</code>. El alias se ingresa en ARCA/WSASS; no forma parte del archivo CSR.</p>
      {contributor.environment === 'TEST'
        ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">En homologacion, el serialNumber del CSR debe coincidir con la CUIT de la persona fisica que inicio sesion en WSASS. Luego se crea el certificado y se autoriza el servicio representando la CUIT {contributor.cuit}. Verifica la CUIT antes de generar.</p>
        : <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">En produccion, el instructivo de ARCA admite que el CSR identifique a la empresa o al programador. Usa aqui la CUIT que corresponda al titular de esta clave privada y que vas a registrar como titular del certificado en NODO ZAP. La persona que realiza el tramite debe tener acceso a la entidad en ARCA; despues autoriza el Web Service desde Administrador de Relaciones.</p>}

      <button type="button" onClick={() => void generate()} disabled={busy || !/^\d{11}$/.test(cuit) || !organization.trim() || !commonName.trim()} className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] px-4 py-2.5 text-xs font-semibold text-white transition hover:-translate-y-px hover:bg-slate-800 disabled:opacity-50">
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : <KeyRound size={15} />} Generar clave y CSR en este dispositivo
      </button>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>}

      {csr && <div className="space-y-3 rounded-xl border border-emerald-200 bg-white p-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-emerald-900"><ShieldCheck size={15} /> CSR listo. Descarga y guarda la clave privada antes de continuar. En TEST puedes pegar el texto del CSR en WSASS; en produccion sube el archivo .csr.</p>
        <textarea aria-label="CSR en formato PEM" readOnly value={csr} rows={7} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-[11px] leading-4" />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => saveText(prefix + '.key', privateKey)} className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-950"><Download size={14} /> Descargar clave privada (.key)</button>
          <button type="button" onClick={() => saveText(prefix + '.csr', csr)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"><Download size={14} /> Descargar CSR</button>
          <button type="button" onClick={() => void copyCsr()} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copiado' : 'Copiar CSR'}</button>
        </div>
        <p className="text-xs leading-5 text-amber-900">La clave privada es necesaria junto con el certificado emitido. Guardala en un lugar seguro y no la compartas. No la subas a ARCA: alli se carga solo el CSR.</p>
        <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-3">
          {contributor.environment === 'TEST' ? <>
            <a href="https://www.arca.gob.ar/ws/WSASS/html/crearcertificado.html" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#c2103f] hover:underline">Abrir guia WSASS y continuar <ExternalLink size={13} /></a>
            <a href="https://www.arca.gob.ar/ws/WSASS/WSASS_manual.pdf" target="_blank" rel="noreferrer" className="font-semibold text-[#c2103f] hover:underline">Manual oficial</a>
          </> : <>
            <a href="https://www.arca.gob.ar/landing/default.asp" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#c2103f] hover:underline">Ir al portal ARCA y abrir Administracion de Certificados Digitales <ExternalLink size={13} /></a>
            <a href="https://www.arca.gob.ar/ws/WSAA/WSAA.ObtenerCertificado.pdf" target="_blank" rel="noreferrer" className="font-semibold text-[#c2103f] hover:underline">Instructivo oficial de produccion</a>
          </>}
        </div>
      </div>}
    </div>
  </details>
}
