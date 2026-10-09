import PublicHeader from '@/components/public/PublicHeader'
import { ExplorationContextProvider } from '@/components/public/ExplorationContextProvider'
import WelcomePromoModal from '@/components/WelcomePromoModal'
import CouponSession from '@/components/public/CouponSession'
import Footer from '@/components/Footer'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { getActiveSellerById } from '@/lib/sellers'
import { getPublicCategories } from '@/lib/categories'
import { getPublicSituations } from '@/lib/discovery'
import { getPublicBusinessTypes } from '@/lib/business-types'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const sellerRef = (await cookies()).get('zap_seller_ref')?.value
  const referralSeller = await getActiveSellerById(sellerRef)

  const [categories, intentions, businessTypes] = await Promise.all([
    getPublicCategories(),
    getPublicSituations(),
    getPublicBusinessTypes(),
  ])

  return (
    <ExplorationContextProvider>
    <div className="min-h-screen flex flex-col bg-white">
      <CouponSession />
      <WelcomePromoModal />
      <PublicHeader 
        user={session?.user || null} 
        referralSeller={referralSeller}
        categories={categories}
        intentions={intentions}
        businessTypes={businessTypes}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
    </ExplorationContextProvider>
  )
}
