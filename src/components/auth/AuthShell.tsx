import Link from 'next/link'

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-md',
}: {
  eyebrow?: string
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}) {
  return (
    <main className="min-h-[calc(100vh-70px)] bg-[#FAFAFB] px-4 py-10 sm:py-14">
      <div className={`mx-auto flex w-full ${maxWidth} flex-col`}>
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-baseline gap-1.5" aria-label="Volver a ZAP Tienda">
            <span className="text-3xl font-black tracking-[-0.06em] text-gray-950">ZAP</span>
            <span className="text-2xl font-normal tracking-[-0.04em] text-gray-500">Tienda</span>
          </Link>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-gray-200/80 bg-white shadow-[0_18px_60px_-28px_rgba(15,23,42,0.28)]">
          <div className="h-1 bg-[linear-gradient(90deg,#ED164F_0%,#4576B9_100%)]" />
          <div className="px-6 pb-7 pt-8 text-center sm:px-9 sm:pt-9">
            {eyebrow && (
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ED164F]">
                {eyebrow}
              </p>
            )}
            <h1 className="text-2xl font-black tracking-tight text-gray-950 sm:text-[28px]">{title}</h1>
            {description && (
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">{description}</p>
            )}
          </div>

          <div className="px-6 pb-8 sm:px-9 sm:pb-9">
            {children}
          </div>
        </section>

        {footer && <div className="mt-5 text-center">{footer}</div>}
      </div>
    </main>
  )
}
