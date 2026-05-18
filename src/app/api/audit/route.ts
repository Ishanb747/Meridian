import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const postLockOnly = searchParams.get('postLockOnly') === 'true'

    const where: any = {}
    if (postLockOnly) {
      where.isPostLock = true
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // simplistic pagination for now
    })

    return NextResponse.json(auditLogs)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
