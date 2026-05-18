import { NextRequest, NextResponse } from 'next/server'
import { requireRole, withAuditContext } from '@/lib/api-auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireRole('MANAGER')
    if ('error' in auth) return auth.error

    const { userId } = await params

    // Verify manager has access to this employee
    const employee = await prisma.user.findFirst({
      where: {
        id: userId,
        managerId: auth.user.id,
        deletedAt: null,
      },
    })

    if (!employee && auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true },
    })

    if (!activeCycle) {
      return NextResponse.json({ error: 'No active cycle' }, { status: 404 })
    }

    const goals = await prisma.goal.findMany({
      where: {
        employeeId: userId,
        cycleId: activeCycle.id,
        status: { in: ['SUBMITTED', 'APPROVED', 'LOCKED', 'RETURNED'] },
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

    const employeeData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        department: true,
        manager: true,
      },
    })

    return NextResponse.json({
      employee: employeeData,
      goals,
    })
  } catch (error) {
    console.error('Error fetching employee goals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireRole('MANAGER')
    if ('error' in auth) return auth.error

    const { userId } = await params
    const body = await req.json()
    const { goalId, targetValue, weightage } = body

    if (!goalId) {
      return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })
    }

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: { employee: true },
    })

    if (!goal || goal.employeeId !== userId) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    if (goal.employee.managerId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (goal.status !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Only submitted goals can be edited during review' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (targetValue !== undefined) updateData.targetValue = targetValue
    if (weightage !== undefined) {
      if (weightage < 10 || weightage > 100) {
        return NextResponse.json({ error: 'Weightage must be between 10 and 100' }, { status: 400 })
      }
      updateData.weightage = weightage
    }

    const updatedGoal = await withAuditContext(auth.user.id, () => prisma.goal.update({
      where: { id: goalId },
      data: updateData,
      include: { thrustArea: true },
    }))

    return NextResponse.json(updatedGoal)
  } catch (error) {
    console.error('Error updating goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
