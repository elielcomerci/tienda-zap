import FiscalWorkspaceRoute from '@/components/nodo/FiscalWorkspaceRoute'

export const metadata = { title: 'Tu operación fiscal | NODO ZAP' }

export default function NodoHomePage() {
  return <FiscalWorkspaceRoute section="summary" />
}
