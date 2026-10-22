import { auth } from '@/auth'
import { buildR2PublicMediaUrl, createPresignedR2UploadUrl } from '@/lib/r2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function POST(request: Request) {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'El body debe ser JSON válido.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Datos de archivo inválidos.' }, { status: 400 })
  }

  const input = body as { fileName?: unknown; contentType?: unknown; sizeBytes?: unknown }
  const contentType = typeof input.contentType === 'string' ? input.contentType.toLowerCase().trim() : ''
  const sizeBytes = Number(input.sizeBytes)

  if (!ALLOWED_TYPES.has(contentType)) {
    return Response.json({ error: 'Usá una imagen PNG, JPG o WEBP.' }, { status: 422 })
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_LOGO_BYTES) {
    return Response.json({ error: 'El logo debe pesar hasta 2 MB.' }, { status: 422 })
  }

  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/jpeg' ? 'jpg' : 'webp'
  const objectKey = `fiscal-templates/logos/${crypto.randomUUID()}.${extension}`

  try {
    const signedUrl = await createPresignedR2UploadUrl({ objectKey, contentType })
    return Response.json({
      signedUrl,
      publicUrl: buildR2PublicMediaUrl(objectKey),
      objectKey,
      contentType,
      maxSizeBytes: MAX_LOGO_BYTES,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[admin/fiscal/template/logo] presign failed', error instanceof Error ? error.name : 'UnknownError')
    return Response.json({ error: 'No se pudo preparar la subida del logo.' }, { status: 500 })
  }
}
