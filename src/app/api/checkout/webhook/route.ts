import { MercadoPagoConfig, Payment } from 'mercadopago'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncOrderStatusAfterPayment } from '@/lib/orders-workflow'
import { revalidatePath } from 'next/cache'

function getMercadoPagoClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('MP_ACCESS_TOKEN no esta configurado.')
  }
  return new MercadoPagoConfig({ accessToken })
}

async function handleInstallmentPayment(installmentId: string, mpPaymentId: string, amount: number, currency: string) {
  const installment = await prisma.zapCreditInstallment.findUnique({
    where: { id: installmentId },
    select: {
      id: true,
      status: true,
      amount: true,
      plan: {
        select: {
          id: true,
          status: true,
          orderId: true,
        },
      },
    },
  })

  if (!installment) {
    console.warn(`[webhook] Cuota ${installmentId} no encontrada`)
    return
  }

  if (currency !== 'ARS' || Math.round(installment.amount * 100) !== Math.round(amount * 100)) {
    console.warn('[webhook] Cuota con importe o moneda diferente', { installmentId, paymentId: mpPaymentId })
    return
  }

  if (installment.status === 'APPROVED') {
    // Idempotente: ya fue aprobada
    return
  }

  if (!['ACTIVE', 'APPROVED'].includes(installment.plan.status)) {
    console.warn(`[webhook] Plan ${installment.plan.id} no está en estado aceptable para pagar cuotas`)
    return
  }

  await prisma.$transaction(async (tx) => {
    // Crear submission automática con el pago de MP
    await tx.zapCreditPaymentSubmission.create({
      data: {
        installmentId,
        planId: installment.plan.id,
        paymentMethod: 'OTHER', // Pagado via MP
        amount: installment.amount,
        proofUrl: `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
        proofFileName: `mp-payment-${mpPaymentId}`,
        proofHash: mpPaymentId, // Usar el payment ID como hash idempotente
        notes: `Pagado automáticamente via MercadoPago (ID: ${mpPaymentId})`,
        status: 'APPROVED',
        reviewedAt: new Date(),
      },
    })

    // Aprobar la cuota
    await tx.zapCreditInstallment.update({
      where: { id: installmentId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        submittedAt: new Date(),
        reviewNotes: `Aprobado automáticamente via MercadoPago (ID: ${mpPaymentId})`,
      },
    })
  })

  // Revalidar vistas
  revalidatePath('/perfil/créditos')
  revalidatePath(`/perfil/créditos/${installment.plan.id}`)
  revalidatePath('/admin/créditos')
  revalidatePath(`/admin/créditos/${installment.plan.id}`)
  revalidatePath(`/admin/ordenes/${installment.plan.orderId}`)
}

async function handleOrderPayment(orderId: string, paymentId: string, amount: number, currency: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      paymentType: true,
      total: true,
      zapCreditPlan: { select: { downPaymentAmount: true } },
    },
  })
  if (!order) {
    console.warn('[webhook] Orden externa no encontrada', { orderId, paymentId })
    return
  }

  const expectedAmount = order.paymentType === 'ZAP_CREDIT'
    ? order.zapCreditPlan?.downPaymentAmount
    : order.paymentType === 'MERCADOPAGO'
      ? order.total
      : null
  if (expectedAmount === null || expectedAmount === undefined || currency !== 'ARS' ||
      Math.round(expectedAmount * 100) !== Math.round(amount * 100)) {
    console.warn('[webhook] Pago con importe, moneda o medio diferente', { orderId, paymentId })
    return
  }

  await syncOrderStatusAfterPayment(orderId, paymentId)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.type === 'payment' && body.data?.id) {
      const client = getMercadoPagoClient()
      const payment = await new Payment(client).get({ id: body.data.id })

      if (payment.status === 'approved' && payment.external_reference) {
        const ref = payment.external_reference

        if (ref.startsWith('installment:')) {
          // Pago de cuota ZAP Credit via MercadoPago
          const installmentId = ref.slice('installment:'.length)
          await handleInstallmentPayment(installmentId, String(payment.id), payment.transaction_amount, payment.currency_id)
        } else {
          // Pago de orden normal
          await handleOrderPayment(ref, String(payment.id), payment.transaction_amount, payment.currency_id)
        }
      }
    }

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[webhook] processing failed', error instanceof Error ? error.name : 'UnknownError')
    return Response.json({ ok: false }, { status: 500 })
  }
}
