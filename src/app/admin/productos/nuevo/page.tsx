import { createProduct } from '@/lib/actions/products'
import ProductImagesManager from '@/components/admin/ProductImagesManager'
import { getAdminCategories } from '@/lib/categories'
import { getProductRelationOptions } from '@/lib/products'

function soundCloudLinksValue(value: unknown) {
  let parsed = value
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { parsed = [] }
  }
  if (!Array.isArray(parsed)) return ''
  return parsed
    .filter((item: any) => item?.type === 'SOUNDCLOUD' && typeof item.url === 'string')
    .map((item: any) => `${String(item.title || 'Muestra de SoundCloud')} | ${item.url}`)
    .join('\n')
}

export default async function NewProductPage() {
  const [categories, relationOptions] = await Promise.all([getAdminCategories(), getProductRelationOptions()])
  return <ProductBaseForm title="Nuevo Product Base" action={createProduct} categories={categories} relationOptions={relationOptions} />
}

export function ProductBaseForm({ title, action, product, categories = [], relationOptions = [] }: { title: string; action: (formData: FormData) => Promise<void>; product?: any; categories?: any[]; relationOptions?: any[] }) {
  const selectedCategoryIds = new Set<string>((product?.categoryLinks || []).map((link: any) => link.categoryId || link.category?.id))
  const relationIds = (type: string) => new Set<string>((product?.outgoingRelations || []).filter((relation: any) => relation.type === type).map((relation: any) => relation.relatedProductId))
  const relationGroups = [
    { title: 'Sugerencias de mayor valor (upsell)', name: 'upsellProductIds', type: 'UPSELL', ids: relationIds('UPSELL') },
    { title: 'Productos complementarios', name: 'complementaryProductIds', type: 'COMPLEMENTARY', ids: relationIds('COMPLEMENTARY') },
    { title: 'Alternativas', name: 'alternativeProductIds', type: 'ALTERNATIVE', ids: relationIds('ALTERNATIVE') },
  ]
  return <div className="mx-auto max-w-4xl space-y-6">
    <header><h1 className="text-2xl font-bold text-gray-950">{title}</h1><p className="mt-1 text-sm text-gray-600">Definí el producto, sus categorías comerciales y las relaciones que ayudan al cliente a elegir. Los precios y configuradores se administran por separado.</p></header>
    <form action={action} className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6">
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-950">Información del producto</h2>
        <label className="block text-sm font-medium">Nombre<input name="name" required defaultValue={product?.name} className="input mt-1 w-full" /></label>
        <label className="block text-sm font-medium">Slug<input name="slug" defaultValue={product?.slug} className="input mt-1 w-full" /></label>
        <label className="block text-sm font-medium">Descripción<textarea name="description" defaultValue={product?.description || ''} className="input mt-1 min-h-24 w-full" /></label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">Tipo de catálogo<select name="catalogType" defaultValue={product?.catalogType || 'COSA'} className="input mt-1 w-full"><option value="COSA">Cosa</option><option value="DESARROLLO">Desarrollo</option></select></label>
          <label className="block text-sm font-medium">Modalidad<select name="modality" defaultValue={product?.modality || 'CONSULTAR'} className="input mt-1 w-full"><option value="CONFIGURABLE">Configurable</option><option value="DIRECTO">Directo</option><option value="CONSULTAR">Consultar</option></select></label>
          <label className="block text-sm font-medium">Motor<select name="engine" defaultValue={product?.engine || ''} className="input mt-1 w-full"><option value="">Sin motor</option><option value="IMPRESOS_PACKAGING">Impresos & Packaging</option><option value="PRESENCIA_FISICA">Presencia física</option><option value="TEXTIL">Textil</option><option value="DIGITAL">Digital</option><option value="CAMPANAS">Campañas</option></select></label>
        </div>
        <label className="block text-sm font-medium">Qué es<textarea name="whatIs" defaultValue={product?.whatIs || ''} className="input mt-1 min-h-20 w-full" /></label>
        <label className="block text-sm font-medium">Para qué sirve<textarea name="purpose" defaultValue={product?.purpose || ''} className="input mt-1 min-h-20 w-full" /></label>
        <label className="block text-sm font-medium">Nota de consulta<textarea name="consultationNote" defaultValue={product?.consultationNote || ''} className="input mt-1 min-h-20 w-full" /></label>
        <label className="block text-sm font-medium">IVA del precio final (%)<input name="vatRatePercent" type="number" min="0" max="100" step="0.01" defaultValue={product?.vatRatePercent ?? ''} className="input mt-1 w-full" placeholder="Dejá vacío si está pendiente" /><span className="mt-1 block text-xs font-normal text-gray-500">Se usa para la factura automática. El precio publicado se interpreta como importe final con IVA incluido; si queda vacío, la orden requiere emisión manual.</span></label>
        <ProductImagesManager initialImages={product?.images || []} />
      </section>
      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6">
        <div>
          <h2 className="text-lg font-bold text-gray-950">Portfolio y muestras</h2>
          <p className="mt-1 text-sm text-gray-600">Agregá playlists o pistas de SoundCloud para mostrar ejemplos del trabajo en la ficha pública del producto. Un enlace por línea.</p>
        </div>
        <label className="block text-sm font-medium">Enlaces de SoundCloud
          <textarea
            name="soundcloudLinks"
            defaultValue={soundCloudLinksValue(product?.mediaList)}
            className="input mt-1 min-h-32 w-full font-normal"
            placeholder={"Music for Films and TV | https://soundcloud.com/usuario/sets/playlist\nOtra muestra | https://soundcloud.com/usuario/pista"}
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">Formato: título opcional, luego | y la URL. También podés pegar solo la URL. Se aceptan enlaces HTTPS de SoundCloud.</span>
        </label>
      </section>
        <section className="space-y-4 border-t border-gray-100 pt-5">
          <div><h2 className="text-lg font-bold text-gray-950">Visibilidad pública</h2><p className="text-sm text-gray-600">Un producto puede seguir activo para uso interno sin aparecer en la tienda pública. Los proyectos especiales se muestran solo al entrar por esa puerta.</p></div>
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm"><input type="checkbox" name="publicVisible" defaultChecked={product?.publicVisible ?? false} className="mt-1" /><span><span className="block font-semibold text-gray-900">Mostrar en la tienda pública</span><span className="text-xs text-gray-500">Si está desmarcado, el producto no aparece en listados, recomendaciones ni páginas públicas.</span></span></label>
          <label className="block text-sm font-medium">Puerta de entrada<select name="publicGroup" defaultValue={product?.publicGroup || ''} className="input mt-1 w-full"><option value="">Sin puerta pública</option><option value="VENTAS">Vender y conseguir más clientes</option><option value="MARCA">Marca y comunicación</option><option value="EXPERIENCIA">Experiencia digital y funcionamiento</option><option value="PROYECTOS">Proyecto específico (acceso secundario)</option></select><span className="mt-1 block text-xs font-normal text-gray-500">La puerta organiza el catálogo. No cambia el motor, la modalidad ni los precios.</span></label>
        </section>
      <section className="space-y-3 border-t border-gray-100 pt-5">
        <div><h2 className="text-lg font-bold text-gray-950">Categorías comerciales</h2><p className="text-sm text-gray-600">Podés asignar el producto a más de una categoría. Esto no modifica su motor ni su precio.</p></div>
        {categories.length ? <div className="grid gap-2 sm:grid-cols-2">{categories.map((category: any) => <label key={category.id} className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm"><input type="checkbox" name="categoryIds" value={category.id} defaultChecked={selectedCategoryIds.has(category.id)} className="mt-1" /><span><span className="block font-semibold text-gray-900">{category.name}</span><span className="text-xs text-gray-500">{category.active ? 'Visible' : 'Oculta'} · /{category.slug}</span></span></label>)}</div> : <p className="text-sm text-gray-500">Todavía no hay categorías. Podés crearlas desde ZAP Admin → Categorías.</p>}
      </section>
      <section className="space-y-3 border-t border-gray-100 pt-5">
        <div><h2 className="text-lg font-bold text-gray-950">Relaciones comerciales</h2><p className="text-sm text-gray-600">Elegí qué mostrar como upsell, complemento o alternativa. Los productos relacionados se mantienen independientes.</p></div>
        {relationGroups.map((group) => <fieldset key={group.type} className="rounded-xl border border-gray-200 p-4"><legend className="px-1 text-sm font-semibold text-gray-900">{group.title}</legend>{relationOptions.length ? <div className="grid gap-2 sm:grid-cols-2">{relationOptions.map((option: any) => <label key={option.id} className="flex items-start gap-2 text-sm"><input type="checkbox" name={group.name} value={option.id} defaultChecked={group.ids.has(option.id)} className="mt-1" /><span>{option.name}{!option.active ? <span className="text-xs text-gray-500"> (inactivo)</span> : null}</span></label>)}</div> : <p className="text-sm text-gray-500">Creá otros productos para poder relacionarlos.</p>}</fieldset>)}
      </section>
      <div className="border-t border-gray-100 pt-5"><button className="btn-primary">Guardar producto</button></div>
    </form>
  </div>
}
