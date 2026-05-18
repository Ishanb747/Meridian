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
    const cycleId = searchParams.get('cycleId')

    const activeCycle = cycleId ? { id: cycleId } : await prisma.cycle.findFirst({ where: { isActive: true } })
    if (!activeCycle) return NextResponse.json({ error: 'No active cycle' }, { status: 404 })

    const where: any = { role: 'EMPLOYEE' }
    if (user.role === 'MANAGER') {
      where.managerId = user.id
    }

    const employees = await prisma.user.findMany({
      where,
      include: {
        goals: {
          where: { cycleId: activeCycle.id },
          include: { achievements: true }
        },
        employeeCheckins: {
          where: { cycleId: activeCycle.id }
        },
        exemptions: {
          where: { cycleId: activeCycle.id }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
