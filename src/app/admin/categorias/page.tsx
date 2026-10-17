import { createCategory, updateCategory } from '@/lib/actions/categories'
import { getAdminCategories } from '@/lib/categories'

export const metadata = { title: 'Categorías del catálogo | ZAP Admin' }

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories()
  return <div className="mx-auto max-w-5xl space-y-8">
    <header>
      <h1 className="text-2xl font-bold text-gray-950">Categorías del catálogo</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">Organizá cómo encuentra los productos el cliente. Las categorías no cambian el motor, los precios ni los configuradores del producto.</p>
    </header>
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-bold text-gray-950">Nueva categoría</h2>
      <form action={createCategory} className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">Nombre<input name="name" required className="input mt-1 w-full" placeholder="Ej. Talonarios & Formularios" /></label>
        <label className="text-sm font-medium">Slug (opcional)<input name="slug" className="input mt-1 w-full" placeholder="Se genera desde el nombre" /></label>
        <label className="text-sm font-medium md:col-span-2">Descripción<textarea name="description" className="input mt-1 w-full" rows={2} /></label>
        <label className="text-sm font-medium">Orden<input name="sortOrder" type="number" defaultValue={100} className="input mt-1 w-full" /></label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input name="active" type="checkbox" defaultChecked /> Visible en la tienda</label>
        <div className="md:col-span-2"><button className="btn-primary">Crear categoría</button></div>
      </form>
    </section>
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3"><h2 className="text-lg font-bold text-gray-950">Categorías existentes</h2><p className="text-sm text-gray-500">{categories.length} categorías</p></div>
      {categories.map((category) => <article key={category.id} className="rounded-2xl border border-gray-200 bg-white p-5">
        <form action={updateCategory.bind(null, category.id)} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">Nombre<input name="name" required defaultValue={category.name} className="input mt-1 w-full" /></label>
          <label className="text-sm font-medium">Slug<input name="slug" required defaultValue={category.slug} className="input mt-1 w-full" /></label>
          <label className="text-sm font-medium md:col-span-2">Descripción<textarea name="description" defaultValue={category.description || ''} className="input mt-1 w-full" rows={2} /></label>
          <label className="text-sm font-medium">Orden<input name="sortOrder" type="number" defaultValue={category.sortOrder} className="input mt-1 w-full" /></label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input name="active" type="checkbox" defaultChecked={category.active} /> Visible en la tienda</label>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 md:col-span-2">
            <p className="text-xs text-gray-500">{category._count.products} asignaciones de productos · {category.active ? 'Activa' : 'Oculta'}</p>
            <button className="btn-primary">Guardar cambios</button>
          </div>
        </form>
      </article>)}
    </section>
    <p className="text-sm text-gray-500">Ocultar una categoría no desactiva ni elimina los productos asociados. La asignación de productos se administra desde la ficha de cada producto.</p>
  </div>
}
