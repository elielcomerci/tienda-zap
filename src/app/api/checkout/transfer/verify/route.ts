import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { findAccessibleOrder } from '@/lib/order-access'
import { prisma } from '@/lib/prisma'
import { findMatchingMercadoPagoTransfer } from '@/lib/mercadopago-transfer-reconciliation'
import { syncOrderStatusAfterPayment } from '@/lib/orders-workflow'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  orderId: z.string().min(1).max(128),
  accessToken: z.string().max(256).optional(),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  referenceSuffix: z.string().regex(/^\d{5,6}$/),
})

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof requestSchema>
  try {
    body = requestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Completá una fecha y los últimos 5 o 6 dígitos de la operación.' }, { status: 400 })
  }

  const order = await findAccessibleOrder(body.orderId, body.accessToken, {
    select: {
      id: true,
      status: true,
      paymentType: true,
      total: true,
      createdAt: true,
      documentId: true,
      transferPaymentReconciliation: {
        select: { mercadoPagoPaymentId: true, referenceSuffix: true },
      },
    },
  })
  if (!order) return NextResponse.json({ error: 'No encontramos el pedido o no tenés acceso.' }, { status: 404 })
  if (order.paymentType !== 'TRANSFER') return NextResponse.json({ error: 'Este pedido no es una transferencia por CVU.' }, { status: 409 })

  if (order.transferPaymentReconciliation) {
    const status = await syncOrderStatusAfterPayment(order.id, order.transferPaymentReconciliation.mercadoPagoPaymentId)
    return NextResponse.json({ verified: true, status })
  }
  if (order.status !== 'PENDING') return NextResponse.json({ error: 'El pedido ya no admite pagos.' }, { status: 409 })
  if (!order.documentId) return NextResponse.json({ error: 'Falta el DNI o CUIT informado al crear el pedido.' }, { status: 422 })

  const date = new Date(`${body.transferDate}T00:00:00-03:00`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== body.transferDate) return NextResponse.json({ error: 'La fecha ingresada no es válida.' }, { status: 400 })
  const maxPaymentDate = new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
  const dateEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000)
  const now = new Date()
  if (dateEnd <= order.createdAt || date > now || date > maxPaymentDate) {
    return NextResponse.json({ error: 'La transferencia debe haberse realizado dentro de los 7 días de creado el pedido.' }, { status: 422 })
  }

  try {
    const match = await findMatchingMercadoPagoTransfer({
      date: body.transferDate,
      referenceSuffix: body.referenceSuffix,
      amount: order.total,
      customerDocument: order.documentId,
      minDate: order.createdAt,
      maxDate: maxPaymentDate < now ? maxPaymentDate : now,
    })

    if (!match) {
      return NextResponse.json({
        verified: false,
        error: 'Todavía no encontramos una única transferencia aprobada que coincida. Revisá los datos o intentá de nuevo en unos minutos.',
      }, { status: 200 })
    }

    await prisma.$transaction(async (tx) => {
      const claimedOrder = await tx.order.updateMany({
        where: { id: order.id, status: 'PENDING', paymentType: 'TRANSFER' },
        data: { paymentId: match.paymentId },
      })
      if (claimedOrder.count !== 1) throw new Error('ORDER_ALREADY_PROCESSED')

      await tx.transferPaymentReconciliation.create({
        data: {
          orderId: order.id,
          mercadoPagoPaymentId: match.paymentId,
          transactionId: match.transactionId,
          referenceSuffix: body.referenceSuffix,
          transferDate: date,
        },
      })
    })

    const status = await syncOrderStatusAfterPayment(order.id, match.paymentId)
    return NextResponse.json({ verified: true, status })
  } catch (error) {
    if (isUniqueConflict(error)) {
      return NextResponse.json({ error: 'Esta transferencia ya se vinculó a otro pedido.' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'ORDER_ALREADY_PROCESSED') {
      return NextResponse.json({ error: 'El pedido fue actualizado mientras verificábamos el pago.' }, { status: 409 })
    }
    console.error('[checkout.transfer.verify]', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No pudimos verificar la transferencia ahora. Conservamos el pedido pendiente; intentá de nuevo.' }, { status: 502 })
  }
}
