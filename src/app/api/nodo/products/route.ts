import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount } from '@/lib/fiscal-account-access'
import { nodoCatalogErrorResponse } from '@/lib/nodo-catalog-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const vatRates = [0, 2.5, 5, 10.5, 21, 27] as const
const productSchema = z.object({
  kind: z.enum(['PRODUCT', 'SERVICE']).default('PRODUCT'),
  description: z.string().trim().min(1).max(240),
  unit: z.string().trim().min(1).max(40),
  unitPrice: z.number().finite().min(0.01).max(999999999),
  vatRatePercent: z.number().refine(rate => vatRates.some(allowedRate => allowedRate === rate)).nullable().optional(),
})

export async function GET(request: NextRequest) {
  const access = await resolveFiscalAccount(request, true)
  if ('response' in access) return access.response
  try {
    const products = await prisma.fiscalSavedProduct.findMany({
      where: { accountId: access.account.id },
      orderBy: [{ description: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    })
    return NextResponse.json({ products: products.map(product => ({ ...product, unitPrice: product.unitPrice.toString(), vatRatePercent: product.vatRatePercent?.toString() ?? null })) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nodoCatalogErrorResponse('products', 'read', error) }
}

export async function POST(request: NextRequest) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  const parsed = productSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Revisá la descripción, el precio y el IVA del ítem.', details: parsed.error.flatten() }, { status: 422 })
  try {
    const product = await prisma.fiscalSavedProduct.create({
      data: { ...parsed.data, unitPrice: parsed.data.unitPrice.toFixed(2), vatRatePercent: parsed.data.vatRatePercent?.toString() ?? null, accountId: access.account.id },
    })
    return NextResponse.json({ product: { ...product, unitPrice: product.unitPrice.toString(), vatRatePercent: product.vatRatePercent?.toString() ?? null } }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nodoCatalogErrorResponse('products', 'save', error) }
}

export async function PATCH(request: NextRequest) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta indicar el ítem.' }, { status: 400 })
  const parsed = productSchema.partial().safeParse(await request.json().catch(() => null))
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) return NextResponse.json({ error: 'Revisá los datos del ítem.' }, { status: 422 })
  const data = {
    ...parsed.data,
    ...(parsed.data.unitPrice !== undefined ? { unitPrice: parsed.data.unitPrice.toFixed(2) } : {}),
    ...(parsed.data.vatRatePercent !== undefined ? { vatRatePercent: parsed.data.vatRatePercent?.toString() ?? null } : {}),
  }
  try {
    const result = await prisma.fiscalSavedProduct.updateMany({ where: { id, accountId: access.account.id }, data })
    if (result.count === 0) return NextResponse.json({ error: 'No se encontró el ítem.' }, { status: 404 })
    const product = await prisma.fiscalSavedProduct.findFirst({ where: { id, accountId: access.account.id } })
    return NextResponse.json({ product: product && { ...product, unitPrice: product.unitPrice.toString(), vatRatePercent: product.vatRatePercent?.toString() ?? null } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nodoCatalogErrorResponse('products', 'update', error) }
}

export async function DELETE(request: NextRequest) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta indicar el ítem.' }, { status: 400 })
  try {
    const result = await prisma.fiscalSavedProduct.deleteMany({ where: { id, accountId: access.account.id } })
    if (result.count === 0) return NextResponse.json({ error: 'No se encontró el ítem.' }, { status: 404 })
    return NextResponse.json({ deleted: true })
  } catch (error) { return nodoCatalogErrorResponse('products', 'delete', error) }
}
