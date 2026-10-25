import NodoNav from '@/components/nodo/NodoNav'

export default function NodoLayout({ children }: { children: React.ReactNode }) {
  return <><NodoNav />{children}</>
}
