import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createCouponSheetPdf } from '@/lib/coupon-card-pdf'

function safeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await params
  const promotion = await prisma.promotion.findUnique({
    where: { id },
    select: {
      name: true,
      coupons: {
        orderBy: { createdAt: 'desc' },
        select: {
          code: true,
          recipientName: true,
          recipientBusiness: true,
          batchName: true,
          qrPayload: true,
          metadata: true,
          expiresAt: true,
          usesLeft: true,
          promotion: {
            select: {
              qrBaseUrl: true,
              name: true,
              discountKind: true,
              discountValue: true,
              welcomeLogoUrl: true,
              audienceLabel: true,
              welcomeMessage: true,
              welcomeConditions: true,
              maxUses: true,
              perUserLimit: true,
            },
          },
        },
      },
    },
  })

  if (!promotion) {
    return new Response('Promotion not found', { status: 404 })
  }

  if (promotion.coupons.length === 0) {
    return new Response('Promotion has no coupons', { status: 404 })
  }

  const fallbackBaseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`
  const pdf = await createCouponSheetPdf(promotion.coupons, fallbackBaseUrl)
  const filename = safeFilename(promotion.name) || 'cupones-zap'

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'no-store, max-age=0',
      'Content-Disposition': `attachment; filename="${filename}-pliego-cupones.pdf"`,
    },
  })
}
