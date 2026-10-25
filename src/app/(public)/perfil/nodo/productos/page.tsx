import { redirect } from 'next/navigation'

export const metadata = { title: 'Clientes y productos | NODO ZAP' }

export default function NodoProductosLegacyPage() {
  redirect('/perfil/nodo/clientes-productos?vista=productos')
}
