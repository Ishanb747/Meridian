import { NextRequest, NextResponse } from 'next/server'
import { requireRole, withAuditContext } from '@/lib/api-auth'
import prisma from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole()
    if ('error' in auth) return auth.error

    const { id } = await params
    const { weightage } = await req.json()

    if (typeof weightage !== 'number' || weightage < 10 || weightage > 100) {
      return NextResponse.json({ error: 'Weightage must be between 10 and 100' }, { status: 400 })
    }

    const goal = await prisma.goal.findUnique({ where: { id } })
    if (!goal || goal.employeeId !== auth.user.id || !goal.isSharedGoal || !goal.sharedFromGoalId) {
      return NextResponse.json({ error: 'Shared goal assignment not found' }, { status: 404 })
    }

    const updatedGoal = await withAuditContext(auth.user.id, () =>
      prisma.goal.update({
        where: { id },
        data: { weightage },
        include: { thrustArea: true },
      })
    )

    await prisma.sharedGoalAssignment.updateMany({
      where: { sourceGoalId: goal.sharedFromGoalId, recipientId: auth.user.id },
      data: { customWeightage: weightage },
    })

    return NextResponse.json(updatedGoal)
  } catch (error) {
    console.error('Error updating shared goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
