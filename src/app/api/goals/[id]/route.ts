import { NextRequest, NextResponse } from 'next/server'
import { requireRole, withAuditContext } from '@/lib/api-auth'
import prisma from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole()
    if ('error' in auth) return auth.error

    const { id } = await params

    const goal = await prisma.goal.findUnique({
      where: { id },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Only allow editing DRAFT or RETURNED goals
    if (goal.isSharedGoal && goal.sharedFromGoalId) {
      return NextResponse.json({ error: 'Use the shared-goal endpoint to adjust assigned goal weightage' }, { status: 400 })
    }

    if (!['DRAFT', 'RETURNED', 'APPROVED'].includes(goal.status) || goal.lockedAt) {
      return NextResponse.json({ error: 'Cannot edit submitted or approved goals' }, { status: 400 })
    }

    // Only allow own goals to be edited
    if (goal.employeeId !== auth.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, thrustAreaId, uomType, targetValue, targetDate, weightage } = body

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (thrustAreaId !== undefined) updateData.thrustAreaId = thrustAreaId
    if (uomType !== undefined) updateData.uomType = uomType
    if (targetValue !== undefined) updateData.targetValue = targetValue
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null
    if (weightage !== undefined) {
      if (weightage < 10 || weightage > 100) {
        return NextResponse.json({ error: 'Weightage must be between 10 and 100' }, { status: 400 })
      }
      updateData.weightage = weightage
    }

    const updatedGoal = await withAuditContext(auth.user.id, () => prisma.goal.update({
      where: { id },
      data: updateData,
      include: {
        thrustArea: true,
      },
    }))

    return NextResponse.json(updatedGoal)
  } catch (error) {
    console.error('Error updating goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole()
    if ('error' in auth) return auth.error

    const { id } = await params

    const goal = await prisma.goal.findUnique({
      where: { id },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Only allow deleting DRAFT goals
    if (goal.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Can only delete draft goals' }, { status: 400 })
    }

    // Only allow own goals to be deleted
    if (goal.employeeId !== auth.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    await prisma.goal.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
