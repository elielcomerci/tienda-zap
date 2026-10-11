import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import AccountSectionNav from '@/components/public/AccountSectionNav'
import { Download, ReceiptText } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Facturación — ZAP Tienda' }
const statusLabels: Record<string, string> = { PROCESSING: 'Procesando emisión', ISSUED: 'Emitida', FAILED: 'Emisión con problemas' }
const pdfLabels: Record<string, string> = { PENDING: 'Preparando PDF', READY: 'PDF disponible', FAILED: 'PDF pendiente de recuperar' }

export default async function PerfilFacturacionPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const invoices = await prisma.order.findMany({
    where: { userId: session.user.id, OR: [{ invoiceStatus: { not: null } }, { invoiceUrl: { not: null } }] },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, total: true, invoiceUrl: true, invoiceFileName: true, invoiceSource: true, invoiceStatus: true, invoicePdfStatus: true, invoiceVoucherType: true, invoicePointOfSale: true, invoiceVoucherNumber: true, invoiceCae: true, invoiceCaeExpiresAt: true, invoiceObjectKey: true },
  })
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div><p className="text-sm text-gray-500">Mi cuenta</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900"><ReceiptText size={24} className="text-[#ED164F]" /> Facturación</h1><p className="mt-1 text-sm text-gray-500">Comprobantes fiscales, estado de emisión y descargas.</p></div>
      <AccountSectionNav active="billing" />
      {invoices.length === 0 ? <div className="card p-10 text-center"><ReceiptText size={36} className="mx-auto mb-3 text-gray-200" /><h2 className="font-semibold text-gray-900">Todavía no tenés facturas</h2><p className="mt-2 text-sm text-gray-500">Cuando solicites una factura desde un pedido, vas a poder seguirla y descargarla desde acá.</p><Link href="/perfil/ordenes" className="mt-4 inline-flex text-sm font-semibold text-[#ED164F] hover:underline">Ver mis pedidos</Link></div> :
        <div className="space-y-3">{invoices.map(invoice => <article key={invoice.id} className="card space-y-3 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-gray-900">{invoice.invoiceVoucherType ? `Factura ${invoice.invoiceVoucherType}` : invoice.invoiceUrl ? 'Comprobante adjunto' : 'Factura solicitada'}</p><p className="mt-1 text-xs text-gray-500">Pedido #{invoice.id.slice(-8).toUpperCase()} · {new Date(invoice.createdAt).toLocaleDateString('es-AR')}</p></div><p className="font-bold text-gray-900">${invoice.total.toLocaleString('es-AR')}</p></div>
          {invoice.invoiceStatus && <p className="text-sm text-gray-600">{statusLabels[invoice.invoiceStatus] || invoice.invoiceStatus}{invoice.invoicePdfStatus ? ` · ${pdfLabels[invoice.invoicePdfStatus] || invoice.invoicePdfStatus}` : ''}</p>}
          {invoice.invoiceCae && <div className="rounded-xl bg-gray-50 p-3 text-sm"><p><span className="text-gray-500">CAE:</span> <span className="font-mono font-semibold">{invoice.invoiceCae}</span></p>{invoice.invoiceCaeExpiresAt && <p className="mt-1 text-gray-500">Vencimiento CAE: {new Date(invoice.invoiceCaeExpiresAt).toLocaleDateString('es-AR')}</p>}{invoice.invoicePointOfSale && invoice.invoiceVoucherNumber && <p className="mt-1 text-gray-500">Punto de venta {invoice.invoicePointOfSale} · Comprobante {String(invoice.invoiceVoucherNumber).padStart(8, '0')}</p>}</div>}
          {invoice.invoiceCae && !invoice.invoiceObjectKey && <Link href={`/perfil/ordenes/${invoice.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#ED164F] hover:underline">Recuperar PDF desde el pedido</Link>}
          {invoice.invoiceObjectKey && invoice.invoiceCae && <a href={`/api/orders/${invoice.id}/invoice/download`} className="inline-flex items-center gap-2 rounded-lg bg-[#ED164F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d91346]"><Download size={15} /> Descargar factura PDF</a>}
          {!invoice.invoiceObjectKey && invoice.invoiceUrl && <a href={`/api/orders/${invoice.id}/invoice/download`} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Download size={15} /> Descargar comprobante</a>}
        </article>)}</div>}
    </div>
  )
}
