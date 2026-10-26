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
  publicGroup,
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
  publicGroup?: 'VENTAS' | 'MARCA' | 'EXPERIENCIA' | 'PROYECTOS'
}) {
  const currentMode = mode || 'product'
  const isSituationMode = currentMode === 'objective' || currentMode === 'situation'
  const currentSituation = situation || intent
  const isCosas = currentMode === 'product' && catalogType === 'cosa'
  const isDesarrollos = currentMode === 'product' && catalogType === 'desarrollo'
  const explorationContext: ExplorationContext = {
    mode: isSituationMode ? 'situation' : currentMode === 'rubro' ? 'rubro' : currentMode === 'product' ? 'product' : undefined,
    businessTypeSlug: businessType,
    situationSlug: currentSituation,
    publicGroup,
  }
  const catalogUrl = (overrides: Record<string, string | undefined> = {}) => buildProductsUrl(explorationContext, overrides)

  return (
    <aside className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-200/60 p-1">
        <Link
          href={catalogUrl({ mode: 'product', tipo: 'cosa', cat: undefined })}
          scroll={false}
          className={`flex items-center justify-center rounded-lg py-2 text-xs font-semibold transition-all ${isCosas ? 'bg-[#ED164F] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'}`}
        >
          Productos
        </Link>
        <Link
          href={catalogUrl({ mode: 'product', tipo: 'desarrollo', cat: undefined })}
          scroll={false}
          className={`flex items-center justify-center rounded-lg py-2 text-xs font-semibold transition-all ${isDesarrollos ? 'bg-[#ED164F] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'}`}
        >
          Desarrollos
        </Link>
      </div>

      {!isDesarrollos && (
        <div>
          <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
            {currentMode === 'product' ? 'Categorías' : currentMode === 'rubro' ? 'Rubros' : 'Situaciones'}
          </p>

          {currentMode === 'product' ? (
            <div className="flex flex-row gap-1 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
              <Link
                href={catalogUrl({ mode: 'product', tipo: isCosas ? 'cosa' : undefined, cat: undefined })}
                scroll={false}
                className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm transition-all xl:whitespace-normal ${
                  !cat
                    ? 'bg-[#FEF1F5] font-bold text-[#ED164F]'
                    : 'font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <LayoutGrid size={18} className={!cat ? 'text-[#ED164F]' : 'text-gray-400'} />
                <span className="leading-tight">Todas</span>
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={catalogUrl({ mode: 'product', tipo: isCosas ? 'cosa' : isDesarrollos ? 'desarrollo' : undefined, cat: category.slug })}
                  scroll={false}
                  className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm transition-all xl:whitespace-normal ${
                    cat === category.slug
                      ? 'bg-[#FEF1F5] font-bold text-[#ED164F]'
                      : 'font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <PackageOpen size={18} className={cat === category.slug ? 'text-[#ED164F]' : 'text-gray-400'} />
                  <span className="leading-tight">{category.name}</span>
                </Link>
              ))}
            </div>
          ) : currentMode === 'rubro' ? (
            <div className="flex flex-row gap-1 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
              <Link
                href={catalogUrl({ mode: 'rubro', rubro: undefined })}
                scroll={false}
                className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm transition-all xl:whitespace-normal ${
                  !businessType ? 'bg-[#FEF1F5] font-bold text-[#ED164F]' : 'font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
                  className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm transition-all xl:whitespace-normal ${
                    businessType === item.slug
                      ? 'bg-[#FEF1F5] font-bold text-[#ED164F]'
                      : 'font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
                className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm transition-all xl:whitespace-normal ${
                  !currentSituation
                    ? 'bg-[#FEF1F5] font-bold text-[#ED164F]'
                    : 'font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
                  className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm transition-all xl:whitespace-normal ${
                    currentSituation === intention.slug
                      ? 'bg-[#FEF1F5] font-bold text-[#ED164F]'
                      : 'font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
      )}
    </aside>
  )
}
