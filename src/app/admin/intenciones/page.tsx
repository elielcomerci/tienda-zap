import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Edit, Trash2 } from 'lucide-react'
import IntentionsTable from './IntentionsTable'

export const dynamic = 'force-dynamic'

export default async function AdminIntentionsPage() {
  const intentions = await prisma.intention.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: { order: 'asc' }
  })

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Objetivos (Intenciones)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Administrá los objetivos comerciales que agrupan tus productos en el catálogo público.
          </p>
        </div>
        <Link href="/admin/intenciones/nuevo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Objetivo
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <IntentionsTable intentions={intentions} />
      </div>
    </div>
  )
}
