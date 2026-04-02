import { MercadoPagoConfig, Preference } from 'mercadopago'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

function getMPClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN no configurado.')
  return new MercadoPagoConfig({ accessToken })
}

/**
 * POST /api/creditos/cuotas/[installmentId]/mp-payment
 *
 * Genera (o recupera) un link de pago MercadoPago para el importe exacto
 * de una cuota de Crédito ZAP. El external_reference usa el prefijo
 * "installment:" para que el webhook los distinga de las órdenes normales.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ installmentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Inicia sesion para pagar cuotas.' }, { status: 401 })
    }

    const { installmentId } = await params

    const installment = await prisma.zapCreditInstallment.findFirst({
      where: {
        id: installmentId,
        plan: {
          order: { userId: session.user.id },
        },
      },
      select: {
        id: true,
        status: true,
        amount: true,
        sequence: true,
        mpPreferenceId: true,
        plan: {
          select: {
            id: true,
            status: true,
            orderId: true,
            order: {
              select: { guestEmail: true, user: { select: { email: true } } },
            },
          },
        },
      },
    })

    if (!installment) {
      return Response.json({ error: 'Cuota no encontrada.' }, { status: 404 })
    }

    if (!['ACTIVE', 'APPROVED'].includes(installment.plan.status)) {
      return Response.json(
        { error: 'Este credito todavia no esta habilitado para pagos.' },
        { status: 400 }
      )
    }

    if (installment.status === 'APPROVED') {
      return Response.json({ error: 'Esta cuota ya fue pagada.' }, { status: 400 })
    }

    if (installment.status === 'SUBMITTED') {
      return Response.json(
        { error: 'Ya hay un comprobante de esta cuota en revision.' },
        { status: 400 }
      )
    }

    const client = getMPClient()
    const preferenceApi = new Preference(client)

    const baseUrl = req.nextUrl.origin
    const successUrl = new URL('/perfil/creditos', baseUrl)
    successUrl.searchParams.set('pago', 'ok')
    successUrl.searchParams.set('cuota', installment.sequence.toString())
    const failureUrl = new URL(`/perfil/creditos/${installment.plan.id}`, baseUrl)
    failureUrl.searchParams.set('error', 'pago_fallido')
    const pendingUrl = new URL(`/perfil/creditos/${installment.plan.id}`, baseUrl)
    pendingUrl.searchParams.set('pago', 'pendiente')

    const payerEmail =
      installment.plan.order.user?.email ??
      installment.plan.order.guestEmail ??
      undefined

    // Intentar reutilizar preferencia existente
    if (installment.mpPreferenceId) {
      try {
        const existing = await preferenceApi.get({ preferenceId: installment.mpPreferenceId })
        if (existing?.init_point) {
          return Response.json({ initPoint: existing.init_point })
        }
      } catch {
        // Preferencia expirada — crear una nueva
      }
    }

    const preference = await preferenceApi.create({
      body: {
        items: [
          {
            id: installmentId,
            title: `Credito ZAP — Cuota #${installment.sequence}`,
            quantity: 1,
            unit_price: installment.amount,
            currency_id: 'ARS',
          },
        ],
        payer: payerEmail ? { email: payerEmail } : undefined,
        external_reference: `installment:${installmentId}`,
        back_urls: {
          success: successUrl.toString(),
          failure: failureUrl.toString(),
          pending: pendingUrl.toString(),
        },
        notification_url: new URL('/api/checkout/webhook', baseUrl).toString(),
        auto_return: 'approved',
      },
    })

    // Guardar preferenceId para reutilizar si el usuario vuelve
    await prisma.zapCreditInstallment.update({
      where: { id: installmentId },
      data: { mpPreferenceId: preference.id },
    })

    revalidatePath(`/perfil/creditos/${installment.plan.id}`)

    return Response.json({ initPoint: preference.init_point })
  } catch (error: any) {
    console.error('MP installment payment error:', error)
    return Response.json(
      { error: error.message || 'Error al generar el link de pago.' },
      { status: 500 }
    )
  }
}
