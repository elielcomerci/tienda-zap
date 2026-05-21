import 'dotenv/config'
import { getR2BucketName, getR2Client } from '../src/lib/r2'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'

async function main() {
  const objectKey = 'promos/1778869132269-c21.png'
  console.log(`Downloading key: ${objectKey} from bucket: ${getR2BucketName()}...`)
  
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: objectKey,
  })

  const response = await getR2Client().send(command)
  if (!response.Body) {
    throw new Error('No body in response')
  }

  // Read response stream into buffer
  const chunks: Buffer[] = []
  const stream = response.Body as any
  
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  
  const buffer = Buffer.concat(chunks)
  
  const targetDir = 'C:\\Users\\eliel\\.gemini\\antigravity\\brain\\8a3a81af-2a95-4e43-9c08-14a8255dccd8'
  const outPath = path.join(targetDir, 'downloaded_c21_logo.png')
  fs.writeFileSync(outPath, buffer)
  
  console.log(`Successfully saved logo to: ${outPath}`)
}

main().catch(console.error)
