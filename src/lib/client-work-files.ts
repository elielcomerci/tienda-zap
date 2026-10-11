import { sanitizeFileName } from './order-files'

export const MAX_CLIENT_FILE_SIZE_BYTES = 150 * 1024 * 1024
const allowedExtensions = new Set(['pdf','png','jpg','jpeg','gif','webp','svg','tif','tiff','zip','ai','psd','eps','cdr','mp3','wav','m4a','mp4','mov','webm','doc','docx','xls','xlsx','ppt','pptx','txt','csv'])
const safeInlineExtensions = new Set(['pdf','png','jpg','jpeg','gif','webp','mp3','wav','m4a','mp4','mov','webm'])

export function validateClientFile(input: { fileName: string; contentType?: string; sizeBytes: number }) {
  const fileName = sanitizeFileName(input.fileName)
  const extension = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : ''
  const contentType = (input.contentType || 'application/octet-stream').split(';')[0].trim().toLowerCase()
  if (!extension || !allowedExtensions.has(extension)) return { ok: false as const, error: 'Formato de archivo no permitido.' }
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_CLIENT_FILE_SIZE_BYTES) return { ok: false as const, error: 'El archivo debe pesar entre 1 byte y 150 MB.' }
  if (extension === 'svg' && contentType !== 'image/svg+xml' && contentType !== 'application/octet-stream') return { ok: false as const, error: 'El tipo de archivo no coincide con la extensión.' }
  return { ok: true as const, fileName, extension, contentType }
}

export function isSafeInlineClientFile(file: { fileName: string; contentType: string }) {
  const extension = file.fileName.split('.').pop()?.toLowerCase() || ''
  if (!safeInlineExtensions.has(extension)) return false
  if (extension === 'pdf') return file.contentType === 'application/pdf'
  if (['png','jpg','jpeg','gif','webp'].includes(extension)) return file.contentType.startsWith('image/')
  if (['mp3','wav','m4a'].includes(extension)) return file.contentType.startsWith('audio/')
  if (['mp4','mov','webm'].includes(extension)) return file.contentType.startsWith('video/')
  return false
}

export function isClientWorkFilesEnabled() {
  return process.env.CLIENT_WORK_FILES_ENABLED === 'true'
}
