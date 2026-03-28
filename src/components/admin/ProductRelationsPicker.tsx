'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Link2, Search } from 'lucide-react'

type RelatedProductOption = {
  id: string
  name: string
  slug: string
  active: boolean
  images: string[]
  category: {
    name: string
  }
}

export default function ProductRelationsPicker({
  products,
  initialSelectedIds = [],
}: {
  products: RelatedProductOption[]
  initialSelectedIds?: string[]
}) {
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds)

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return products

    return products.filter((product) =>
      `${product.name} ${product.slug} ${product.category.name}`.toLowerCase().includes(normalizedQuery)
    )
  }, [products, query])

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedIdSet.has(product.id)),
    [products, selectedIdSet]
  )

  const toggleSelection = (productId: string) => {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    )
  }

  return (
    <div className="card p-6">
      <input type="hidden" name="relatedProductIds" value={JSON.stringify(selectedIds)} />

      <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
        <Link2 size={18} className="text-orange-500" />
        <div>
          <h2 className="font-bold text-gray-900">Ventas cruzadas</h2>
          <p className="text-xs text-gray-500">
            Elegi otros productos para sugerir en esta ficha publica.
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, categoria o slug..."
            className="w-full border-none bg-transparent p-0 text-sm text-gray-700 focus:ring-0"
          />
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Seleccionados ({selectedProducts.length})
        </p>
        {selectedProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Todavia no hay productos relacionados seleccionados.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => toggleSelection(product.id)}
                className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700"
              >
                {product.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            No encontramos productos con ese filtro.
          </div>
        ) : (
          filteredProducts.map((product) => {
            const selected = selectedIdSet.has(product.id)

            return (
              <label
                key={product.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                  selected
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-orange-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSelection(product.id)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-gray-100">
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg text-gray-400">
                      IMG
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                    {!product.active && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-500">
                    {product.category.name} · /{product.slug}
                  </p>
                </div>
              </label>
            )
          })
        )}
      </div>
    </div>
  )
}
