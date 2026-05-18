import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const auth = await requireRole()
  if ('error' in auth) return auth.error

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      managerId: true,
      avatarUrl: true,
      deletedAt: true,
      manager: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  if (!user || user.deletedAt) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { deletedAt: _deletedAt, ...profile } = user
  return NextResponse.json(profile)
}
