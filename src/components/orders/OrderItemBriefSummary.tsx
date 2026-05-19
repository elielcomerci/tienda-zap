import { ExternalLink, FileText } from 'lucide-react'

type BriefType = 'NONE' | 'DESIGN' | 'MUSIC' | 'VIDEO'

const briefLabels: Record<BriefType, string> = {
  NONE: 'Sin brief',
  DESIGN: 'Brief de diseno',
  MUSIC: 'Brief de musica',
  VIDEO: 'Brief de video',
}

const fieldLabels: Record<string, string> = {
  business: 'Negocio / marca',
  mainMessage: 'Mensaje principal',
  style: 'Estilo',
  colors: 'Colores / restricciones',
  mood: 'Estilo / energia',
  duration: 'Duracion',
  voice: 'Voz / instrumental',
  format: 'Formato / plataforma',
  message: 'Mensaje principal',
}

function readResponses(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function readFiles(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((file): file is { url: string; fileName: string } => {
    return Boolean(
      file &&
        typeof file === 'object' &&
        'url' in file &&
        'fileName' in file &&
        typeof file.url === 'string' &&
        typeof file.fileName === 'string'
    )
  })
}

export default function OrderItemBriefSummary({
  briefType,
  briefResponses,
  briefReferenceLinks,
  briefReferenceFiles,
}: {
  briefType?: string | null
  briefResponses?: unknown
  briefReferenceLinks?: string[] | null
  briefReferenceFiles?: unknown
}) {
  const normalizedBriefType = (briefType || 'NONE') as BriefType
  if (normalizedBriefType === 'NONE') return null

  const responses = readResponses(briefResponses)
  const responseEntries = Object.entries(responses).filter(([, value]) =>
    typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
  )
  const links = (briefReferenceLinks || []).filter(Boolean)
  const files = readFiles(briefReferenceFiles)

  if (responseEntries.length === 0 && links.length === 0 && files.length === 0) return null

  return (
    <div className="mt-3 rounded-xl border border-[#F66B9A]/20 bg-[#FEF1F6]/45 p-3 text-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#C91F5B]">
        {briefLabels[normalizedBriefType] || 'Brief'}
      </p>

      {responseEntries.length > 0 && (
        <dl className="grid gap-2 sm:grid-cols-2">
          {responseEntries.map(([key, value]) => (
            <div key={key} className="rounded-lg bg-white p-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                {fieldLabels[key] || key}
              </dt>
              <dd className="mt-1 text-xs font-medium text-gray-800">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {links.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold text-gray-700">Referencias</p>
          {links.map((link, index) => (
            <a
              key={`${link}-${index}`}
              href={link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 truncate text-xs font-semibold text-blue-700 hover:underline"
            >
              <ExternalLink size={12} className="shrink-0" />
              <span className="truncate">{link}</span>
            </a>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold text-gray-700">Archivos de referencia</p>
          {files.map((file, index) => (
            <a
              key={`${file.url}-${index}`}
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs font-semibold text-blue-700 hover:underline"
            >
              <FileText size={12} className="shrink-0" />
              <span className="truncate">{file.fileName}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
