import { NextRequest } from 'next/server'
import {
  createReceipt,
  editReceipt,
  getOrderReceipts,
  voidReceipt,
} from '@/lib/receipt-service'

// GET — List all receipts for an order
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const receipts = await getOrderReceipts(orderId)
    return Response.json(receipts)
  } catch (error: any) {
    const status = error.message === 'No autorizado' ? 403 : 500
    return Response.json({ error: error.message }, { status })
  }
}

// POST — Create a new receipt
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const body = await req.json()

    const receipt = await createReceipt({
      orderId,
      amount: body.amount,
      concept: body.concept,
      installmentId: body.installmentId,
    })

    return Response.json({
      receiptId: receipt.id,
      receiptCode: receipt.receiptCode,
      pdfUrl: receipt.pdfUrl,
    })
  } catch (error: any) {
    const status = error.message === 'No autorizado' ? 403
      : error.message.includes('no encontrada') ? 404
      : 400
    return Response.json({ error: error.message }, { status })
  }
}

// PATCH — Void a receipt
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const body = await req.json()

    if (!body.receiptId || !body.reason) {
      return Response.json(
        { error: 'Faltan campos: receiptId y reason son requeridos.' },
        { status: 400 }
      )
    }

    const receipt = await voidReceipt({
      receiptId: body.receiptId,
      reason: body.reason,
    })

    return Response.json(receipt)
  } catch (error: any) {
    const status = error.message === 'No autorizado' ? 403
      : error.message.includes('no encontrado') ? 404
      : 400
    return Response.json({ error: error.message }, { status })
  }
}

// PUT — Edit a receipt (void original + create replacement)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const body = await req.json()

    if (!body.receiptId || typeof body.amount !== 'number') {
      return Response.json(
        { error: 'Faltan campos: receiptId y amount son requeridos.' },
        { status: 400 }
      )
    }

    const result = await editReceipt({
      receiptId: body.receiptId,
      amount: body.amount,
      concept: body.concept,
    })

    return Response.json(result)
  } catch (error: any) {
    const status = error.message === 'No autorizado' ? 403
      : error.message.includes('no encontrado') ? 404
      : 400
    return Response.json({ error: error.message }, { status })
  }
}
