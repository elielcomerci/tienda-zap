import { prisma } from '@/lib/prisma'
import IntentionForm from '../IntentionForm'
import { notFound } from 'next/navigation'

export default async function EditIntentionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const intention = await prisma.intention.findUnique({
    where: { id }
  })

  if (!intention) notFound()

  return (
    <div className="space-y-6 max-w-[800px] mx-auto p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Objetivo</h1>
        <p className="text-sm text-gray-500 mt-1">
          Modificá los detalles de este objetivo. Tené en cuenta que los cambios se reflejarán de inmediato en la tienda pública.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <IntentionForm intention={intention} />
      </div>
    </div>
  )
}
