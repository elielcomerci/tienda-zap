import 'server-only'

import { put } from '@vercel/blob'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getOrderDisplayCode } from '@/lib/orders-workflow'
import {
  generateOrderReceiptPdf,
  type ReceiptOrderData,
  type ReceiptOptions,
} from '@/lib/receipt-pdf'

// ─── Helpers ───

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }
  return session
}

function buildReceiptCode(sequenceNumber: number) {
  return `REC-${String(sequenceNumber).padStart(4, '0')}`
}

// ─── Order data for PDF rendering ───

const receiptOrderInclude = {
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
}

function buildReceiptOrderData(order: any): ReceiptOrderData {
  return {
    orderId: order.id,
    orderCode: getOrderDisplayCode(order.id),
    createdAt: order.createdAt,
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
    items: order.items.map((item: any) => ({
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      options:
        item.selectedOptions.length > 0
          ? item.selectedOptions.map((opt: any) => opt.valueName).join(' · ')
          : undefined,
    })),
    subtotal: order.subtotal ?? order.total,
    discountTotal: order.discountTotal,
    total: order.total,
    couponCode: order.couponCode,
    paymentType: order.paymentType,
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
}

// ─── Public API ───

export async function createReceipt(params: {
  orderId: string
  installmentId?: string
  amount?: number
  concept?: string
}) {
  const session = await requireAdmin()
  const generatedByUserId = session.user!.id!

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: receiptOrderInclude,
  })

  if (!order) throw new Error('Orden no encontrada.')

  const amount = params.amount ?? order.total
  if (amount <= 0 || amount > order.total) {
    throw new Error('El monto del recibo debe ser mayor a 0 y no superar el total de la orden.')
  }

  // Next sequence number for this order
  const lastReceipt = await prisma.receipt.findFirst({
    where: { orderId: params.orderId },
    orderBy: { sequenceNumber: 'desc' },
    select: { sequenceNumber: true },
  })
  const sequenceNumber = (lastReceipt?.sequenceNumber ?? 0) + 1
  const receiptCode = buildReceiptCode(sequenceNumber)

  // Generate PDF
  const isPartialPayment = amount < order.total
  const receiptData = buildReceiptOrderData(order)
  const pdfOptions: ReceiptOptions = {}

  if (isPartialPayment) {
    pdfOptions.paymentAmount = amount
    if (params.concept) pdfOptions.paymentNote = params.concept
  }

  const pdfBuffer = generateOrderReceiptPdf(receiptData, pdfOptions)

  // Upload to Vercel Blob
  const pdfFileName = `${receiptCode}-${order.id.slice(-6)}.pdf`
  const blob = await put(`recibos/${order.id}/${pdfFileName}`, Buffer.from(pdfBuffer), {
    access: 'public',
    contentType: 'application/pdf',
  })

  // Persist
  const receipt = await prisma.receipt.create({
    data: {
      orderId: params.orderId,
      installmentId: params.installmentId ?? null,
      sequenceNumber,
      receiptCode,
      amount,
      concept: params.concept ?? null,
      paymentMethod: order.paymentType,
      pdfUrl: blob.url,
      pdfFileName,
      generatedByUserId,
    },
  })

  return receipt
}

export async function voidReceipt(params: { receiptId: string; reason: string }) {
  await requireAdmin()

  const receipt = await prisma.receipt.findUnique({
    where: { id: params.receiptId },
  })

  if (!receipt) throw new Error('Recibo no encontrado.')
  if (receipt.status === 'VOIDED') throw new Error('Este recibo ya fue anulado.')

  return prisma.receipt.update({
    where: { id: params.receiptId },
    data: {
      status: 'VOIDED',
      voidedAt: new Date(),
      voidedReason: params.reason.trim() || 'Anulado por el administrador',
    },
  })
}

export async function editReceipt(params: {
  receiptId: string
  amount: number
  concept?: string
}) {
  const session = await requireAdmin()

  const original = await prisma.receipt.findUnique({
    where: { id: params.receiptId },
  })

  if (!original) throw new Error('Recibo no encontrado.')
  if (original.status === 'VOIDED') throw new Error('No se puede editar un recibo anulado.')

  // Create the replacement first
  const replacement = await createReceipt({
    orderId: original.orderId,
    installmentId: original.installmentId ?? undefined,
    amount: params.amount,
    concept: params.concept,
  })

  // Now void the original, linking to the replacement
  const voided = await prisma.receipt.update({
    where: { id: params.receiptId },
    data: {
      status: 'VOIDED',
      voidedAt: new Date(),
      voidedReason: `Reemplazado por ${replacement.receiptCode}`,
      replacedByReceiptId: replacement.id,
    },
  })

  return { voided, replacement }
}

export async function getOrderReceipts(orderId: string) {
  await requireAdmin()

  return prisma.receipt.findMany({
    where: { orderId },
    orderBy: { sequenceNumber: 'asc' },
  })
}

export async function getCustomerOrderReceipts(orderId: string, userId: string) {
  return prisma.receipt.findMany({
    where: {
      orderId,
      status: 'ACTIVE',
      order: { userId },
    },
    orderBy: { sequenceNumber: 'asc' },
  })
}
