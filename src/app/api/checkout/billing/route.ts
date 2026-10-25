import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { findAccessibleOrder } from '@/lib/order-access'
import { prisma } from '@/lib/prisma'
import { isValidFiscalCuit } from '@/lib/fiscal-cuit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  orderId: z.string().min(1).max(128),
  accessToken: z.string().max(256).optional(),
  cuit: z.string().transform(value => value.replace(/\D/g, '')),
  name: z.string().trim().min(2).max(180),
  address: z.string().trim().min(3).max(180),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  voucherType: z.enum(['B', 'A', 'C']),
  vatCondition: z.union([z.literal(1), z.literal(4), z.literal(5), z.literal(6), z.literal(13), z.literal(15)]),
  vatConditionConfirmed: z.literal(true),
  serviceFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  serviceTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  padronName: z.string().trim().max(180).optional(),
})

export async function POST(request: NextRequest) {
  let input: z.infer<typeof schema>
  try { input = schema.parse(await request.json()) } catch { return NextResponse.json({ error: 'Completá todos los datos de facturación con valores válidos.' }, { status: 400 }) }
  if (!isValidFiscalCuit(input.cuit)) return NextResponse.json({ error: 'La CUIT no es válida.' }, { status: 422 })
  const order = await findAccessibleOrder(input.orderId, input.accessToken, { select: { id: true, status: true, items: { select: { isService: true } } } })
  if (!order) return NextResponse.json({ error: 'No encontramos el pedido o no tenés acceso.' }, { status: 404 })
  if (order.status !== 'DELIVERED') return NextResponse.json({ error: 'La factura se solicita cuando el pedido está entregado.' }, { status: 409 })
  const hasService = order.items.some(item => item.isService)
  if (hasService && (!input.serviceFrom || !input.serviceTo || !input.paymentDueDate)) return NextResponse.json({ error: 'Para facturar servicios, completá el período y el vencimiento de pago.' }, { status: 422 })
  const asDate = (value: string | undefined) => value ? new Date(`${value}T00:00:00.000Z`) : null
  const serviceFrom = asDate(input.serviceFrom)
  const serviceTo = asDate(input.serviceTo)
  const paymentDueDate = asDate(input.paymentDueDate)
  if ([serviceFrom, serviceTo, paymentDueDate].some((date, index) => date && (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== [input.serviceFrom, input.serviceTo, input.paymentDueDate][index])) || (serviceFrom && serviceTo && serviceFrom > serviceTo) || (serviceTo && paymentDueDate && serviceTo > paymentDueDate)) {
    return NextResponse.json({ error: 'Revisá el período del servicio y su vencimiento.' }, { status: 422 })
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { documentId: input.cuit, billingName: input.name, billingAddress: input.address, billingCity: input.city, billingProvince: input.province, billingVoucherType: input.voucherType, billingVatCondition: input.vatCondition, billingVatConfirmedAt: new Date(), billingServiceFrom: serviceFrom, billingServiceTo: serviceTo, billingPaymentDueDate: paymentDueDate },
  })
  return NextResponse.json({ saved: true, voucherType: input.voucherType })
}
