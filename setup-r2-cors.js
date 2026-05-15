const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3')

async function setupCors() {
  const bucketName = process.env.R2_BUCKET_NAME
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!bucketName || !accountId || !accessKeyId || !secretAccessKey) {
    console.error('Faltan variables de entorno R2')
    process.exit(1)
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  const command = new PutBucketCorsCommand({
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedOrigins: ['*'],
          ExposeHeaders: [],
          MaxAgeSeconds: 3000,
        },
      ],
    },
  })

  try {
    await client.send(command)
    console.log('✅ CORS configurado exitosamente en el bucket R2:', bucketName)
  } catch (error) {
    console.error('❌ Error configurando CORS:', error)
  }
}

setupCors()
