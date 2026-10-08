import { PackageOpen } from 'lucide-react'

export default function ProductImagePlaceholder({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_42%,rgba(237,22,79,0.06),transparent_52%),linear-gradient(135deg,#f8fafc,#f1f5f9)]"
    >
      <PackageOpen size={42} strokeWidth={1.15} className="text-slate-300" aria-hidden="true" />
    </div>
  )
}
