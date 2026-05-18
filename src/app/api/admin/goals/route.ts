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
    const status = searchParams.get('status')
    const includeAchievements = searchParams.get('includeAchievements') === 'true'

    const activeCycle = await prisma.cycle.findFirst({ where: { isActive: true } })
    if (!activeCycle) return NextResponse.json({ error: 'No active cycle' }, { status: 404 })

    const where: any = { cycleId: activeCycle.id }
    if (status) where.status = status

    const goals = await prisma.goal.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, department: true, managerId: true } },
        thrustArea: { select: { name: true, color: true } },
        ...(includeAchievements ? { achievements: true } : {}),
      },
      orderBy: { employee: { name: 'asc' } },
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
