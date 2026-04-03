import 'server-only'
import { NextResponse } from 'next/server'
import { authenticatePartnerRequest } from '@/lib/partner-auth'
import { prisma } from '@/lib/prisma'

export type AdFormat = 'text_only' | 'banner_small' | 'banner_large'
export type AdPromoDiscountKind = 'PERCENTAGE' | 'FIXED_PRICE'

export interface AdPayload {
  id: string
  zone: string
  format: AdFormat
  content: {
    title: string
    description?: string
    ctaText?: string
    imageUrl?: string
    backgroundColor?: string
    textColor?: string
  }
  action?: {
    type: 'open_url' | 'one_click_order' | 'informational'
    url?: string
    productId?: string
    productName?: string
    productSlug?: string
  }
  promo?: {
    type: string
    discountKind: AdPromoDiscountKind
    discountValue: number
  }
}

/**
 * GET /api/partner/ads?zone=xxx
 *
 * AdSense B2B para Kiosco24.
 * Devuelve la campaña activa más reciente para la zona indicada, o null.
 */
export async function GET(req: Request) {
  const auth = await authenticatePartnerRequest(req)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const zone = searchParams.get('zone')

  if (!zone) {
    return NextResponse.json({ data: null })
  }

  try {
    const campaign = await prisma.partnerCampaign.findFirst({
      where: { zone, active: true },
      orderBy: { updatedAt: 'desc' },
    })

    if (!campaign) {
      return NextResponse.json({ data: null })
    }

    // Enriquecer con datos del producto si es one_click_order
    let productName: string | undefined
    let productSlug: string | undefined

    if (campaign.actionType === 'one_click_order' && campaign.productId) {
      const product = await prisma.product.findUnique({
        where: { id: campaign.productId },
        select: { name: true, slug: true },
      })
      productName = product?.name
      productSlug = product?.slug
    }

    const ad: AdPayload = {
      id: campaign.id,
      zone: campaign.zone,
      format: campaign.format as AdFormat,
      content: {
        title: campaign.title,
        description: campaign.description ?? undefined,
        ctaText: campaign.ctaText ?? undefined,
        imageUrl: campaign.imageUrl ?? undefined,
        backgroundColor: campaign.backgroundColor ?? undefined,
        textColor: campaign.textColor ?? undefined,
      },
      ...(campaign.actionType && {
        action: {
          type: campaign.actionType as AdPayload['action']['type'],
          url: campaign.actionUrl ?? undefined,
          productId: campaign.productId ?? undefined,
          productName,
          productSlug,
        },
      }),
    }

    return NextResponse.json({ data: ad })
  } catch (err) {
    console.error('[partner/ads] Error fetching campaign:', err)
    return NextResponse.json({ data: null })
  }
}
