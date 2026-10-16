import { PutObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/auth'
import { buildR2PublicMediaUrl, getR2BucketName, getR2Client } from '@/lib/r2'

export const runtime = 'nodejs'

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
} as const

export async function POST(request: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return Response.json({ error: 'Seleccioná una imagen para cargar.' }, { status: 400 })
    }

    const extension = ALLOWED_IMAGE_TYPES[file.type as keyof typeof ALLOWED_IMAGE_TYPES]
    if (!extension) {
      return Response.json({ error: 'Formato no permitido. Usá JPG, PNG, WebP, AVIF o GIF.' }, { status: 415 })
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE_BYTES) {
      return Response.json({ error: 'La imagen debe pesar menos de 10 MB.' }, { status: 413 })
    }

    const objectKey = `productos/${crypto.randomUUID()}.${extension}`
    await getR2Client().send(new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: objectKey,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
      CacheControl: 'public, max-age=31536000, immutable',
    }))

    return Response.json({ url: buildR2PublicMediaUrl(objectKey) }, { status: 201 })
  } catch (error) {
    console.error('Product image upload failed:', error)
    return Response.json({ error: 'No pudimos cargar la imagen. Revisá la configuración de medios e intentá de nuevo.' }, { status: 500 })
  }
}
