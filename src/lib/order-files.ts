export const MAX_ARTWORK_FILE_SIZE_BYTES = 150 * 1024 * 1024
export const R2_UPLOAD_URL_TTL_SECONDS = 15 * 60
export const R2_DOWNLOAD_URL_TTL_SECONDS = 5 * 60

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'tif',
  'tiff',
  'zip',
  'ai',
  'psd',
  'eps',
])

const ALLOWED_MIME_TYPES_BY_EXTENSION: Record<string, string[]> = {
  pdf: ['application/pdf'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  tif: ['image/tiff'],
  tiff: ['image/tiff'],
  zip: ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'],
  ai: [
    'application/postscript',
    'application/illustrator',
    'application/vnd.adobe.illustrator',
    'application/pdf',
  ],
  psd: ['image/vnd.adobe.photoshop', 'application/x-photoshop'],
  eps: ['application/postscript'],
}

const GENERIC_CONTENT_TYPES = new Set(['', 'application/octet-stream'])
const EDITABLE_ORDER_STATUSES = new Set(['PENDING', 'PAID', 'PROCESSING'])

export function sanitizeFileName(fileName: string) {
  const baseName = fileName.split(/[/\\]/).pop() || 'archivo'
  const normalized = baseName.normalize('NFKD').replace(/[^\x00-\x7F]/g, '')
  const sanitized = normalized
    .replace(/[^a-zA-Z0-9.\-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  return sanitized || 'archivo'
}

export function isArtworkUploadAllowedStatus(status: string) {
  return EDITABLE_ORDER_STATUSES.has(status)
}

export function validateArtworkUpload(input: {
  fileName: string
  contentType?: string
  sizeBytes: number
}) {
  const safeFileName = sanitizeFileName(input.fileName)
  const extension = safeFileName.includes('.')
    ? safeFileName.split('.').pop()!.toLowerCase()
    : ''
  const normalizedContentType = (input.contentType || '').split(';')[0].trim().toLowerCase()

  if (!safeFileName || !extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false, error: 'Formato de archivo no permitido.' as const }
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { ok: false, error: 'El archivo es invalido.' as const }
  }

  if (input.sizeBytes > MAX_ARTWORK_FILE_SIZE_BYTES) {
    return { ok: false, error: 'El archivo supera el tamano maximo permitido.' as const }
  }

  const allowedMimeTypes = ALLOWED_MIME_TYPES_BY_EXTENSION[extension] ?? []
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
    contentType: normalizedContentType || 'application/octet-stream',
    sizeBytes: input.sizeBytes,
  } as const
}

export function buildArtworkObjectKey(orderId: string, itemId: string, fileName: string) {
  const safeFileName = sanitizeFileName(fileName)
  return `orders/${orderId}/${itemId}/${crypto.randomUUID()}-${safeFileName}`
}

export function orderItemHasArtworkFile(item: {
  fileObjectKey?: string | null
  fileUrl?: string | null
}) {
  return Boolean(item.fileObjectKey || item.fileUrl)
}

export function orderItemNeedsArtwork(item: {
  isService?: boolean | null
  designRequested?: boolean | null
  fileObjectKey?: string | null
  fileUrl?: string | null
}) {
  return !item.isService && !item.designRequested && !orderItemHasArtworkFile(item)
}

export function orderItemIsProductionReady(item: {
  isService?: boolean | null
  designRequested?: boolean | null
  fileObjectKey?: string | null
  fileUrl?: string | null
}) {
  return Boolean(item.isService || item.designRequested || orderItemHasArtworkFile(item))
}
