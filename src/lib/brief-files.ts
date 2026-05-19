import { sanitizeFileName } from '@/lib/order-files'

export const MAX_BRIEF_REFERENCE_FILE_SIZE_BYTES = 100 * 1024 * 1024

const ALLOWED_MIME_TYPES_BY_EXTENSION: Record<string, string[]> = {
  pdf: ['application/pdf'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  mp3: ['audio/mpeg', 'audio/mp3'],
  wav: ['audio/wav', 'audio/x-wav'],
  mp4: ['video/mp4'],
  mov: ['video/quicktime'],
}

const GENERIC_CONTENT_TYPES = new Set(['', 'application/octet-stream'])

export function validateBriefReferenceUpload(input: {
  fileName: string
  contentType?: string
  sizeBytes: number
}) {
  const safeFileName = sanitizeFileName(input.fileName)
  const extension = safeFileName.includes('.')
    ? safeFileName.split('.').pop()!.toLowerCase()
    : ''
  const normalizedContentType = (input.contentType || '').split(';')[0].trim().toLowerCase()
  const allowedMimeTypes = ALLOWED_MIME_TYPES_BY_EXTENSION[extension] ?? []

  if (!safeFileName || !extension || allowedMimeTypes.length === 0) {
    return { ok: false, error: 'Formato de referencia no permitido.' as const }
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { ok: false, error: 'El archivo es invalido.' as const }
  }

  if (input.sizeBytes > MAX_BRIEF_REFERENCE_FILE_SIZE_BYTES) {
    return { ok: false, error: 'El archivo supera el tamano maximo permitido.' as const }
  }

  if (
    normalizedContentType &&
    !GENERIC_CONTENT_TYPES.has(normalizedContentType) &&
    !allowedMimeTypes.includes(normalizedContentType)
  ) {
    return { ok: false, error: 'El tipo de archivo no coincide con la extension.' as const }
  }

  return {
    ok: true,
    safeFileName,
    extension,
    contentType: normalizedContentType || allowedMimeTypes[0] || 'application/octet-stream',
    sizeBytes: input.sizeBytes,
  } as const
}

export function buildBriefReferenceObjectKey(orderId: string, itemId: string, fileName: string) {
  return `orders/${orderId}/${itemId}/brief/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`
}
