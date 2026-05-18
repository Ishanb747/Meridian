import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import AzureADProvider from 'next-auth/providers/azure-ad'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { Role } from '@prisma/client'

export async function getUser() {
  const session = await getServerSession(authOptions)
  return session?.user || null
}

const azureConfigured =
  !!process.env.AZURE_AD_CLIENT_ID &&
  !!process.env.AZURE_AD_CLIENT_SECRET &&
  !!process.env.AZURE_AD_TENANT_ID

function mapAzureRole(groups: unknown): Role {
  if (!groups || !process.env.AZURE_ROLE_MAP) return 'EMPLOYEE'

  try {
    const roleMap = JSON.parse(process.env.AZURE_ROLE_MAP) as Record<string, Role>
    const groupList = Array.isArray(groups) ? groups : []
    for (const group of groupList) {
      const role = roleMap[String(group)]
      if (role) return role
    }
  } catch {
    return 'EMPLOYEE'
  }

  return 'EMPLOYEE'
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || user.deletedAt) return null

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          managerId: user.managerId,
          department: user.department,
        }
      },
    }),
    ...(azureConfigured
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'azure-ad') return true

      const email = user.email || profile?.email
      if (!email) return false

      const role = mapAzureRole((profile as { groups?: unknown } | undefined)?.groups)
      const existingUser = await prisma.user.findUnique({ where: { email } })

      if (existingUser?.deletedAt) return false

      const syncedUser = existingUser
        ? await prisma.user.update({
            where: { email },
            data: {
              name: user.name || existingUser.name,
              role,
              avatarUrl: user.image || existingUser.avatarUrl,
            },
          })
        : await prisma.user.create({
            data: {
              name: user.name || email,
              email,
              passwordHash: '',
              role,
              avatarUrl: user.image,
            },
          })

      user.id = syncedUser.id
      user.role = syncedUser.role
      user.managerId = syncedUser.managerId
      user.department = syncedUser.department
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.managerId = user.managerId
        token.department = user.department
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.managerId = token.managerId as string | null
        session.user.department = token.department as string | null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
