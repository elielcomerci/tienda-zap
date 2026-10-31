import ClientAreaNav from '@/components/ClientAreaNav'
import WelcomePromoModal from '@/components/WelcomePromoModal'

export default function ClientAreaLayout({ children }: { children: React.ReactNode }) {
  return <><ClientAreaNav filesEnabled={process.env.CLIENT_WORK_FILES_ENABLED === 'true'} /><WelcomePromoModal accountMode />{children}</>
}
