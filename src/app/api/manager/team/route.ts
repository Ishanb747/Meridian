import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const auth = await requireRole('MANAGER')
  if ('error' in auth) return auth.error

  const users = await prisma.user.findMany({
    where: auth.user.role === 'ADMIN'
      ? { deletedAt: null, role: { in: ['EMPLOYEE', 'MANAGER'] } }
      : { deletedAt: null, managerId: auth.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(users)
}
