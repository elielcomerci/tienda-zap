import Link from 'next/link'
import { SlidersHorizontal, Package, Target } from 'lucide-react'
import { Intention } from '@/lib/intentions'

export default function CatalogSidebar({
  categories,
  intentions,
  cat,
  mode,
  intent,
}: {
  categories: { id: string; name: string; slug: string }[]
  intentions: Intention[]
  cat?: string
  mode?: 'product' | 'objective'
  intent?: string
}) {
  const currentMode = mode || 'product'

  return (
    <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start min-w-0">
      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.28)]">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FEF1F6] text-[#ED2C71]">
            <SlidersHorizontal size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Explorá nuestro catálogo</p>
            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Navegación</p>
          </div>
        </div>

        {/* Toggle Mode */}
        <div className="flex bg-gray-100 p-1 rounded-2xl mb-5">
          <Link
            href="/productos?mode=product"
            className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-semibold rounded-xl transition-all ${
              currentMode === 'product'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package size={16} /> Por Producto
          </Link>
          <Link
            href="/productos?mode=objective"
            className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-semibold rounded-xl transition-all ${
              currentMode === 'objective'
                ? 'bg-[#ED2C71] text-white shadow-sm shadow-[#ED2C71]/20'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Target size={16} /> Por Objetivo
          </Link>
        </div>

        {currentMode === 'product' ? (
          <div className="flex flex-row gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
            <Link
              href="/productos?mode=product"
              className={`flex items-center whitespace-nowrap xl:whitespace-normal rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                !cat
                  ? 'bg-gray-950 text-white shadow-sm'
                  : 'border border-gray-200 bg-gray-50 text-gray-700 hover:border-[#F66B9A]/25 hover:bg-[#FEF1F6] hover:text-[#C91F5B]'
              }`}
            >
              Todos los productos
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/productos?mode=product&cat=${category.slug}`}
                className={`flex items-center whitespace-nowrap xl:whitespace-normal text-left rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                  cat === category.slug
                    ? 'bg-[#ED2C71] text-white shadow-sm shadow-[#ED2C71]/20'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-[#F66B9A]/25 hover:bg-[#FEF1F6] hover:text-[#C91F5B]'
                }`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-row gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
            <Link
              href="/productos?mode=objective"
              className={`flex items-center whitespace-nowrap xl:whitespace-normal rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                !intent
                  ? 'bg-gray-950 text-white shadow-sm'
                  : 'border border-gray-200 bg-gray-50 text-gray-700 hover:border-[#F66B9A]/25 hover:bg-[#FEF1F6] hover:text-[#C91F5B]'
              }`}
            >
              Todos los objetivos
            </Link>
            {intentions.map((intention) => (
              <Link
                key={intention.id}
                href={`/productos?mode=objective&intent=${intention.slug}`}
                className={`flex items-center gap-2 whitespace-nowrap xl:whitespace-normal text-left rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                  intent === intention.slug
                    ? 'bg-[#ED2C71] text-white shadow-sm shadow-[#ED2C71]/20'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-[#F66B9A]/25 hover:bg-[#FEF1F6] hover:text-[#C91F5B]'
                }`}
              >
                {intention.icon && <span className="shrink-0 text-lg">{intention.icon}</span>}
                <span className="leading-tight">{intention.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[28px] border border-[#F66B9A]/25 bg-[#FEF1F6] p-5 shadow-[0_18px_50px_-42px_rgba(237,44,113,0.45)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED2C71]">
          Crédito ZAP
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-gray-900">
          Anticipo visible en cada producto. Simulación completa antes de confirmar.
        </p>
      </div>
    </aside>
  )
}
