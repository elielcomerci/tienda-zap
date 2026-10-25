import { redirect } from 'next/navigation'

export const metadata = { title: 'Avanzado | NODO ZAP' }

export default function NodoIntegracionesLegacyPage() {
  redirect('/perfil/nodo/avanzado?vista=integraciones')
}
