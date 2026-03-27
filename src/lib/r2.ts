import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  R2_DOWNLOAD_URL_TTL_SECONDS,
  R2_UPLOAD_URL_TTL_SECONDS,
  sanitizeFileName,
} from '@/lib/order-files'

let cachedR2Client: S3Client | null = null

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`)
  }
  return value
}

export function getR2BucketName() {
  return getRequiredEnv('R2_BUCKET_NAME')
}

export function getR2Client() {
  if (cachedR2Client) return cachedR2Client

  cachedR2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${getRequiredEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getRequiredEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: getRequiredEnv('R2_SECRET_ACCESS_KEY'),
    },
  })

  return cachedR2Client
}

export async function createPresignedR2UploadUrl(params: {
  objectKey: string
  contentType: string
}) {
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: params.objectKey,
    ContentType: params.contentType,
  })

  return getSignedUrl(getR2Client(), command, {
    expiresIn: R2_UPLOAD_URL_TTL_SECONDS,
  })
}

export async function createPresignedR2DownloadUrl(params: {
  objectKey: string
  fileName?: string | null
}) {
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: params.objectKey,
    ResponseContentDisposition: params.fileName
      ? `attachment; filename="${sanitizeFileName(params.fileName)}"`
      : undefined,
  })

  return getSignedUrl(getR2Client(), command, {
    expiresIn: R2_DOWNLOAD_URL_TTL_SECONDS,
  })
}

export async function deleteR2Object(objectKey: string) {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getR2BucketName(),
      Key: objectKey,
    })
  )
}

export async function getR2ObjectMetadata(objectKey: string) {
  return getR2Client().send(
    new HeadObjectCommand({
      Bucket: getR2BucketName(),
      Key: objectKey,
    })
  )
}
