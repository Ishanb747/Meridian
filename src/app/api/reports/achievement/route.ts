import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user || !['MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const quarter = searchParams.get('quarter')
    const cycleId = searchParams.get('cycleId')

    const activeCycle = cycleId ? { id: cycleId } : await prisma.cycle.findFirst({ where: { isActive: true } })
    if (!activeCycle) return NextResponse.json({ error: 'No active cycle' }, { status: 404 })

    const where: any = {
      cycleId: activeCycle.id
    }
    if (quarter) where.quarter = quarter
    
    if (user.role === 'MANAGER') {
      where.goal = { employee: { managerId: user.id } }
    }

    const achievements = await prisma.achievement.findMany({
      where,
      include: {
        goal: {
          include: {
            employee: true,
            thrustArea: true
          }
        }
      },
      orderBy: { goal: { employee: { name: 'asc' } } }
    })

    return NextResponse.json(achievements)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
