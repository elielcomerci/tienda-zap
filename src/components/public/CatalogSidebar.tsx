import Link from 'next/link'
import { LayoutGrid, PackageOpen } from 'lucide-react'
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
  mode?: 'product' | 'objective' | 'combo'
  intent?: string
}) {
  const currentMode = mode || 'product'

  return (
    <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start min-w-0">
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 px-1">
          Navegación
        </p>
        
        {/* Toggle Mode */}
        <div className="flex bg-gray-200/60 p-1 rounded-xl">
          <Link
            href="/productos?mode=product"
            scroll={false}
            className={`flex-1 flex justify-center items-center py-2 text-xs font-semibold rounded-lg transition-all ${
              currentMode === 'product'
                ? 'bg-[#ED2C71] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            Productos
          </Link>
          <Link
            href="/productos?mode=combo"
            scroll={false}
            className={`flex-1 flex justify-center items-center py-2 text-xs font-semibold rounded-lg transition-all ${
              currentMode === 'combo'
                ? 'bg-[#ED2C71] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            Combos
          </Link>
          <Link
            href="/productos?mode=objective"
            scroll={false}
            className={`flex-1 flex justify-center items-center py-2 text-xs font-semibold rounded-lg transition-all ${
              currentMode === 'objective'
                ? 'bg-[#ED2C71] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            Objetivos
          </Link>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 px-1">
          {currentMode === 'product' ? 'Categorías' : currentMode === 'combo' ? 'Packs Comerciales' : 'Objetivos'}
        </p>

        {currentMode === 'product' ? (
          <div className="flex flex-row gap-1 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
            <Link
              href="/productos?mode=product"
              scroll={false}
              className={`flex items-center gap-3 whitespace-nowrap xl:whitespace-normal text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
                !cat
                  ? 'bg-[#FEF1F6] text-[#ED2C71] font-bold'
                  : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={18} className={!cat ? 'text-[#ED2C71]' : 'text-gray-400'} />
              <span className="leading-tight">Todos los productos</span>
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/productos?mode=product&cat=${category.slug}`}
                scroll={false}
                className={`flex items-center gap-3 whitespace-nowrap xl:whitespace-normal text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
                  cat === category.slug
                    ? 'bg-[#FEF1F6] text-[#ED2C71] font-bold'
                    : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <PackageOpen size={18} className={cat === category.slug ? 'text-[#ED2C71]' : 'text-gray-400'} />
                <span className="leading-tight">{category.name}</span>
              </Link>
            ))}
          </div>
        ) : currentMode === 'combo' ? (
          <div className="rounded-2xl border border-[#4576B9]/15 bg-[#EEF4FC]/50 p-4 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2F5F9F]">
              Soluciones Todo-en-Uno
            </p>
            <p className="text-xs font-medium leading-5 text-gray-600">
              Kits diseñados para simplificar. Llevate la cartelería, los flyers, stickers y papelería corporativa listos y sincronizados en un solo click para potenciar tu marca.
            </p>
          </div>
        ) : (
          <div className="flex flex-row gap-1 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
            <Link
              href="/productos?mode=objective"
              scroll={false}
              className={`flex items-center gap-3 whitespace-nowrap xl:whitespace-normal text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
                !intent
                  ? 'bg-[#FEF1F6] text-[#ED2C71] font-bold'
                  : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={18} className={!intent ? 'text-[#ED2C71]' : 'text-gray-400'} />
              <span className="leading-tight">Todos los objetivos</span>
            </Link>
            {intentions.map((intention) => (
              <Link
                key={intention.id}
                href={`/productos?mode=objective&intent=${intention.slug}`}
                scroll={false}
                className={`flex items-center gap-3 whitespace-nowrap xl:whitespace-normal text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
                  intent === intention.slug
                    ? 'bg-[#FEF1F6] text-[#ED2C71] font-bold'
                    : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {intention.icon ? (
                  <span className={`shrink-0 text-lg ${intent === intention.slug ? 'opacity-100' : 'opacity-70 grayscale'}`}>{intention.icon}</span>
                ) : (
                  <span className="w-[18px]" />
                )}
                <span className="leading-tight">{intention.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ED2C71]">
          Crédito ZAP
        </p>
        <p className="mt-1.5 text-xs font-medium leading-5 text-gray-700">
          Anticipo visible en cada producto. Simulación completa antes de confirmar.
        </p>
      </div>
    </aside>
  )
}
