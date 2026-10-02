import Link from 'next/link'
import { BriefcaseBusiness, LayoutGrid, PackageOpen } from 'lucide-react'
import { DiscoverySituation } from '@/lib/discovery'

export default function CatalogSidebar({
  categories,
  intentions,
  businessTypes,
  cat,
  mode,
  intent,
  situation,
  businessType,
}: {
  categories: { id: string; name: string; slug: string }[]
  intentions: DiscoverySituation[]
  businessTypes: { id: string; name: string; slug: string }[]
  cat?: string
  mode?: 'product' | 'objective' | 'situation' | 'combo' | 'rubro'
  intent?: string
  situation?: string
  businessType?: string
}) {
  const currentMode = mode || 'product'
  const isSituationMode = currentMode === 'objective' || currentMode === 'situation'
  const currentSituation = situation || intent

  return (
    <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start min-w-0">
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 px-1">
          Navegación
        </p>
        
        {/* Toggle Mode */}
        <div className="grid grid-cols-2 gap-1 bg-gray-200/60 p-1 rounded-xl">
          <Link
            href="/productos?mode=product"
            scroll={false}
            className={`flex justify-center items-center py-2 text-xs font-semibold rounded-lg transition-all ${
              currentMode === 'product'
                ? 'bg-[#ED164F] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            Productos
          </Link>
          <Link
            href="/productos?mode=combo"
            scroll={false}
            className={`flex justify-center items-center py-2 text-xs font-semibold rounded-lg transition-all ${
              currentMode === 'combo'
                ? 'bg-[#ED164F] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            Combos
          </Link>
          <Link
            href="/productos?mode=situation"
            scroll={false}
            className={`flex justify-center items-center py-2 text-xs font-semibold rounded-lg transition-all ${
              isSituationMode
                ? 'bg-[#ED164F] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            Situaciones
          </Link>
          <Link
            href="/productos?mode=rubro"
            scroll={false}
            className={`flex justify-center items-center py-2 text-xs font-semibold rounded-lg transition-all ${
              currentMode === 'rubro'
                ? 'bg-[#ED164F] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            Rubros
          </Link>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 px-1">
          {currentMode === 'product' ? 'Categorías' : currentMode === 'combo' ? 'Soluciones' : currentMode === 'rubro' ? 'Rubros' : 'Situaciones'}
        </p>

        {currentMode === 'product' ? (
          <div className="flex flex-row gap-1 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
            <Link
              href="/productos?mode=product"
              scroll={false}
              className={`flex items-center gap-3 whitespace-nowrap xl:whitespace-normal text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
                !cat
                  ? 'bg-[#FEF1F5] text-[#ED164F] font-bold'
                  : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={18} className={!cat ? 'text-[#ED164F]' : 'text-gray-400'} />
              <span className="leading-tight">Todos los productos</span>
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/productos?mode=product&cat=${category.slug}`}
                scroll={false}
                className={`flex items-center gap-3 whitespace-nowrap xl:whitespace-normal text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
                  cat === category.slug
                    ? 'bg-[#FEF1F5] text-[#ED164F] font-bold'
                    : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <PackageOpen size={18} className={cat === category.slug ? 'text-[#ED164F]' : 'text-gray-400'} />
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
        ) : currentMode === 'rubro' ? (
          <div className="flex flex-row gap-1 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
            <Link
              href="/productos?mode=rubro"
              scroll={false}
              className={`flex items-center gap-3 whitespace-nowrap xl:whitespace-normal text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
                !businessType ? 'bg-[#FEF1F5] text-[#ED164F] font-bold' : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={18} className={!businessType ? 'text-[#ED164F]' : 'text-gray-400'} />
              <span className="leading-tight">Todos los rubros</span>
            </Link>
            {businessTypes.map((item) => (
              <Link
                key={item.id}
                href={`/productos?mode=rubro&rubro=${item.slug}`}
                scroll={false}
                className={`flex items-center gap-3 whitespace-nowrap xl:whitespace-normal text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
                  businessType === item.slug ? 'bg-[#FEF1F5] text-[#ED164F] font-bold' : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <BriefcaseBusiness size={18} className={businessType === item.slug ? 'text-[#ED164F]' : 'text-gray-400'} />
                <span className="leading-tight">{item.name}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-row gap-1 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
            <Link
              href="/productos?mode=situation"
              scroll={false}
              className={`flex items-center gap-3 whitespace-nowrap xl:whitespace-normal text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
                !currentSituation
                  ? 'bg-[#FEF1F5] text-[#ED164F] font-bold'
                  : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={18} className={!currentSituation ? 'text-[#ED164F]' : 'text-gray-400'} />
              <span className="leading-tight">Todas las situaciones</span>
            </Link>
            {intentions.map((intention) => (
              <Link
                key={intention.id}
                href={`/productos?mode=situation&situacion=${intention.slug}`}
                scroll={false}
                className={`flex items-center gap-3 whitespace-nowrap xl:whitespace-normal text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
                  currentSituation === intention.slug
                    ? 'bg-[#FEF1F5] text-[#ED164F] font-bold'
                    : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {intention.icon ? (
                  <span className={`shrink-0 text-lg ${currentSituation === intention.slug ? 'opacity-100' : 'opacity-70 grayscale'}`}>{intention.icon}</span>
                ) : (
                  <span className="w-[18px]" />
                )}
                <span className="leading-tight">{intention.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
