import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, TrendingUp, Clock, Calendar } from 'lucide-react'

async function getEmployeeStats(employeeId: string) {
  const activeCycle = await prisma.cycle.findFirst({
    where: { isActive: true },
  })

  if (!activeCycle) {
    return {
      goalsCount: 0,
      weightageTotal: 0,
      currentPhase: 'N/A',
      daysUntilDeadline: 0,
      cycleName: 'None',
    }
  }

  const phaseLabels: Record<string, string> = {
    GOAL_SETTING: 'Goal Setting',
    Q1_CHECKIN: 'Q1 Check-in',
    Q2_CHECKIN: 'Q2 Check-in',
    Q3_CHECKIN: 'Q3 Check-in',
    Q4_ANNUAL: 'Q4 Annual',
    CLOSED: 'Closed',
  }

  const goals = await prisma.goal.findMany({
    where: { employeeId, cycleId: activeCycle.id },
    select: { weightage: true },
  })

  const phaseDeadline =
    activeCycle.currentPhase === 'GOAL_SETTING'
      ? activeCycle.q1Open
      : activeCycle.currentPhase === 'Q1_CHECKIN'
        ? activeCycle.q2Open
        : activeCycle.currentPhase === 'Q2_CHECKIN'
          ? activeCycle.q3Open
          : activeCycle.currentPhase === 'Q3_CHECKIN'
            ? activeCycle.q4Open
            : null

  const daysUntilDeadline = phaseDeadline
    ? Math.ceil((phaseDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return {
    goalsCount: goals.length,
    weightageTotal: goals.reduce((sum, goal) => sum + goal.weightage, 0),
    currentPhase: phaseLabels[activeCycle.currentPhase] || activeCycle.currentPhase,
    daysUntilDeadline: Math.max(0, daysUntilDeadline),
    cycleName: activeCycle.name,
  }
}

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const stats = await getEmployeeStats(session.user.id)
  const activeCycle = await prisma.cycle.findFirst({
    where: { isActive: true },
  })

  const phaseLabels: Record<string, string> = {
    GOAL_SETTING: 'Goal Setting',
    Q1_CHECKIN: 'Q1 Check-in',
    Q2_CHECKIN: 'Q2 Check-in',
    Q3_CHECKIN: 'Q3 Check-in',
    Q4_ANNUAL: 'Q4 Annual',
    CLOSED: 'Closed',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">My Dashboard</h1>
        <p className="text-text-secondary mt-1">
          {activeCycle ? `${activeCycle.name} — ${phaseLabels[activeCycle.currentPhase]}` : 'No active cycle'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">My Goals</p>
                <p className="text-2xl font-mono font-semibold text-text-primary">{stats.goalsCount}</p>
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
                <p className="text-sm text-text-secondary">Weightage Total</p>
                <p className="text-2xl font-mono font-semibold text-text-primary">{stats.weightageTotal}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-info-subtle flex items-center justify-center">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Current Phase</p>
                <Badge variant="accent">{stats.currentPhase}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-warning-subtle flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Days Until Deadline</p>
                <p className="text-2xl font-mono font-semibold text-text-primary">{stats.daysUntilDeadline}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goal Sheet Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Goal Sheet Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-text-secondary">No goals created yet</p>
            <p className="text-sm text-text-muted mt-1">Create your first goal to get started</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-text-muted">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
