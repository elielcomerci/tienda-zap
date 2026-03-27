import { NextRequest } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType } = await req.json()

    if (!filename || !contentType) {
      return Response.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // Configuración del cliente R2 compatible con S3
    const S3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })

    // Generar nombre de archivo único para evitar colisiones
    const uniqueId = crypto.randomUUID()
    const extension = filename.split('.').pop()
    const objectKey = `print-files/${uniqueId}.${extension}`

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: objectKey,
      ContentType: contentType,
    })

    // La URL firmada expira en 5 minutos
    const signedUrl = await getSignedUrl(S3, command, { expiresIn: 300 })

    // Construir la URL del archivo final
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${objectKey}`

    return Response.json({ signedUrl, publicUrl, objectKey })
  } catch (error: any) {
    console.error('Error generating Presigned URL:', error)
    return Response.json({ error: 'Error al generar URL de subida' }, { status: 500 })
  }
}
