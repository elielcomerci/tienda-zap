import FiscalClientsAdminClient from './FiscalClientsAdminClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Clientes fiscales | ZAP Admin' }

export default function FiscalClientsPage() {
  return <FiscalClientsAdminClient />
}
