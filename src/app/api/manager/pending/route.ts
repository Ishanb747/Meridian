import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import prisma from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireRole('MANAGER')
    if ('error' in auth) return auth.error

    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true },
    })

    if (!activeCycle) {
      return NextResponse.json([])
    }

    // Get direct reports with submitted goals
    const reports = await prisma.user.findMany({
      where: auth.user.role === 'ADMIN' ? { deletedAt: null, role: { in: ['EMPLOYEE', 'MANAGER'] } } : { managerId: auth.user.id, deletedAt: null },
    })

    const pendingApprovals = await Promise.all(
      reports.map(async (report) => {
        const submittedGoals = await prisma.goal.findMany({
          where: {
            employeeId: report.id,
            cycleId: activeCycle.id,
            status: 'SUBMITTED',
          },
          include: { thrustArea: true },
        })

        if (submittedGoals.length === 0) return null

        const totalWeightage = submittedGoals.reduce((sum, g) => sum + g.weightage, 0)

        return {
          employee: {
            id: report.id,
            name: report.name,
            email: report.email,
            department: report.department,
          },
          goalsCount: submittedGoals.length,
          totalWeightage,
          submittedAt: submittedGoals[0].updatedAt,
        }
      })
    )

    return NextResponse.json(pendingApprovals.filter(Boolean))
  } catch (error) {
    console.error('Error fetching pending approvals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
