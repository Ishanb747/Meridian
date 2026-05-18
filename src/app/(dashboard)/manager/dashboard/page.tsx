import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Users, FileCheck, ClipboardCheck, TrendingUp } from 'lucide-react'

async function getManagerStats(managerId: string) {
  const activeCycle = await prisma.cycle.findFirst({ where: { isActive: true } })
  const reports = await prisma.user.findMany({ where: { managerId, deletedAt: null } })

  if (!activeCycle) {
    return { teamSize: reports.length, goalsPending: 0, checkinsPending: reports.length, completionRate: 0 }
  }

  const [goalsPending, completedCheckins] = await Promise.all([
    prisma.goal.groupBy({
      by: ['employeeId'],
      where: {
        cycleId: activeCycle.id,
        status: 'SUBMITTED',
        employee: { managerId },
      },
    }),
    prisma.checkinSession.count({
      where: { managerId, cycleId: activeCycle.id },
    }),
  ])

  return {
    teamSize: reports.length,
    goalsPending: goalsPending.length,
    checkinsPending: Math.max(0, reports.length - completedCheckins),
    completionRate: reports.length ? Math.round((completedCheckins / reports.length) * 100) : 0,
  }
}

export default async function ManagerDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const stats = await getManagerStats(session.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">Team Dashboard</h1>
        <p className="text-text-secondary mt-1">Manage your team&apos;s goals and check-ins</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Team Size</p>
                <p className="text-2xl font-mono font-semibold text-text-primary">{stats.teamSize}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-warning-subtle flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Goals Pending</p>
                <p className="text-2xl font-mono font-semibold text-text-primary">{stats.goalsPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-info-subtle flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Check-ins Pending</p>
                <p className="text-2xl font-mono font-semibold text-text-primary">{stats.checkinsPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-success-subtle flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Completion %</p>
                <p className="text-2xl font-mono font-semibold text-text-primary">{stats.completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-text-muted">No pending approvals</p>
        </CardContent>
      </Card>

      {/* Team Status */}
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-text-muted">No team members yet</p>
        </CardContent>
      </Card>
    </div>
  )
}
