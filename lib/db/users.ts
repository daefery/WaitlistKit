import { prisma } from './prisma'

export async function upsertUser(clerkId: string, email: string, name: string) {
  return prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, email, name },
    update: { email, name },
  })
}
