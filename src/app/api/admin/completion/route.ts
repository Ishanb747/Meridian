import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true }
    })
    
    if (!activeCycle) {
      return NextResponse.json({ error: 'No active cycle' }, { status: 404 })
    }

    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      include: {
        goals: {
          where: { cycleId: activeCycle.id },
          include: { achievements: true }
        },
        employeeCheckins: {
          where: { cycleId: activeCycle.id }
        }
      }
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
