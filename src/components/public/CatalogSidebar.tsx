import Link from 'next/link'
import { BriefcaseBusiness, LayoutGrid, PackageOpen } from 'lucide-react'
import { DiscoverySituation } from '@/lib/discovery'
import { buildProductsUrl, type ExplorationContext } from '@/lib/exploration-context'

export default function CatalogSidebar({
  categories,
  intentions,
  businessTypes,
  cat,
  mode,
  intent,
  situation,
  businessType,
  catalogType,
}: {
  categories: { id: string; name: string; slug: string }[]
  intentions: DiscoverySituation[]
  businessTypes: { id: string; name: string; slug: string }[]
  cat?: string
  mode?: 'product' | 'objective' | 'situation' | 'combo' | 'rubro'
  intent?: string
  situation?: string
  businessType?: string
  catalogType?: 'cosa' | 'desarrollo'
}) {
  const currentMode = mode || 'product'
  const isSituationMode = currentMode === 'objective' || currentMode === 'situation'
  const currentSituation = situation || intent
  const isCatalogTypeMode = currentMode === 'product' && Boolean(catalogType)
  const isCosas = currentMode === 'product' && catalogType === 'cosa'
  const isDesarrollos = currentMode === 'product' && catalogType === 'desarrollo'
  const isSoluciones = currentMode === 'rubro' || isSituationMode
  const explorationContext: ExplorationContext = {
    businessTypeSlug: businessType,
    situationSlug: currentSituation,
  }
  const catalogUrl = (overrides: Record<string, string | undefined> = {}) => buildProductsUrl(explorationContext, overrides)

  return (
    <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start min-w-0">
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 px-1">
          Navegación
        </p>
        
        <div className="grid grid-cols-3 gap-1 bg-gray-200/60 p-1 rounded-xl">
          <Link href={catalogUrl({ mode: 'product', tipo: 'cosa' })} scroll={false} className={"flex justify-center items-center py-2 text-xs font-semibold rounded-lg transition-all " + (isCosas ? "bg-[#ED164F] text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50")}>
            Cosas
          </Link>
          <Link href={catalogUrl({ mode: 'rubro' })} scroll={false} className={"flex justify-center items-center py-2 text-xs font-semibold rounded-lg transition-all " + (isSoluciones ? "bg-[#ED164F] text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50")}>
            Soluciones
          </Link>
          <Link href={catalogUrl({ mode: 'product', tipo: 'desarrollo' })} scroll={false} className={"flex justify-center items-center py-2 text-xs font-semibold rounded-lg transition-all " + (isDesarrollos ? "bg-[#ED164F] text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50")}>
            Desarrollos
          </Link>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 px-1">
          {currentMode === 'product' ? (catalogType === 'desarrollo' ? 'Desarrollos' : catalogType === 'cosa' ? 'Cosas' : 'Todo') : currentMode === 'rubro' ? 'Rubros' : 'Situaciones'}
        </p>

        {currentMode === 'product' ? (
          isCatalogTypeMode ? (
            <div className="space-y-2">
              <Link
                href={catalogUrl({ mode: 'product', tipo: 'cosa' })}
                scroll={false}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  catalogType === 'cosa'
                    ? 'bg-[#FEF1F5] text-[#ED164F] font-bold'
                    : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <PackageOpen size={18} className={catalogType === 'cosa' ? 'text-[#ED164F]' : 'text-gray-400'} />
                <span className="leading-tight">Cosas</span>
              </Link>
              <Link
                href={catalogUrl({ mode: 'product', tipo: 'desarrollo' })}
                scroll={false}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  catalogType === 'desarrollo'
                    ? 'bg-[#FEF1F5] text-[#ED164F] font-bold'
                    : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <BriefcaseBusiness size={18} className={catalogType === 'desarrollo' ? 'text-[#ED164F]' : 'text-gray-400'} />
                <span className="leading-tight">Desarrollos</span>
              </Link>
              <Link
                href={catalogUrl({ mode: 'product' })}
                scroll={false}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900"
              >
                <LayoutGrid size={18} className="text-gray-400" />
                <span className="leading-tight">Todo</span>
              </Link>
            </div>
          ) : (
          <div className="flex flex-row gap-1 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
            <Link
              href={catalogUrl({ mode: 'product', tipo: 'cosa' })}
              scroll={false}
              className={`flex items-center gap-3 whitespace-nowrap xl:whitespace-normal text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
                !cat
                  ? 'bg-[#FEF1F5] text-[#ED164F] font-bold'
                  : 'text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={18} className={!cat ? 'text-[#ED164F]' : 'text-gray-400'} />
              <span className="leading-tight">Todo</span>
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={catalogUrl({ mode: 'product', tipo: 'cosa', cat: category.slug })}
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
          )
        ) : currentMode === 'rubro' ? (
          <div className="flex flex-row gap-1 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
            <Link
              href={catalogUrl({ mode: 'rubro' })}
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
                href={catalogUrl({ mode: 'rubro', rubro: item.slug, situacion: undefined, necesidad: undefined })}
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
              href={catalogUrl({ mode: 'situation', situacion: undefined, necesidad: undefined })}
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
                href={catalogUrl({ mode: 'situation', situacion: intention.slug, necesidad: undefined })}
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
