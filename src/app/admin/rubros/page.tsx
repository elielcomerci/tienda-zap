import { getBusinessTypes } from '@/lib/business-types'
import { getCategories } from '@/lib/categories'
import RubrosClient from './RubrosClient'

export const metadata = { title: 'Rubros — Admin' }

export default async function RubrosPage() {
  const [businessTypes, categories] = await Promise.all([
    getBusinessTypes(),
    getCategories(),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Rubros</h1>
        <p className="mt-1 text-sm text-gray-500">
          Definí los rubros de clientes y asociá las categorías de productos relevantes para cada uno.
          Los usuarios eligen su rubro al registrarse y ven productos priorizados en la página principal.
        </p>
      </div>

      <RubrosClient businessTypes={businessTypes} categories={categories} />
    </div>
  )
}
