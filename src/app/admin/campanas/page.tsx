import { getCampaigns } from './actions'
import CampanasClient from './CampanasClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Campañas Partner | ZAP Admin' }

export default async function CampanasAdminPage() {
  const campaigns = await getCampaigns()
  return <CampanasClient initialCampaigns={campaigns} />
}
