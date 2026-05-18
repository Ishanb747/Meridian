import { NextRequest, NextResponse } from 'next/server'
import { requireRole, withAuditContext } from '@/lib/api-auth'
import prisma from '@/lib/prisma'

export async function POST(_req: NextRequest) {
  try {
    const auth = await requireRole()
    if ('error' in auth) return auth.error

    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true },
    })

    if (!activeCycle) {
      return NextResponse.json({ error: 'No active cycle' }, { status: 404 })
    }

    if (activeCycle.currentPhase !== 'GOAL_SETTING') {
      return NextResponse.json({ error: 'Goal submission window is closed' }, { status: 400 })
    }

    const goals = await prisma.goal.findMany({
      where: {
        employeeId: auth.user.id,
        cycleId: activeCycle.id,
        status: { in: ['DRAFT', 'RETURNED', 'APPROVED'] },
        sharedFromGoalId: { not: null },
      },
    })

    const ownGoals = await prisma.goal.findMany({
      where: {
        employeeId: auth.user.id,
        cycleId: activeCycle.id,
        status: { in: ['DRAFT', 'RETURNED'] },
        isSharedGoal: false,
      },
    })

    const submissionGoals = [...ownGoals, ...goals]

    const errors: string[] = []

    // Rule 1: At least 1 goal
    if (submissionGoals.length === 0) {
      errors.push('You must have at least one goal')
    }

    // Rule 2: Max 8 goals
    if (ownGoals.length > 8) {
      errors.push('Maximum 8 goals allowed per cycle')
    }

    // Rule 3: Min 10% weightage each
    const underweight = submissionGoals.filter((g) => g.weightage < 10)
    if (underweight.length > 0) {
      errors.push(`${underweight.length} goal(s) have weightage below the minimum 10%`)
    }

    // Rule 4: Total weightage = 100%
    const total = submissionGoals.reduce((sum, g) => sum + g.weightage, 0)
    if (Math.round(total) !== 100) {
      errors.push(`Total weightage is ${total}%. Must equal exactly 100%.`)
    }

    // Rule 5: All goals must have required fields
    const invalidGoals = submissionGoals.filter(
      (g) =>
        !g.title ||
        !g.thrustAreaId ||
        !g.uomType ||
        (g.uomType === 'TIMELINE' && !g.targetDate) ||
        (!['TIMELINE', 'ZERO'].includes(g.uomType) && g.targetValue === null)
    )
    if (invalidGoals.length > 0) {
      errors.push(`${invalidGoals.length} goal(s) have missing required fields`)
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('. ') }, { status: 400 })
    }

    // Update all goals to SUBMITTED
    await withAuditContext(auth.user.id, () => prisma.goal.updateMany({
      where: {
        employeeId: auth.user.id,
        cycleId: activeCycle.id,
        status: { in: ['DRAFT', 'RETURNED'] },
      },
      data: {
        status: 'SUBMITTED',
      },
    }))

    return NextResponse.json({ success: true, message: 'Goals submitted successfully' })
  } catch (error) {
    console.error('Error submitting goals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
