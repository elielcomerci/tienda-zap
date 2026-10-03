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
    <section className="mx-auto max-w-[1380px] px-4 py-14 xl:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED164F]">
          Catálogo
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
          {hasCosas && hasDesarrollos
            ? 'Cosas que se producen. Desarrollos que se construyen.'
            : hasCosas
            ? 'Cosas que se producen.'
            : 'Desarrollos que se construyen.'}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-7 text-gray-500">
          Elegí por lo que necesitás resolver, no por categoría.
        </p>
      </div>

      <div className={`grid gap-6 ${hasCosas && hasDesarrollos ? 'sm:grid-cols-2' : ''}`}>
        {hasCosas && (
          <Link
            href="/productos?mode=product"
            className="group flex flex-col gap-5 rounded-[30px] border border-gray-200 bg-white p-8 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-1 hover:border-[#F7638B]/30 hover:shadow-[0_28px_70px_-44px_rgba(237,22,79,0.14)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF1F5] text-[#ED164F]">
              <Box size={28} />
            </span>
            <div className="flex-1">
              <h3 className="text-2xl font-black tracking-tight text-gray-950 transition-colors group-hover:text-[#ED164F]">
                Cosas
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Lo que producimos: gráfica, cartelería, merchandising, indumentaria y todo lo que tiene una forma física o un archivo listo para imprimir.
              </p>
            </div>
            <span className="flex items-center gap-2 text-sm font-bold text-[#ED164F] transition-gap group-hover:gap-3">
              Explorar cosas <ArrowRight size={16} />
            </span>
          </Link>
        )}

        {hasDesarrollos && (
          <Link
            href="/productos?mode=product"
            className="group flex flex-col gap-5 rounded-[30px] border border-gray-200 bg-white p-8 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-1 hover:border-[#4576B9]/30 hover:shadow-[0_28px_70px_-44px_rgba(69,118,185,0.14)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FC] text-[#4576B9]">
              <Code2 size={28} />
            </span>
            <div className="flex-1">
              <h3 className="text-2xl font-black tracking-tight text-gray-950 transition-colors group-hover:text-[#4576B9]">
                Desarrollos
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Lo que construimos: web, presencia digital, identidad de marca, sistemas de comunicación y todo lo que se instala, configura y sostiene en el tiempo.
              </p>
            </div>
            <span className="flex items-center gap-2 text-sm font-bold text-[#4576B9] transition-gap group-hover:gap-3">
              Explorar desarrollos <ArrowRight size={16} />
            </span>
          </Link>
        )}
      </div>
    </section>
  )
}
