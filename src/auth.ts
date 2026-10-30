import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { PUBLIC_LOGOUT_URL, PUBLIC_SITE_URL } from '@/lib/public-site-url'

function isSafeInternalPath(value: string, baseUrl: string) {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /%5c/i.test(value) || /[\u0000-\u001f\u007f]/.test(value)) return false
  try { return new URL(value, baseUrl).origin === new URL(baseUrl).origin } catch { return false }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) return null
        if (user.isBanned) throw new Error('Cuenta bloqueada por el administrador')

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        } as any
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url === PUBLIC_LOGOUT_URL || url === PUBLIC_SITE_URL) return PUBLIC_LOGOUT_URL
      if (isSafeInternalPath(url, baseUrl)) return `${baseUrl}${url}`
      try {
        if (new URL(url).origin === baseUrl) return url
      } catch {
        return baseUrl
      }
      return baseUrl
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }

      if (token.id) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            email: true,
            name: true,
            role: true,
            isBanned: true,
          },
        })

        if (!currentUser || currentUser.isBanned) {
          delete token.id
          delete token.email
          delete token.name
          token.role = 'CUSTOMER'
          return token
        }

        token.email = currentUser.email
        token.name = currentUser.name
        token.role = currentUser.role
      }

      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: { signIn: '/login' },
})
