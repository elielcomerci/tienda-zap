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
            ¿Cómo querés avanzar?
          </h2>
        </div>

        <div className="border-t border-gray-900">
          <Link
            href="/productos?mode=rubro"
            className="group flex items-center justify-between py-8 sm:py-10 border-b border-gray-200 transition-colors"
          >
            <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-950 group-hover:text-[#ED164F] transition-colors">
              Soluciones
            </span>
            <span className="text-base sm:text-lg font-medium text-gray-600 group-hover:text-[#ED164F] flex items-center gap-2 transition-colors">
              Empezá por tu negocio <ArrowRight size={18} />
            </span>
          </Link>

          {hasCosas && (
            <Link
              href="/productos?mode=product&tipo=cosa"
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
              href="/productos?mode=product&tipo=desarrollo"
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
