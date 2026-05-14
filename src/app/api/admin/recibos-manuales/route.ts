import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createReceipt } from '@/lib/receipt-service'
import { createOrderPublicAccessToken, hashOrderPublicAccessToken } from '@/lib/order-access'

const manualReceiptSchema = z.object({
  customerName: z.string().min(1, 'El nombre es requerido'),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  customerDocumentId: z.string().optional(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingProvince: z.string().optional(),
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingProvince: z.string().optional(),
  paymentType: z.enum(['CASH', 'TRANSFER', 'MERCADOPAGO', 'ZAP_CREDIT']),
  paymentAmount: z.number().optional(),
  orderStatus: z.enum(['PENDING', 'PROCESSING', 'READY', 'DELIVERED']).default('DELIVERED'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().optional(), // Si no viene, es un ítem manual
      customName: z.string().optional(), // Descripción para ítem manual
      quantity: z.number().min(1),
      unitPrice: z.number().min(0),
    })
  ).min(1, 'Debe incluir al menos un ítem'),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const data = manualReceiptSchema.parse(body)

    // Ensure generic product exists for custom items
    let genericProductId: string | null = null
    const hasCustomItems = data.items.some(i => !i.productId)

    if (hasCustomItems) {
      // Find or create generic product
      const existingProduct = await prisma.product.findUnique({
        where: { slug: 'venta-manual' },
      })
      
      if (existingProduct) {
        genericProductId = existingProduct.id
      } else {
        // Find or create hidden category first
        let hiddenCat = await prisma.category.findUnique({ where: { slug: 'sistema' } })
        if (!hiddenCat) {
          hiddenCat = await prisma.category.create({
            data: { name: 'Sistema (Oculto)', slug: 'sistema', isService: true },
          })
        }
        
        const newGenericProd = await prisma.product.create({
          data: {
            name: 'Ítem Personalizado',
            slug: 'venta-manual',
            price: 0,
            categoryId: hiddenCat.id,
            active: false, // Keep it invisible
          },
        })
        genericProductId = newGenericProd.id
      }
    }

    // Prepare items
    const orderItems = data.items.map(item => {
      const isCustom = !item.productId
      return {
        productId: isCustom ? genericProductId! : item.productId!,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: isCustom ? item.customName : undefined, // Store custom name in notes
        isService: isCustom,
      }
    })

    const total = orderItems.reduce((acc, curr) => acc + curr.unitPrice * curr.quantity, 0)
    const publicAccessToken = createOrderPublicAccessToken()

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          publicAccessTokenHash: hashOrderPublicAccessToken(publicAccessToken),
          guestName: data.customerName,
          guestEmail: data.customerEmail || null,
          guestPhone: data.customerPhone || null,
          documentId: data.customerDocumentId || null,
          billingAddress: data.billingAddress || null,
          billingCity: data.billingCity || null,
          billingProvince: data.billingProvince || null,
          shippingAddress: data.shippingAddress || null,
          shippingCity: data.shippingCity || null,
          shippingProvince: data.shippingProvince || null,
          status: data.orderStatus,
          paymentType: data.paymentType,
          subtotal: total,
          discountTotal: 0,
          total: total,
          notes: data.notes || 'Venta Manual desde Admin',
          items: {
            create: orderItems,
          },
        },
      })

      // Log creation
      await tx.orderEvent.create({
        data: { orderId: createdOrder.id, status: data.orderStatus, note: 'Venta manual registrada desde administrador' },
      })

      return createdOrder
    })

    // Create receipt
    const receipt = await createReceipt({
      orderId: order.id,
      amount: data.paymentAmount !== undefined ? data.paymentAmount : total,
      concept: data.notes || 'Recibo por Venta Manual',
    })

    return NextResponse.json({
      orderId: order.id,
      receiptUrl: receipt.pdfUrl,
      orderCode: `ORD-${order.id.slice(-8).toUpperCase()}`,
    })

  } catch (error: any) {
    console.error('Error creating manual receipt:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    )
  }
}
