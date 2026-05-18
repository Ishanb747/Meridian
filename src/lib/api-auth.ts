import { Role } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { requestContext } from '@/lib/context'

const roleRank: Record<Role, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  ADMIN: 3,
}

export async function getCurrentSession() {
  return getServerSession(authOptions)
}

export async function requireRole(minRole: Role = 'EMPLOYEE') {
  const session = await getCurrentSession()

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const userRole = session.user.role as Role
  if ((roleRank[userRole] ?? 0) < roleRank[minRole]) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { session, user: session.user }
}

export async function withAuditContext<T>(userId: string, callback: () => Promise<T>) {
  return requestContext.run({ userId }, callback)
}
