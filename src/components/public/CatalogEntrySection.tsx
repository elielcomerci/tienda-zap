import Link from 'next/link'
import { ArrowRight, Box, Code2 } from 'lucide-react'

interface ProductSnippet {
  id: string
  name: string
  slug: string
  description: string | null
  images: string[]
  price: number
  category: { name: string; isService: boolean }
  variants: { price: number }[]
  quoterConfig: unknown | null
}

export default function CatalogEntrySection({
  products,
}: {
  products: ProductSnippet[]
}) {
  const hasCosas = products.some((p) => !p.category.isService)
  const hasDesarrollos = products.some((p) => p.category.isService)

  if (!hasCosas && !hasDesarrollos) return null

  return (
    <section className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-[1380px] px-4 py-16 xl:px-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-gray-950 flex items-baseline">
            <span className="text-gray-400 font-bold mr-3 text-lg sm:text-xl lg:text-2xl">02</span>
            ¿Ya sabés qué buscás?
          </h2>
        </div>

        <div className="border-t border-gray-900">
          {hasCosas && (
            <Link
              href="/productos?mode=product"
              className="group flex items-center justify-between py-8 sm:py-10 border-b border-gray-200 transition-colors"
            >
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-950 group-hover:text-[#ED164F] transition-colors">
                Cosas
              </span>
              <span className="text-base sm:text-lg font-medium text-gray-600 group-hover:text-[#ED164F] flex items-center gap-2 transition-colors">
                Lo que producimos <ArrowRight size={18} />
              </span>
            </Link>
          )}

          {hasDesarrollos && (
            <Link
              href="/productos?mode=product"
              className="group flex items-center justify-between py-8 sm:py-10 border-b border-gray-200 transition-colors"
            >
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-950 group-hover:text-[#ED164F] transition-colors">
                Desarrollos
              </span>
              <span className="text-base sm:text-lg font-medium text-gray-600 group-hover:text-[#ED164F] flex items-center gap-2 transition-colors">
                Lo que construimos <ArrowRight size={18} />
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
