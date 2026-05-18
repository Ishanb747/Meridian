import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import { computeScore } from '@/lib/scoring'

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

    const whereGoals: any = { cycleId: activeCycle.id }
    const whereUsers: any = { role: 'EMPLOYEE' }

    if (user.role === 'MANAGER') {
      whereGoals.employee = { managerId: user.id }
      whereUsers.managerId = user.id
    }

    // Fetch all goals with achievements
    const goals = await prisma.goal.findMany({
      where: whereGoals,
      include: {
        achievements: true,
        thrustArea: true
      }
    })

    // Fetch employees for heatmap
    const employees = await prisma.user.findMany({
      where: whereUsers,
      include: {
        goals: {
          where: { cycleId: activeCycle.id },
          include: { achievements: true }
        }
      },
      orderBy: [{ department: 'asc' }, { name: 'asc' }]
    })

    // 1. QoQ Trend Data
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    const qoqTrend = quarters.map(q => {
      let totalWeightedScore = 0
      let totalWeightage = 0
      
      goals.forEach(goal => {
        const ach = goal.achievements.find(a => a.quarter === q)
        if (ach && ach.actualValue !== null) {
          const score = computeScore({
            targetValue: goal.targetValue,
            actualValue: ach.actualValue,
            uomType: goal.uomType as any,
            targetDate: goal.targetDate,
            actualDate: ach.actualDate
          }) || 0
          totalWeightedScore += (score * goal.weightage)
          totalWeightage += goal.weightage
        }
      })
      
      const orgAvg = totalWeightage > 0 ? (totalWeightedScore / totalWeightage) : 0
      // Mock department average for now (can be expanded later)
      const deptAvg = orgAvg ? orgAvg + (Math.random() * 10 - 5) : 0
      
      return {
        name: q,
        orgAvg: Math.round(orgAvg),
        deptAvg: Math.max(0, Math.min(100, Math.round(deptAvg)))
      }
    })

    // 2. Goals by Thrust Area
    const thrustAreaCounts: Record<string, number> = {}
    goals.forEach(g => {
      thrustAreaCounts[g.thrustArea.name] = (thrustAreaCounts[g.thrustArea.name] || 0) + 1
    })
    const thrustAreaData = Object.keys(thrustAreaCounts).map(name => ({
      name,
      value: thrustAreaCounts[name]
    }))

    // 3. Goals by Status
    const statusCounts: Record<string, number> = {}
    goals.forEach(g => {
      statusCounts[g.status] = (statusCounts[g.status] || 0) + 1
    })
    const statusData = Object.keys(statusCounts).map(name => ({
      name,
      value: statusCounts[name]
    }))

    // 4. Heatmap Data
    const heatmapData = employees.map(emp => {
      const qScores = quarters.map(q => {
        let tScore = 0
        let tWeight = 0
        emp.goals.forEach(goal => {
          const ach = goal.achievements.find(a => a.quarter === q)
          if (ach && ach.actualValue !== null) {
            const score = computeScore({
              targetValue: goal.targetValue,
              actualValue: ach.actualValue,
              uomType: goal.uomType as any,
              targetDate: goal.targetDate,
              actualDate: ach.actualDate
            }) || 0
            tScore += (score * goal.weightage)
            tWeight += goal.weightage
          }
        })
        return tWeight > 0 ? Math.round(tScore / tWeight) : null
      })
      
      return {
        id: emp.id,
        name: emp.name,
        department: emp.department || 'General',
        q1: qScores[0],
        q2: qScores[1],
        q3: qScores[2],
        q4: qScores[3]
      }
    })

    return NextResponse.json({
      qoqTrend,
      thrustAreaData,
      statusData,
      heatmapData
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
