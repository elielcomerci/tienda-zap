import {
  CopyObjectCommand,
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

// El bucket privado se configura por separado para aislar propuestas y archivos nuevos.
// Los ClientWorkFile históricos sin bucketName siguen usando R2_BUCKET_NAME.
export function getR2PrivateBucketName() {
  return getRequiredEnv('R2_PRIVATE_BUCKET_NAME')
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
  bucketName?: string
}) {
  const command = new PutObjectCommand({
    Bucket: params.bucketName || getR2BucketName(),
    Key: params.objectKey,
    ContentType: params.contentType,
  })

  return getSignedUrl(getR2Client(), command, {
    expiresIn: R2_UPLOAD_URL_TTL_SECONDS,
  })
}

export function getR2PublicMediaBaseUrl() {
  return (
    process.env.R2_PUBLIC_MEDIA_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_MEDIA_URL ||
    'https://media.zap.com.ar'
  ).replace(/\/+$/, '')
}

export function buildR2PublicMediaUrl(objectKey: string) {
  const cleanKey = objectKey.replace(/^\/+/, '')
  return `${getR2PublicMediaBaseUrl()}/${cleanKey}`
}

export async function createPresignedR2DownloadUrl(params: {
  objectKey: string
  fileName?: string | null
  bucketName?: string
}) {
  const command = new GetObjectCommand({
    Bucket: params.bucketName || getR2BucketName(),
    Key: params.objectKey,
    ResponseContentDisposition: params.fileName
      ? `attachment; filename="${sanitizeFileName(params.fileName)}"`
      : undefined,
  })

  return getSignedUrl(getR2Client(), command, {
    expiresIn: R2_DOWNLOAD_URL_TTL_SECONDS,
  })
}

export async function deleteR2Object(objectKey: string, bucketName?: string) {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: bucketName || getR2BucketName(),
      Key: objectKey,
    })
  )
}

export async function getR2ObjectMetadata(objectKey: string, bucketName?: string) {
  return getR2Client().send(
    new HeadObjectCommand({
      Bucket: bucketName || getR2BucketName(),
      Key: objectKey,
    })
  )
}

export async function createPresignedR2InlineUrl(params: {
  objectKey: string
  contentType: string
  bucketName?: string
}) {
  const command = new GetObjectCommand({
    Bucket: params.bucketName || getR2BucketName(),
    Key: params.objectKey,
    ResponseContentDisposition: 'inline',
    ResponseContentType: params.contentType,
  })
  return getSignedUrl(getR2Client(), command, {
    expiresIn: R2_DOWNLOAD_URL_TTL_SECONDS,
  })
}

export async function copyR2Object(sourceKey: string, destinationKey: string, bucketName: string) {
  const encodedSource = sourceKey.split('/').map(encodeURIComponent).join('/')
  await getR2Client().send(new CopyObjectCommand({
    Bucket: bucketName,
    Key: destinationKey,
    CopySource: `${bucketName}/${encodedSource}`,
    MetadataDirective: 'COPY',
  }))
}
