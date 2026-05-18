import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goalId } = await params
    const body = await req.json()
    const { reason } = body

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Reason is required for unlocking' }, { status: 400 })
    }

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: { employee: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    if (goal.status !== 'LOCKED') {
      return NextResponse.json({ error: 'Goal is not locked' }, { status: 400 })
    }

    // Update goal to APPROVED (editable again)
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        status: 'APPROVED',
        lockedAt: null,
        lockedBy: null,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        entityType: 'Goal',
        entityId: goalId,
        action: 'UNLOCK',
        oldValue: { status: 'LOCKED', lockedBy: goal.lockedBy },
        newValue: { status: 'APPROVED' },
        reason,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Goal unlocked successfully',
      goal: updatedGoal,
    })
  } catch (error) {
    console.error('Error unlocking goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}