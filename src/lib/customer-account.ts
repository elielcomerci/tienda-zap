import { prisma } from '@/lib/prisma'

/**
 * Resolves a business account only when the identity is unambiguous.
 * A registered user ID takes precedence over email. Multiple accounts for
 * the same identifier are treated as unresolved rather than guessed.
 */
export async function findUniqueBusinessAccountId(input: {
  userId?: string | null
  email?: string | null
}): Promise<string | null> {
  if (input.userId) {
    const userAccounts = await prisma.businessAccount.findMany({
      where: { userId: input.userId },
      select: { id: true },
      take: 2,
    })
    if (userAccounts.length === 1) return userAccounts[0].id
    if (userAccounts.length > 1) return null
  }

  const email = input.email?.trim()
  if (!email) return null

  const emailAccounts = await prisma.businessAccount.findMany({
    where: {
      OR: [
        { user: { is: { email: { equals: email, mode: 'insensitive' } } } },
        { contacts: { some: { email: { equals: email, mode: 'insensitive' } } } },
      ],
    },
    select: { id: true },
    take: 2,
  })

  return emailAccounts.length === 1 ? emailAccounts[0].id : null
}
