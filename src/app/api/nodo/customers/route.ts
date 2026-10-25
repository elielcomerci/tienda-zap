import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount } from '@/lib/fiscal-account-access'
import { nodoCatalogErrorResponse } from '@/lib/nodo-catalog-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const customerSchema = z.object({
  name: z.string().trim().min(1).max(180),
  documentType: z.enum(['CUIT', 'CUIL', 'DNI', 'CONSUMIDOR_FINAL']).nullable().optional(),
  documentNumber: z.string().trim().max(20).nullable().optional(),
  vatCondition: z.string().trim().max(80).nullable().optional(),
  address: z.string().trim().max(240).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional().or(z.literal('')),
  phone: z.string().trim().max(40).nullable().optional(),
})

export async function GET(request: NextRequest) {
  const access = await resolveFiscalAccount(request, true)
  if ('response' in access) return access.response
  try {
    const customers = await prisma.fiscalSavedCustomer.findMany({
      where: { accountId: access.account.id },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    })
    return NextResponse.json({ customers }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nodoCatalogErrorResponse('customers', 'read', error) }
}

export async function POST(request: NextRequest) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  const parsed = customerSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Revisá los datos del cliente.', details: parsed.error.flatten() }, { status: 422 })
  try {
    const customer = await prisma.fiscalSavedCustomer.create({ data: { ...parsed.data, accountId: access.account.id } })
    return NextResponse.json({ customer }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nodoCatalogErrorResponse('customers', 'save', error) }
}

export async function PATCH(request: NextRequest) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta indicar el cliente.' }, { status: 400 })
  const parsed = customerSchema.partial().safeParse(await request.json().catch(() => null))
  if (!parsed.success || !parsed.data || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Revisá los datos del cliente.' }, { status: 422 })
  }
  try {
    const result = await prisma.fiscalSavedCustomer.updateMany({ where: { id, accountId: access.account.id }, data: parsed.data })
    if (result.count === 0) return NextResponse.json({ error: 'No se encontró el cliente.' }, { status: 404 })
    const customer = await prisma.fiscalSavedCustomer.findFirst({ where: { id, accountId: access.account.id } })
    return NextResponse.json({ customer }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nodoCatalogErrorResponse('customers', 'update', error) }
}

export async function DELETE(request: NextRequest) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta indicar el cliente.' }, { status: 400 })
  try {
    const result = await prisma.fiscalSavedCustomer.deleteMany({ where: { id, accountId: access.account.id } })
    if (result.count === 0) return NextResponse.json({ error: 'No se encontró el cliente.' }, { status: 404 })
    return NextResponse.json({ deleted: true })
  } catch (error) { return nodoCatalogErrorResponse('customers', 'delete', error) }
}
