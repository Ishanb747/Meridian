import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Target, CheckCircle, ClipboardCheck } from 'lucide-react'

async function getAdminStats() {
  const [totalEmployees, allUsers, activeCycle] = await Promise.all([
    prisma.user.count({ where: { role: 'EMPLOYEE', deletedAt: null } }),
    prisma.user.findMany({ where: { deletedAt: null }, select: { role: true } }),
    prisma.cycle.findFirst({ where: { isActive: true } }),
  ])

  const managersCount = allUsers.filter((u) => u.role === 'MANAGER').length
  const [submittedOrLocked, totalGoals, checkins, employees] = await Promise.all([
    activeCycle
      ? prisma.goal.count({ where: { cycleId: activeCycle.id, status: { in: ['SUBMITTED', 'APPROVED', 'LOCKED'] } } })
      : 0,
    activeCycle ? prisma.goal.count({ where: { cycleId: activeCycle.id } }) : 0,
    activeCycle ? prisma.checkinSession.count({ where: { cycleId: activeCycle.id } }) : 0,
    prisma.user.count({ where: { role: 'EMPLOYEE', deletedAt: null } }),
  ])

  return {
    totalEmployees: totalEmployees + managersCount,
    goalsSubmitted: submittedOrLocked,
    approvalRate: totalGoals ? Math.round((submittedOrLocked / totalGoals) * 100) : 0,
    checkinCompletion: employees ? Math.round((checkins / employees) * 100) : 0,
    activeCycle: activeCycle ? activeCycle.name : 'None',
  }
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  if (session.user.role !== 'ADMIN') {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Access denied. Admin only.</p>
      </div>
    )
  }

  const stats = await getAdminStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">Admin Dashboard</h1>
        <p className="text-text-secondary mt-1">Organization overview and management</p>
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
                <p className="text-sm text-text-secondary">Total Employees</p>
                <p className="text-2xl font-mono font-semibold text-text-primary">{stats.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-warning-subtle flex items-center justify-center">
                <Target className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Goals Submitted</p>
                <p className="text-2xl font-mono font-semibold text-text-primary">{stats.goalsSubmitted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-success-subtle flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Approval Rate</p>
                <p className="text-2xl font-mono font-semibold text-text-primary">{stats.approvalRate}%</p>
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
                <p className="text-sm text-text-secondary">Check-in Completion</p>
                <p className="text-2xl font-mono font-semibold text-text-primary">{stats.checkinCompletion}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Cycle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Cycle</CardTitle>
            <Badge variant="success">{stats.activeCycle}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-text-muted">No active cycle configured</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Audit Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-text-muted">No audit events yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
