import 'server-only'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticatePartnerRequest } from '@/lib/partner-auth'

/**
 * GET /api/partner/products
 *
 * Devuelve el catálogo de servicios de tienda.zap disponibles para partners.
 * Solo productos de categorías marcadas como isService = true.
 * No requiere autenticación (catálogo público para partners).
 */
export async function GET(req: Request) {
  // Autenticación opcional — si viene con token, personalizamos la respuesta
  const auth = await authenticatePartnerRequest(req)
  const isAuthenticated = auth.ok

  const products = await prisma.product.findMany({
    where: {
      active: true,
      category: { isService: true },
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: {
        select: { id: true, price: true, options: { include: { optionValue: { include: { option: true } } } } },
        orderBy: { price: 'asc' },
      },
      options: { include: { values: true }, orderBy: { id: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const response = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    images: p.images,
    category: p.category,
    creditDownPaymentPercent: p.creditDownPaymentPercent,
    creditEligible: true, // todos los servicios son elegibles para ZAP Credit
    options: p.options,
    variants: p.variants.map((v) => ({
      id: v.id,
      price: v.price,
      label: v.options
        .map((o) => o.optionValue.value)
        .join(' / '),
    })),
  }))

  return NextResponse.json({
    products: response,
    ...(isAuthenticated && {
      _partner: { authenticated: true, branchName: auth.partnerAccount.kiosco24BranchName },
    }),
  })
}
