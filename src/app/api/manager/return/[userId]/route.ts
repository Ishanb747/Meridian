import { NextRequest, NextResponse } from 'next/server'
import { requireRole, withAuditContext } from '@/lib/api-auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireRole('MANAGER')
    if ('error' in auth) return auth.error

    const { userId } = await params
    const body = await req.json()
    const { comment } = body

    if (!comment || comment.trim().length === 0) {
      return NextResponse.json({ error: 'Comment is required for returning goals' }, { status: 400 })
    }

    const employee = await prisma.user.findUnique({ where: { id: userId } })
    if (!employee || employee.deletedAt || (employee.managerId !== auth.user.id && auth.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true },
    })

    if (!activeCycle) {
      return NextResponse.json({ error: 'No active cycle' }, { status: 404 })
    }

    // Get all SUBMITTED goals for this employee
    const goals = await prisma.goal.findMany({
      where: {
        employeeId: userId,
        cycleId: activeCycle.id,
        status: 'SUBMITTED',
      },
    })

    if (goals.length === 0) {
      return NextResponse.json({ error: 'No submitted goals to return' }, { status: 400 })
    }

    const now = new Date()

    await withAuditContext(auth.user.id, () => prisma.$transaction([
      ...goals.map((goal) =>
        prisma.goal.update({
          where: { id: goal.id },
          data: { status: 'RETURNED' },
        })
      ),
      ...goals.map((goal) =>
        prisma.goalApproval.create({
          data: {
            goalId: goal.id,
            managerId: auth.user.id,
            action: 'RETURNED',
            comment,
            actedAt: now,
          },
        })
      ),
    ]))

    return NextResponse.json({ success: true, message: `${goals.length} goals returned for rework` })
  } catch (error) {
    console.error('Error returning goals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
