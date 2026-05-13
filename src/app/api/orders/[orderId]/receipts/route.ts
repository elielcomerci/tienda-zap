import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getCustomerOrderReceipts } from '@/lib/receipt-service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { orderId } = await params
    const receipts = await getCustomerOrderReceipts(orderId, session.user.id)

    return Response.json(receipts)
  } catch (error: any) {
    return Response.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
