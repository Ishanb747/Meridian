import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { getCycleWindow } from '@/lib/window-logic'

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireRole('MANAGER')
    if ('error' in auth) return auth.error

    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true }
    })
    
    if (!activeCycle) {
      return NextResponse.json({ error: 'No active cycle' }, { status: 404 })
    }

    const window = getCycleWindow(activeCycle)
    const quarter = window?.quarter || 'Q1'

    const team = await prisma.user.findMany({
      where: { managerId: auth.user.id, deletedAt: null },
      include: {
        employeeCheckins: {
          where: { cycleId: activeCycle.id, quarter }
        },
        goals: {
          where: { cycleId: activeCycle.id, status: { in: ['APPROVED', 'LOCKED'] } },
          include: {
            achievements: true
          }
        },
      },
      orderBy: { name: 'asc' },
    })

    const rows = team.map((member) => {
      const achievementsForQuarter = member.goals.flatMap((goal) =>
        goal.achievements.filter((achievement) => achievement.quarter === quarter)
      )
      const weightedScore = member.goals.reduce((sum, goal) => {
        const achievement = goal.achievements.find((item) => item.quarter === quarter)
        return sum + ((achievement?.computedScore ?? 0) * goal.weightage)
      }, 0) / Math.max(member.goals.reduce((sum, goal) => sum + goal.weightage, 0), 1)

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        department: member.department,
        goalsCount: member.goals.length,
        achievementsLogged: achievementsForQuarter.length,
        averageScore: Math.round(weightedScore * 100),
        checkin: member.employeeCheckins[0] || null,
        checkinStatus: member.employeeCheckins.length > 0 ? 'DONE' : 'PENDING',
        lastUpdated: achievementsForQuarter
          .map((achievement) => achievement.updatedAt)
          .sort((a, b) => b.getTime() - a.getTime())[0] || null,
      }
    })

    return NextResponse.json({ cycle: activeCycle, window, quarter, team: rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
