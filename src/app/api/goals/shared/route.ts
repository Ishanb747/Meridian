import { NextRequest, NextResponse } from 'next/server'
import { requireRole, withAuditContext } from '@/lib/api-auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole('MANAGER')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { title, description, thrustAreaId, uomType, targetValue, targetDate, recipientIds } = body

    if (!title || !thrustAreaId || !uomType || !recipientIds?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (uomType === 'TIMELINE' && !targetDate) {
      return NextResponse.json({ error: 'Target date is required for timeline goals' }, { status: 400 })
    }

    if (!['TIMELINE', 'ZERO'].includes(uomType) && (targetValue === undefined || targetValue === null)) {
      return NextResponse.json({ error: 'Target value is required for this UoM' }, { status: 400 })
    }

    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true },
    })

    if (!activeCycle) {
      return NextResponse.json({ error: 'No active cycle' }, { status: 404 })
    }

    const recipientFilter = auth.user.role === 'ADMIN'
      ? { id: { in: recipientIds }, deletedAt: null }
      : { id: { in: recipientIds }, managerId: auth.user.id, deletedAt: null }
    const recipients = await prisma.user.findMany({ where: recipientFilter })

    if (recipients.length !== recipientIds.length) {
      return NextResponse.json({ error: 'One or more recipients are not valid for this user' }, { status: 403 })
    }

    const result = await withAuditContext(auth.user.id, async () => {
      // Create the primary goal (shared goal owner)
      const sharedGoal = await prisma.goal.create({
      data: {
        title,
        description,
        thrustAreaId,
        uomType,
        targetValue: ['TIMELINE', 'ZERO'].includes(uomType) ? null : targetValue,
        targetDate: targetDate ? new Date(targetDate) : null,
        weightage: 0,
        employeeId: auth.user.id,
        managerId: auth.user.role === 'MANAGER' ? auth.user.id : null,
        cycleId: activeCycle.id,
        status: 'APPROVED',
        isSharedGoal: true,
        lockedAt: new Date(),
        lockedBy: auth.user.id,
      },
    })

    // Create shared goal instances for each recipient
      const weightagePerRecipient = 10

      for (const recipientId of recipientIds) {
        await prisma.goal.create({
        data: {
          title,
          description,
          thrustAreaId,
          uomType,
          targetValue: ['TIMELINE', 'ZERO'].includes(uomType) ? null : targetValue,
          targetDate: targetDate ? new Date(targetDate) : null,
          weightage: weightagePerRecipient,
          employeeId: recipientId,
          managerId: auth.user.role === 'MANAGER' ? auth.user.id : null,
          cycleId: activeCycle.id,
          status: 'APPROVED',
          isSharedGoal: true,
          sharedFromGoalId: sharedGoal.id,
          lockedAt: new Date(),
          lockedBy: auth.user.id,
        },
      })

        await prisma.sharedGoalAssignment.create({
        data: {
          sourceGoalId: sharedGoal.id,
          recipientId,
          customWeightage: weightagePerRecipient,
          assignedById: auth.user.id,
        },
      })
      }

      return sharedGoal
    })

    return NextResponse.json({
      success: true,
      message: `Goal pushed to ${recipientIds.length} employee${recipientIds.length > 1 ? 's' : ''}`,
      goal: result,
    })
  } catch (error) {
    console.error('Error creating shared goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
