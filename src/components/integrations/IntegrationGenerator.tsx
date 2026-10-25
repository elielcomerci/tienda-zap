'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Copy, Download, KeyRound, LoaderCircle, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'

type Environment = 'TEST' | 'PROD'
type Stack = 'node-typescript' | 'python'
type ApiKey = { id: string; label: string; expiresAt: string | null; lastUsedAt: string | null; revokedAt: string | null; createdAt: string }
type Generated = { integration: { account: string; tenantSlug: string; environment: Environment; baseUrl: string; validation: { ok: boolean; contributorCount: number; checkedAt: string } }; apiKey: { id: string; label: string; value: string; expiresAt?: string | null; shownOnce?: boolean } }

const stacks: Array<{ id: Stack | 'php' | 'java' | 'csharp'; name: string; detail: string; available: boolean }> = [
  { id: 'node-typescript', name: 'Node.js / TypeScript', detail: 'Fetch integrado, sin dependencias HTTP', available: true },
  { id: 'python', name: 'Python', detail: 'urllib estándar, sin dependencias externas', available: true },
  { id: 'php', name: 'PHP', detail: 'Generador pendiente de validación', available: false },
  { id: 'java', name: 'Java', detail: 'Generador pendiente de validación', available: false },
  { id: 'csharp', name: 'C#', detail: 'Generador pendiente de validación', available: false },
]

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0) }
  return (crc ^ 0xffffffff) >>> 0
}
function joinBytes(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0
  for (const part of parts) { result.set(part, offset); offset += part.length }
  return result
}
function zipFiles(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder(), local: Uint8Array[] = [], central: Uint8Array[] = []; let localOffset = 0
  const date = new Date(), dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  for (const file of files) {
    const name = encoder.encode(file.name), data = encoder.encode(file.content), crc = crc32(data)
    const header = new Uint8Array(30 + name.length), view = new DataView(header.buffer)
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x0800, true); view.setUint16(8, 0, true)
    view.setUint16(10, dosTime, true); view.setUint16(12, dosDate, true); view.setUint32(14, crc, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true)
    view.setUint16(26, name.length, true); view.setUint16(28, 0, true); header.set(name, 30); local.push(header, data)
    const directory = new Uint8Array(46 + name.length), dir = new DataView(directory.buffer)
    dir.setUint32(0, 0x02014b50, true); dir.setUint16(4, 20, true); dir.setUint16(6, 20, true); dir.setUint16(8, 0x0800, true); dir.setUint16(10, 0, true)
    dir.setUint16(12, dosTime, true); dir.setUint16(14, dosDate, true); dir.setUint32(16, crc, true); dir.setUint32(20, data.length, true); dir.setUint32(24, data.length, true)
    dir.setUint16(28, name.length, true); dir.setUint16(30, 0, true); dir.setUint16(32, 0, true); dir.setUint16(34, 0, true); dir.setUint16(36, 0, true)
    dir.setUint32(38, 0, true); dir.setUint32(42, localOffset, true); directory.set(name, 46); central.push(directory); localOffset += header.length + data.length
  }
  const centralBytes = joinBytes(central), end = new Uint8Array(22), endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true); endView.setUint16(4, 0, true); endView.setUint16(6, 0, true); endView.setUint16(8, files.length, true); endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralBytes.length, true); endView.setUint32(16, localOffset, true); endView.setUint16(20, 0, true)
  return new Blob([joinBytes([...local, centralBytes, end])], { type: 'application/zip' })
}

