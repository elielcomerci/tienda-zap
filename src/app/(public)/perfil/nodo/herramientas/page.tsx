import { redirect } from 'next/navigation'

export const metadata = { title: 'Avanzado | NODO ZAP' }

export default function NodoHerramientasLegacyPage() {
  redirect('/perfil/nodo/avanzado?vista=consultas')
}
