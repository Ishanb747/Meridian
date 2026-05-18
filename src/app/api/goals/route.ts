import { NextRequest, NextResponse } from 'next/server'
import { requireRole, withAuditContext } from '@/lib/api-auth'
import prisma from '@/lib/prisma'

function validateGoalPayload(body: {
  title?: string
  thrustAreaId?: string
  uomType?: string
  targetValue?: number | null
  targetDate?: string | null
  weightage?: number
}) {
  if (!body.title?.trim() || !body.thrustAreaId || !body.uomType || body.weightage === undefined) {
    return 'Missing required fields'
  }

  if (body.weightage < 10 || body.weightage > 100) {
    return 'Weightage must be between 10 and 100'
  }

  if (body.uomType === 'TIMELINE' && !body.targetDate) {
    return 'Target date is required for timeline goals'
  }

  if (!['TIMELINE', 'ZERO'].includes(body.uomType) && (body.targetValue === undefined || body.targetValue === null)) {
    return 'Target value is required for this UoM'
  }

  return null
}

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireRole()
    if ('error' in auth) return auth.error

    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true },
    })

    if (!activeCycle) {
      return NextResponse.json({ error: 'No active cycle' }, { status: 404 })
    }

    const goals = await prisma.goal.findMany({
      where: {
        employeeId: auth.user.id,
        cycleId: activeCycle.id,
      },
      include: {
        thrustArea: true,
        approvals: {
          include: { manager: true },
          orderBy: { actedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole()
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { title, description, thrustAreaId, uomType, targetValue, targetDate, weightage } = body

    const validationError = validateGoalPayload({ title, thrustAreaId, uomType, targetValue, targetDate, weightage })
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true },
    })

    if (!activeCycle) {
      return NextResponse.json({ error: 'No active cycle' }, { status: 404 })
    }

    if (activeCycle.currentPhase !== 'GOAL_SETTING') {
      return NextResponse.json({ error: 'Goal setting window is closed' }, { status: 400 })
    }

    // Check max 8 goals
    const existingGoals = await prisma.goal.count({
      where: {
        employeeId: auth.user.id,
        cycleId: activeCycle.id,
        status: { in: ['DRAFT', 'RETURNED'] },
      },
    })

    if (existingGoals >= 8) {
      return NextResponse.json({ error: 'Maximum 8 goals allowed per cycle' }, { status: 400 })
    }

    const thrustArea = await prisma.thrustArea.findUnique({ where: { id: thrustAreaId } })
    if (!thrustArea) {
      return NextResponse.json({ error: 'Invalid thrust area' }, { status: 400 })
    }

    const goal = await withAuditContext(auth.user.id, () => prisma.goal.create({
      data: {
        title,
        description,
        thrustAreaId,
        uomType,
        targetValue: ['TIMELINE', 'ZERO'].includes(uomType) ? null : targetValue,
        targetDate: targetDate ? new Date(targetDate) : null,
        weightage,
        employeeId: auth.user.id,
        cycleId: activeCycle.id,
        managerId: auth.user.managerId,
        status: 'DRAFT',
      },
      include: {
        thrustArea: true,
      },
    }))

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