function integrationFiles(stack: Stack, generated: Generated) {
  const env = `ZAP_FISCAL_BASE_URL=${generated.integration.baseUrl}\nZAP_FISCAL_ENVIRONMENT=${generated.integration.environment}\nZAP_FISCAL_API_KEY=${generated.apiKey.value}\n`
  const safeEnv = `ZAP_FISCAL_BASE_URL=${generated.integration.baseUrl}\nZAP_FISCAL_ENVIRONMENT=${generated.integration.environment}\nZAP_FISCAL_API_KEY=\n`
  const readme = `# ZAP Fiscal API · ${stack === 'node-typescript' ? 'Node.js / TypeScript' : 'Python'}\n\nCuenta: ${generated.integration.account}\nAmbiente preseleccionado: ${generated.integration.environment}\nBase URL: ${generated.integration.baseUrl}\nValidación: correcta el ${new Date(generated.integration.validation.checkedAt).toLocaleString('es-AR')} (${generated.integration.validation.contributorCount} CUIT vinculadas en este ambiente).\n\n## Seguridad y configuración\n\nEsta clave es secreta y debe usarse únicamente desde tu backend. Nunca la incluyas en JavaScript del navegador, una app móvil sin backend propio, logs ni repositorios. Conservá .env fuera del repositorio y usá el gestor de secretos de tu entorno al desplegar.\n\n1. Consultá contributors con el ejemplo incluido.\n2. En cada llamada enviá X-Api-Key. La clave se mostró una sola vez; revocala desde Integraciones si se pierde o se expone.\n3. La clave identifica al tenant y sus permisos; la variable de ambiente preselecciona el parámetro environment de los ejemplos, pero no limita la clave a ese ambiente.\n\nEsta validación confirma la API key y el tenant en ZAP. No comprueba permisos del certificado ni disponibilidad de ARCA para emitir.\n\nNode.js: npm run example:contributors\nPython: python examples/list_contributors.py\n\nContrato: GET /v1/contributors?environment=${generated.integration.environment}\n`
  const common = [
    { name: '.env', content: env }, { name: '.env.example', content: safeEnv },
    { name: '.gitignore', content: '.env\n.env.*\n!.env.example\nnode_modules/\n__pycache__/\n.venv/\n' }, { name: 'README.md', content: readme },
  ]
  if (stack === 'node-typescript') return [...common,
    { name: 'src/zap-fiscal.ts', content: `const baseUrl = process.env.ZAP_FISCAL_BASE_URL\nconst apiKey = process.env.ZAP_FISCAL_API_KEY\nconst environment = process.env.ZAP_FISCAL_ENVIRONMENT\nif (!baseUrl || !apiKey || !environment) throw new Error('Configurá las variables ZAP_FISCAL_*')\n\nexport async function listContributors() {\n  const url = new URL('/v1/contributors', baseUrl)\n  url.searchParams.set('environment', environment)\n  const response = await fetch(url, { headers: { 'X-Api-Key': apiKey, Accept: 'application/json' } })\n  const payload = await response.json() as { contributors?: unknown[]; error?: { code?: string; message?: string } }\n  if (!response.ok) throw new Error('ZAP Fiscal ' + response.status + ' ' + (payload.error?.code ?? 'ERROR') + ': ' + (payload.error?.message ?? 'Solicitud fallida'))\n  return payload.contributors ?? []\n}\n` },
    { name: 'examples/list-contributors.ts', content: `import { listContributors } from '../src/zap-fiscal.ts'\nlistContributors().then(rows => console.log(JSON.stringify(rows, null, 2))).catch(error => { console.error(error); process.exitCode = 1 })\n` },
    { name: 'package.json', content: JSON.stringify({ name: 'zap-fiscal-integration', private: true, scripts: { 'example:contributors': 'node --env-file=.env --experimental-strip-types examples/list-contributors.ts' }, engines: { node: '>=22.6' } }, null, 2) + '\n' },
  ]
  return [...common,
    { name: 'zap_fiscal.py', content: `import json\nimport os\nfrom pathlib import Path\nfrom urllib.error import HTTPError, URLError\nfrom urllib.parse import urlencode\nfrom urllib.request import Request, urlopen\n\n# Load the downloaded .env for this standalone example; deployment systems should inject secrets.\nfor line in Path('.env').read_text(encoding='utf-8').splitlines():\n    if '=' in line and not line.lstrip().startswith('#'):\n        name, value = line.split('=', 1)\n        os.environ.setdefault(name.strip(), value.strip())\n\nBASE_URL = os.environ.get("ZAP_FISCAL_BASE_URL", "").rstrip("/")\nAPI_KEY = os.environ.get("ZAP_FISCAL_API_KEY", "")\nENVIRONMENT = os.environ.get("ZAP_FISCAL_ENVIRONMENT", "")\n\ndef list_contributors():\n    if not BASE_URL or not API_KEY or ENVIRONMENT not in ("TEST", "PROD"):\n        raise RuntimeError("Configurá las variables ZAP_FISCAL_*")\n    url = f"{BASE_URL}/v1/contributors?{urlencode({'environment': ENVIRONMENT})}"\n    request = Request(url, headers={"X-Api-Key": API_KEY, "Accept": "application/json"})\n    try:\n        with urlopen(request, timeout=20) as response:\n            return json.loads(response.read().decode("utf-8")).get("contributors", [])\n    except HTTPError as error:\n        payload = json.loads(error.read().decode("utf-8"))\n        detail = payload.get("error", {})\n        raise RuntimeError(f"ZAP Fiscal {error.code} {detail.get('code', 'ERROR')}: {detail.get('message', 'Solicitud fallida')}") from error\n    except URLError as error:\n        raise RuntimeError(f"No se pudo conectar con ZAP Fiscal: {error.reason}") from error\n` },
    { name: 'examples/list_contributors.py', content: `import json\nimport sys\nfrom pathlib import Path\nsys.path.insert(0, str(Path(__file__).resolve().parents[1]))\nfrom zap_fiscal import list_contributors\nif __name__ == "__main__": print(json.dumps(list_contributors(), ensure_ascii=False, indent=2))\n` },
    { name: 'requirements.txt', content: '# Sin dependencias externas; usa la biblioteca estándar de Python.\n' },
  ]
}

