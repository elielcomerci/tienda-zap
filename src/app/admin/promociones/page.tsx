import { getPromotions } from './actions'
import PromocionesClient from './PromocionesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Promociones y Cupones | ZAP Admin' }

export default async function PromocionesAdminPage() {
  const promotions = await getPromotions()
  return <PromocionesClient initialPromotions={promotions as any} />
}
