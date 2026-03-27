import Image from 'next/image'
import Link from 'next/link'
import { getProducts } from '@/lib/products'
import { getCategories } from '@/lib/categories'
import AddToCartButton from '@/components/public/AddToCartButton'

export const dynamic = 'force-dynamic'
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string }>
}) {
  const { cat, q } = await searchParams
  const [products, categories] = await Promise.all([
    getProducts(cat, q),
    getCategories(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar filtros */}
        <aside className="w-full md:w-48 shrink-0 md:sticky md:top-24 h-max">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide hidden md:block">Categorías</h3>
          <div className="flex flex-row md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar scroll-smooth">
            <Link href="/productos"
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm transition-all ${!cat ? 'bg-orange-500 text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 md:bg-transparent md:hover:bg-gray-100'}`}>
              Todos
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={`/productos?cat=${c.slug}`}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm transition-all ${cat === c.slug ? 'bg-orange-500 text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 md:bg-transparent md:hover:bg-gray-100'}`}>
                {c.name}
              </Link>
            ))}
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1">
          {/* Search */}
          <form className="mb-6">
            <input type="text" name="q" defaultValue={q} placeholder="Buscar productos..." className="input max-w-md" />
          </form>

          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p>No encontramos productos con esos filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((product) => {
                const hasVariants = product.variants && product.variants.length > 0
                const displayPrice = hasVariants ? product.variants[0]?.price : product.price
                
                return (
                  <div key={product.id} className="card overflow-hidden group">
                    <Link href={`/productos/${product.slug}`}>
                      <div className="aspect-square bg-gray-100 overflow-hidden">
                        {product.images[0] ? (
                          <Image src={product.images[0]} alt={product.name} width={400} height={400}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl">🖨️</div>
                        )}
                      </div>
                    </Link>
                    <div className="p-4">
                      <p className="text-xs text-orange-500 font-semibold mb-1">{product.category.name}</p>
                      <Link href={`/productos/${product.slug}`}>
                        <h3 className="font-semibold text-gray-900 text-sm mb-2 hover:text-orange-500 transition-colors line-clamp-2">{product.name}</h3>
                      </Link>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex flex-col">
                          {hasVariants && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Desde</span>}
                          <p className="text-lg font-bold">${displayPrice.toLocaleString('es-AR')}</p>
                        </div>
                        <AddToCartButton 
                          product={{
                            productId: product.id,
                            name: product.name,
                            price: displayPrice,
                            image: product.images[0] || '',
                            quantity: 1,
                          }} 
                          hasVariants={hasVariants}
                          slug={product.slug}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