function downloadPackage(stack: Stack, generated: Generated) {
  const blob = zipFiles(integrationFiles(stack, generated)), link = document.createElement('a')
  link.href = URL.createObjectURL(blob); link.download = `zap-fiscal-${stack}-${generated.integration.environment.toLowerCase()}.zip`; link.click(); window.setTimeout(() => URL.revokeObjectURL(link.href), 1_000)
}

export default function IntegrationGenerator() {
  const [stack, setStack] = useState<Stack>('node-typescript'), [environment, setEnvironment] = useState<Environment>('TEST')
  const [label, setLabel] = useState('Mi integración'), [keys, setKeys] = useState<ApiKey[]>([]), [generated, setGenerated] = useState<Generated | null>(null)
  const [rotationTarget, setRotationTarget] = useState<ApiKey | null>(null), [pendingRotation, setPendingRotation] = useState<ApiKey | null>(null)
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  async function loadKeys() {
    const response = await fetch('/api/nodo/integrations/keys', { cache: 'no-store' }), payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las claves.')
    setKeys(payload.apiKeys || [])
  }
  useEffect(() => { loadKeys().catch(e => setError(e instanceof Error ? e.message : 'No se pudieron cargar las claves.')) }, [])
  const previewGenerated: Generated = generated ?? {
    integration: { account: 'Tu cuenta', tenantSlug: '', environment, baseUrl: 'https://arca.zap.com.ar', validation: { ok: true, contributorCount: 0, checkedAt: new Date(0).toISOString() } },
    apiKey: { id: '', label: '', value: 'ZAP_FISCAL_API_KEY' },
  }
  const codeFile = integrationFiles(stack, previewGenerated).find(file => file.name === (stack === 'node-typescript' ? 'src/zap-fiscal.ts' : 'zap_fiscal.py'))
  async function generate() {
    const replacing = rotationTarget
    setError(''); setNotice(''); setGenerated(null); setLoading(true)
    try {
      const response = await fetch('/api/nodo/integrations/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, environment, stack, ...(replacing ? { rotationKeyId: replacing.id } : {}) }), cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo preparar la integración.')
      setGenerated(payload); downloadPackage(stack, payload)
      if (replacing) { setPendingRotation(replacing); setRotationTarget(null); setNotice('La clave nueva pasó la validación y se descargó. Actualizá tu integración y luego revocá la clave anterior.') }
      else setNotice('Conexión validada. El paquete se descargó y contiene la clave secreta una sola vez.')
      await loadKeys()
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la integración.'); await loadKeys().catch(() => undefined) }
    finally { setLoading(false) }
  }
  async function revoke(key: ApiKey) {
    if (!window.confirm(`¿Revocar la clave “${key.label}”? Las aplicaciones que la usan dejarán de autenticar.`)) return
    setError(''); setNotice('')
    try {
      const response = await fetch(`/api/nodo/integrations/keys/${encodeURIComponent(key.id)}`, { method: 'DELETE', cache: 'no-store' }), payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'No se pudo revocar la clave.')
      setNotice('Clave revocada.'); if (pendingRotation?.id === key.id) setPendingRotation(null); await loadKeys()
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo revocar la clave.') }
  }
  function beginRotation(key: ApiKey) {
    setRotationTarget(key); setGenerated(null); setLabel(`Reemplazo de ${key.label.replace(/^Integración:\s*/, '')}`.slice(0, 80))
    setError(''); setNotice(`Se creará una clave nueva para reemplazar “${key.label}”. La anterior seguirá activa hasta que confirmes su revocación.`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  async function copyKey() { if (generated) { await navigator.clipboard.writeText(generated.apiKey.value); setNotice('Clave copiada. Guardala en un gestor de secretos; no la subas al repositorio.') } }
  async function copyCode() { if (codeFile) { await navigator.clipboard.writeText(codeFile.content); setNotice('Código copiado. La clave se lee desde las variables de entorno.') } }

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
    <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#ED164F]">Integraciones API</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">Conectá tu proyecto con ZAP Fiscal</h1><p className="mt-3 text-sm leading-6 text-gray-600">Elegí el stack, validamos una clave real contra la API y descargás un paquete funcional con endpoint, autenticación, ejemplo y variables de entorno. El ejemplo corre en tu backend: la API key nunca debe llegar al navegador. <a className="font-semibold text-[#c2103f] hover:underline" href="https://github.com/elielcomerci/arca-zap" target="_blank" rel="noreferrer">Ver catálogo y contrato de la API ↗</a></p></div>
    {error && <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {notice && <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><Check className="mr-2 inline" size={16} />{notice}</div>}
    <div className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-gray-950">1. Elegí la tecnología</h2><p className="mt-1 text-sm text-gray-500">Los stacks pendientes están identificados como tales.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{stacks.map(option => <button key={option.id} type="button" disabled={!option.available} onClick={() => option.available && setStack(option.id as Stack)} className={`rounded-xl border p-3 text-left transition ${option.available ? stack === option.id ? 'border-[#ED164F] bg-rose-50 ring-1 ring-[#ED164F]' : 'border-gray-200 hover:border-gray-300' : 'cursor-not-allowed border-dashed border-gray-200 bg-gray-50 opacity-65'}`}><span className="block text-sm font-semibold text-gray-900">{option.name}{!option.available && <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-[9px] uppercase text-gray-600">Pendiente</span>}</span><span className="mt-1 block text-xs text-gray-500">{option.detail}</span></button>)}</div>
        <h2 className="mt-7 text-lg font-semibold text-gray-950">2. Configurá el proyecto</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-gray-700">Nombre del proyecto<input value={label} onChange={e => setLabel(e.target.value)} maxLength={80} className="input mt-1.5 w-full" placeholder="Mi sistema" /></label><label className="text-sm font-medium text-gray-700">Ambiente<select value={environment} onChange={e => setEnvironment(e.target.value as Environment)} className="input mt-1.5 w-full"><option value="TEST">TEST · Homologación</option><option value="PROD">PROD · Producción</option></select></label></div>
        <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><p>La API key identifica al tenant y sus permisos; no queda restringida al ambiente seleccionado. Este selector preconfigura los ejemplos. Para PROD, la CUIT necesita un certificado productivo y autorización del servicio correspondiente en ARCA. La generación del certificado se hace en “Administrador de Certificados Digitales” y su autorización en “Administrador de Relaciones”. Esta prueba valida API key y cuenta; no comprueba el certificado ni emite comprobantes.</p></div>
        {rotationTarget && <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">Rotación en curso: primero se valida y descarga el reemplazo. La clave anterior continúa activa hasta que la revoques después de actualizar tu aplicación.</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" disabled={loading || !label.trim()} onClick={generate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ED164F] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#d81245] disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><LoaderCircle className="animate-spin" size={17} />Validando y preparando…</> : rotationTarget ? <><RefreshCw size={17} />Crear y validar reemplazo</> : <><KeyRound size={17} />Validar y generar paquete</>}</button>{rotationTarget && <button type="button" onClick={() => { setRotationTarget(null); setLabel('Mi integración'); setNotice('Rotación cancelada. La clave anterior sigue activa.') }} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar rotación</button>}</div>
      </section>
      <aside className="space-y-5"><section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-center gap-2 text-emerald-900"><ShieldCheck size={19} /><h2 className="font-semibold">Validación real, sin emitir</h2></div><p className="mt-2 text-sm leading-6 text-emerald-950">El servidor consulta <code>GET /v1/contributors?environment=…</code> primero con la credencial protegida y después con la clave nueva. La respuesta confirma que la clave autentica y que el Worker responde para esta cuenta y ambiente.</p>{generated && <div className="mt-4 rounded-xl bg-white p-3 text-xs text-gray-700"><p><b>Cuenta:</b> {generated.integration.account}</p><p><b>Ambiente:</b> {generated.integration.environment}</p><p><b>CUIT vinculadas visibles:</b> {generated.integration.validation.contributorCount}</p><p><b>Validada:</b> {new Date(generated.integration.validation.checkedAt).toLocaleString('es-AR')}</p></div>}</section>
        {generated && <section className="rounded-2xl border border-amber-300 bg-white p-5 shadow-sm"><h2 className="font-semibold text-gray-950">Clave mostrada una sola vez</h2><p className="mt-1 text-xs leading-5 text-gray-600">El paquete ya se descargó con el archivo `.env`. Guardá esta clave en un gestor de secretos; no la compartas ni la subas al repositorio.</p><code className="mt-3 block break-all rounded-lg bg-gray-950 p-3 font-mono text-xs text-emerald-200">{generated.apiKey.value}</code><button type="button" onClick={copyKey} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"><Copy size={14} />Copiar clave</button></section>}</aside>
    </div>
    <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 text-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4"><div><h2 className="font-semibold">Código de conexión · {stack === 'node-typescript' ? 'Node.js / TypeScript' : 'Python'}</h2><p className="mt-1 text-xs text-gray-300">Ejemplo real para consultar las CUIT vinculadas, generado desde el mismo archivo incluido en el paquete.</p></div><button type="button" onClick={copyCode} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"><Copy size={14} />Copiar código</button></div><pre className="max-h-[28rem] overflow-auto p-5 text-xs leading-5 text-emerald-100"><code>{codeFile?.content}</code></pre></section>
    <p className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">¿Estás configurando una CUIT productiva? En <a className="font-semibold underline" href="/perfil/nodo/configuracion">Configuración de NODO</a> tenés las referencias oficiales y la guía contextual del certificado.</p>
    <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5"><div><h2 className="font-semibold text-gray-950">Claves de integraciones</h2><p className="mt-1 text-sm text-gray-500">Cada proyecto tiene una clave propia. Para rotar, instalá y validá el reemplazo antes de revocar la clave anterior.</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{keys.filter(key => !key.revokedAt && (!key.expiresAt || new Date(key.expiresAt) > new Date())).length} activas</span></div>{pendingRotation && <div className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-950">Reemplazo listo para {pendingRotation.label}</p><p className="mt-1 text-xs leading-5 text-amber-900">Actualizá el secreto de tu aplicación con la nueva clave descargada y comprobá que conecte. Después podés revocar la anterior; hasta entonces ambas funcionan.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => revoke(pendingRotation)} className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800"><Trash2 size={14} />Revocar la anterior</button><button type="button" onClick={() => setPendingRotation(null)} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100">Dejar ambas activas</button></div></div>}{keys.length === 0 ? <p className="p-6 text-sm text-gray-500">Todavía no hay claves generadas desde el área de clientes.</p> : <div className="divide-y divide-gray-100">{keys.map(key => { const active = !key.revokedAt && (!key.expiresAt || new Date(key.expiresAt) > new Date()); return <div key={key.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-5"><KeyRound className="shrink-0 text-gray-400" size={18} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-900">{key.label}</p><p className="mt-1 text-xs text-gray-500">Creada {new Date(key.createdAt).toLocaleDateString('es-AR')} · {key.expiresAt ? `Vence ${new Date(key.expiresAt).toLocaleDateString('es-AR')}` : 'Sin vencimiento'} · {key.lastUsedAt ? `Último uso ${new Date(key.lastUsedAt).toLocaleString('es-AR')}` : 'Sin uso registrado'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{key.revokedAt ? 'Revocada' : active ? 'Activa' : 'Vencida'}</span>{active && <><button type="button" onClick={() => beginRotation(key)} aria-label={`Rotar ${key.label}`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-sky-300 hover:text-sky-800"><RefreshCw size={14} />Rotar</button><button type="button" onClick={() => revoke(key)} aria-label={`Revocar ${key.label}`} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:border-rose-200 hover:text-rose-700"><Trash2 size={16} /></button></>}</div> })}</div>}</section>
    <p className="mt-5 flex items-center gap-2 text-xs leading-5 text-gray-500"><Download size={15} />El archivo .env contiene una credencial secreta. El paquete la excluye de Git mediante .gitignore; almacenala en el gestor de secretos de tu despliegue.</p>
  </div>
}
