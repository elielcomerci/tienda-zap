type ProductMediaBlockProps = {
  mediaType?: string | null
  mediaUrl?: string | null
  mediaTitle?: string | null
  productName: string
}

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const videoId =
      host === 'youtu.be'
        ? parsed.pathname.split('/').filter(Boolean)[0]
        : parsed.pathname.startsWith('/shorts/')
          ? parsed.pathname.split('/').filter(Boolean)[1]
          : parsed.searchParams.get('v') ||
            (parsed.pathname.startsWith('/embed/')
              ? parsed.pathname.split('/').filter(Boolean)[1]
              : null)

    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
  } catch {
    return url
  }
}

export default function ProductMediaBlock({
  mediaType,
  mediaUrl,
  mediaTitle,
  productName,
}: ProductMediaBlockProps) {
  if (!mediaUrl || !mediaType || mediaType === 'NONE') return null

  const title = mediaTitle || productName

  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-gray-200 bg-white p-4 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.45)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-gray-900">
          {mediaType === 'AUDIO' ? 'Escuchar demo' : 'Ver demo'}
        </h2>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          {mediaType === 'YOUTUBE' ? 'YouTube' : mediaType === 'VIDEO' ? 'MP4' : 'Audio'}
        </span>
      </div>

      {mediaType === 'AUDIO' && (
        <div className="rounded-2xl bg-gray-950 p-4 text-white">
          <p className="mb-3 text-sm font-semibold">{title}</p>
          <audio controls src={mediaUrl} preload="none" className="w-full">
            Tu navegador no soporta el elemento de audio.
          </audio>
        </div>
      )}

      {mediaType === 'VIDEO' && (
        <video
          controls
          src={mediaUrl}
          preload="metadata"
          className="aspect-video w-full rounded-2xl bg-black object-contain"
        >
          Tu navegador no soporta el elemento de video.
        </video>
      )}

      {mediaType === 'YOUTUBE' && (
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={getYouTubeEmbedUrl(mediaUrl)}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </section>
  )
}
