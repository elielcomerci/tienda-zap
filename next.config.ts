import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/productos/bonos-para-lavaderos', destination: '/productos/talonarios-formularios', permanent: true }]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'media.zap.com.ar',
      },
    ],
  },
}

export default nextConfig
