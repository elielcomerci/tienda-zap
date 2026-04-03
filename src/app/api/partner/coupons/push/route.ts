import 'server-only'
import { NextResponse } from 'next/server'
import { authenticatePartnerRequest, refreshPartnerBranding } from '@/lib/partner-auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/partner/coupons/push
 *
 * Recibe desde kiosco24 un lote de cupones (+ PDF en base64 opcional)
 * y los almacena en R2 bajo partner-coupons/{branchId}/{promotionId}/.
 * Crea una Order en tienda.zap vinculada al PartnerAccount.
 *
 * Body:
 * {
 *   promotionId: string,
 *   branchId: string,          // Branch.id de kiosco24
 *   branding: { branchName, logoUrl?, primaryColor? },
 *   coupons: Array<{ code: string, expiresAt: string }>,
 *   pdfUrl?: string,           // URL en R2 generada por Kiosco24
 *   filename?: string,
 *   orderNotes?: string,
 * }
 */
export async function POST(req: Request) {
  const auth = await authenticatePartnerRequest(req)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { partnerAccount } = auth

  let body: {
    promotionId?: unknown
    branchId?: unknown
    branding?: { branchName?: unknown; logoUrl?: unknown; primaryColor?: unknown }
    coupons?: unknown[]
    pdfUrl?: unknown
    filename?: unknown
    orderNotes?: unknown
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 })
  }

  const promotionId = typeof body.promotionId === 'string' ? body.promotionId : null
  const coupons = Array.isArray(body.coupons) ? body.coupons : []
  const pdfUrl = typeof body.pdfUrl === 'string' ? body.pdfUrl : null
  const filename = typeof body.filename === 'string' ? body.filename : `cupones-${Date.now()}.pdf`
  const orderNotes = typeof body.orderNotes === 'string' ? body.orderNotes : null

  if (!promotionId) {
    return NextResponse.json({ error: 'promotionId es requerido.' }, { status: 400 })
  }
  if (coupons.length === 0) {
    return NextResponse.json({ error: 'coupons no puede estar vacío.' }, { status: 400 })
  }

  // Actualizar branding cacheado si viene con más info
  if (body.branding) {
    await refreshPartnerBranding(partnerAccount.id, {
      logoUrl: typeof body.branding.logoUrl === 'string' ? body.branding.logoUrl : undefined,
      primaryColor: typeof body.branding.primaryColor === 'string' ? body.branding.primaryColor : undefined,
      kiosco24BranchName:
        typeof body.branding.branchName === 'string' ? body.branding.branchName : undefined,
    })
  }

  // El PDF ya fue subido por el frontend de kiosco24 a su cuenta R2.
  // Solo guardamos el link en los detalles de la orden.
  // En el futuro puede ser un productId configurable; por ahora creamos la orden
  // con total 0 para que el admin la procese manualmente (o via ZAP Credit).
  // TODO: linkear a un Product real cuando esté cargado en el catálogo.

  const order = await prisma.order.create({
    data: {
      total: 0, // Se actualiza al confirmar el servicio
      status: 'PENDING',
      paymentType: 'CASH',
      partnerAccountId: partnerAccount.id,
      notes: [
        `Pedido de impresión de cupones desde kiosco24.`,
        `Sucursal: ${partnerAccount.kiosco24BranchName} (${partnerAccount.kiosco24BranchId})`,
        `Promoción ID: ${promotionId}`,
        `Cantidad de cupones: ${coupons.length}`,
        pdfUrl ? `URL del PDF para impresión: ${pdfUrl}` : 'Sin PDF adjunto.',
        orderNotes ? `Nota del cliente: ${orderNotes}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    },
  })

  return NextResponse.json(
    {
      success: true,
      orderId: order.id,
      couponCount: coupons.length,
      fileUrl: pdfUrl,
      // El cliente puede usar esta URL para ver / pagar su pedido en tienda.zap
      orderUrl: `${process.env.NEXTAUTH_URL ?? 'https://tienda.zap.com.ar'}/admin/orders/${order.id}`,
      message: `Pedido creado exitosamente. ${pdfUrl ? 'Tu PDF se procesó correctamente.' : ''} Un operador confirmará los detalles y el precio pronto.`,
    },
    { status: 201 }
  )
}
