import { getR2BucketName, getR2Client } from '@/lib/r2'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string[] } }
) {
  try {
    const objectKey = params.key.join('/')
    
    const command = new GetObjectCommand({
      Bucket: getR2BucketName(),
      Key: objectKey,
    })

    const response = await getR2Client().send(command)
    
    // Convert Web ReadableStream/Node stream
    return new NextResponse(response.Body as any, {
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: any) {
    console.error('Error fetching R2 object:', error)
    return new NextResponse('Not found', { status: 404 })
  }
}
