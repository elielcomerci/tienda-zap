import PublicHeader from '@/components/public/PublicHeader'
import WelcomePromoModal from '@/components/WelcomePromoModal'
import Footer from '@/components/Footer'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { getActiveSellerById } from '@/lib/sellers'
import { getPublicCategories } from '@/lib/categories'
import { getPublicIntentions } from '@/lib/intentions'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const sellerRef = (await cookies()).get('zap_seller_ref')?.value
  const referralSeller = await getActiveSellerById(sellerRef)

  const [categories, intentions] = await Promise.all([
    getPublicCategories(),
    getPublicIntentions(),
  ])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <WelcomePromoModal />
      <PublicHeader 
        user={session?.user || null} 
        referralSeller={referralSeller}
        categories={categories}
        intentions={intentions}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
