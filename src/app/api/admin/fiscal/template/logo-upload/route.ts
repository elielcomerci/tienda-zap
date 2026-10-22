import { PutObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/auth'
import { buildR2PublicMediaUrl, getR2BucketName, getR2Client } from '@/lib/r2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

function matchesImageSignature(bytes: Uint8Array, type: string) {
  if (type === 'image/png') return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  return false
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: 'Subí el logo como archivo.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) return Response.json({ error: 'Falta el archivo de logo.' }, { status: 422 })
  if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: 'Usá una imagen PNG, JPG o WEBP.' }, { status: 422 })
  if (file.size <= 0 || file.size > MAX_LOGO_BYTES) return Response.json({ error: 'El logo debe pesar hasta 2 MB.' }, { status: 422 })

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!matchesImageSignature(bytes, file.type)) {
    return Response.json({ error: 'El contenido del archivo no coincide con el formato declarado.' }, { status: 422 })
  }

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp'
  const objectKey = `fiscal-templates/logos/${crypto.randomUUID()}.${extension}`
  try {
    await getR2Client().send(new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: objectKey,
      Body: Buffer.from(bytes),
      ContentType: file.type,
      ContentLength: file.size,
      CacheControl: 'public, max-age=31536000, immutable',
    }))
    return Response.json({
      publicUrl: buildR2PublicMediaUrl(objectKey),
      objectKey,
      contentType: file.type,
      sizeBytes: file.size,
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[admin/fiscal/template/logo] upload failed', error instanceof Error ? error.name : 'UnknownError')
    return Response.json({ error: 'No se pudo subir el logo al CDN.' }, { status: 500 })
  }
}
