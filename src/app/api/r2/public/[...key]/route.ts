import { getR2BucketName, getR2Client } from '@/lib/r2'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params
    const objectKey = key.join('/')

    // Client-work files are private and only served through authorized signed URLs.
    if (objectKey.startsWith('client-files/') || objectKey.startsWith('client-file-uploads/')) {
      return new NextResponse('Not found', { status: 404 })
    }

    const command = new GetObjectCommand({ Bucket: getR2BucketName(), Key: objectKey })
    const response = await getR2Client().send(command)
    return new NextResponse(response.Body as any, {
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error: any) {
    console.error('Error fetching R2 object:', error)
    return new NextResponse('Not found', { status: 404 })
  }
}
