import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface CatalogTypeItem {
  catalogType: 'COSA' | 'DESARROLLO'
}

export default function CatalogEntrySection({
  products,
}: {
  products: CatalogTypeItem[]
}) {
  const hasCosas = products.some((p) => p.catalogType === 'COSA')
  const hasDesarrollos = products.some((p) => p.catalogType === 'DESARROLLO')

  return (
    <section className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-[1380px] px-4 py-16 xl:px-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-gray-950">
            Explorá por tipo
          </h2>
        </div>

        <div className="border-t border-gray-900">
          {hasCosas && (
            <Link
              href="/productos?mode=product&tipo=cosa"
              className="group flex flex-col items-start gap-3 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-10 border-b border-gray-200 transition-colors"
            >
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-950 group-hover:text-[#ED164F] transition-colors">
                Productos
              </span>
              <span className="text-base sm:text-lg font-medium text-gray-600 group-hover:text-[#ED164F] flex items-center gap-2 transition-colors">
                Elegí, configurá o comprá <ArrowRight size={18} />
              </span>
            </Link>
          )}

          {hasDesarrollos && (
            <Link
              href="/productos?mode=product&tipo=desarrollo"
              className="group flex flex-col items-start gap-3 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-10 border-b border-gray-200 transition-colors"
            >
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-950 group-hover:text-[#ED164F] transition-colors">
                Desarrollos a medida
              </span>
              <span className="text-base sm:text-lg font-medium text-gray-600 group-hover:text-[#ED164F] flex items-center gap-2 transition-colors">
                Proyectos hechos para tu negocio <ArrowRight size={18} />
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
