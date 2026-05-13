import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getOrderDisplayCode } from '@/lib/orders-workflow'
import { generateOrderReceiptPdf, type ReceiptOrderData, type ReceiptOptions } from '@/lib/receipt-pdf'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return Response.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { orderId } = await params

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
            selectedOptions: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            documentId: true,
            billingAddress: true,
            billingCity: true,
            billingProvince: true,
            shippingAddress: true,
            shippingCity: true,
            shippingProvince: true,
            shippingPostalCode: true,
          },
        },
        zapCreditPlan: true,
      },
    })

    if (!order) {
      return Response.json({ error: 'Orden no encontrada.' }, { status: 404 })
    }

    // Build receipt data, preferring order-level fields, falling back to user profile
    const receiptData: ReceiptOrderData = {
      orderId: order.id,
      orderCode: getOrderDisplayCode(order.id),
      createdAt: order.createdAt,
      // Customer: order-level guest fields take priority, then user profile
      customerName: order.guestName || order.user?.name || null,
      customerEmail: order.guestEmail || order.user?.email || null,
      customerPhone: order.guestPhone || order.user?.phone || null,
      customerDocumentId: order.documentId || order.user?.documentId || null,
      billingAddress: order.billingAddress || order.user?.billingAddress || null,
      billingCity: order.billingCity || order.user?.billingCity || null,
      billingProvince: order.billingProvince || order.user?.billingProvince || null,
      shippingAddress: order.shippingAddress || order.user?.shippingAddress || null,
      shippingCity: order.shippingCity || order.user?.shippingCity || null,
      shippingProvince: order.shippingProvince || order.user?.shippingProvince || null,
      shippingPostalCode: order.shippingPostalCode || order.user?.shippingPostalCode || null,
      // Items
      items: order.items.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        options:
          item.selectedOptions.length > 0
            ? item.selectedOptions.map((opt) => opt.valueName).join(' · ')
            : undefined,
      })),
      subtotal: order.subtotal ?? order.total,
      discountTotal: order.discountTotal,
      total: order.total,
      couponCode: order.couponCode,
      paymentType: order.paymentType,
      // Credit plan
      creditPlan: order.zapCreditPlan
        ? {
            installments: order.zapCreditPlan.installments,
            paymentFrequency: order.zapCreditPlan.paymentFrequency,
            ratePercent: order.zapCreditPlan.ratePercent,
            downPaymentAmount: order.zapCreditPlan.downPaymentAmount,
            downPaymentPercent: order.zapCreditPlan.downPaymentPercent,
            financedAmount: order.zapCreditPlan.financedAmount,
            installmentAmount: order.zapCreditPlan.installmentAmount,
            totalRepayable: order.zapCreditPlan.totalRepayable,
          }
        : null,
    }

    // Parse optional query params for partial payments
    const searchParams = req.nextUrl.searchParams
    const receiptOptions: ReceiptOptions = {}

    const rawAmount = searchParams.get('paymentAmount')
    if (rawAmount) {
      const parsed = parseFloat(rawAmount)
      if (!isNaN(parsed) && parsed > 0 && parsed <= order.total) {
        receiptOptions.paymentAmount = parsed
      }
    }

    const paymentNote = searchParams.get('paymentNote')
    if (paymentNote) {
      receiptOptions.paymentNote = paymentNote
    }

    const rawSeq = searchParams.get('installmentSeq')
    if (rawSeq) {
      const parsed = parseInt(rawSeq, 10)
      if (!isNaN(parsed) && parsed > 0) {
        receiptOptions.installmentSeq = parsed
      }
    }

    const pdfBuffer = generateOrderReceiptPdf(receiptData, receiptOptions)
    const fileName = `recibo-${receiptData.orderCode}-${Date.now()}.pdf`

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Receipt generation error:', error)
    return Response.json({ error: 'Error al generar el recibo.' }, { status: 500 })
  }
}
