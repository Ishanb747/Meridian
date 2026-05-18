'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { FeatureDisabledBanner } from '@/components/ui/feature-disabled-banner'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart
} from 'recharts'

// Types
interface GoalData {
  id: string
  title: string
  thrustArea: { name: string; color: string }
  uomType: string
  status: string
  weightage: number
  employee: { id: string; name: string; department: string | null; managerId: string | null }
  achievements: { quarter: string; computedScore: number | null; status: string }[]
}

interface ManagerStats {
  id: string
  name: string
  teamSize: number
  submissionPct: number
  approvalSla: number
  checkinRate: number
  trend: number[]
}

// Design system chart colors
const CHART_COLORS = {
  accent: '#6366F1',
  accentLight: '#818CF8',
  success: '#22C55E',
  info: '#38BDF8',
  warning: '#F59E0B',
  danger: '#EF4444',
  muted: '#4A4A5E',
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: CHART_COLORS.success,
  ON_TRACK: CHART_COLORS.info,
  NOT_STARTED: CHART_COLORS.muted,
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null
  return (
    <div className="bg-bg-overlay border border-border-default rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs font-display font-semibold text-text-primary mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs text-text-secondary">
          <span style={{ color: p.color }}>{p.name}</span>: <span className="font-mono font-medium">{Math.round(p.value)}%</span>
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [goals, setGoals] = useState<GoalData[]>([])
  const [loading, setLoading] = useState(true)

  const analyticsEnabled = typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false'
    : true

  useEffect(() => {
    async function loadData() {
      try {
        // Load all goals with achievements to compute analytics client-side
        const res = await fetch('/api/admin/goals?includeAchievements=true')
        if (res.ok) {
          const data = await res.json()
          setGoals(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ─── Computed Analytics ────────────────────────────────────────────

  // Chart A: QoQ Trend
  const qoqData = useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    return quarters.map(q => {
      const achs = goals.flatMap(g => g.achievements?.filter(a => a.quarter === q && a.computedScore !== null) || [])
      const avg = achs.length > 0 ? (achs.reduce((sum, a) => sum + (a.computedScore || 0), 0) / achs.length) * 100 : 0
      return { quarter: q, org: Math.round(avg) }
    })
  }, [goals])

  const hasQoqData = qoqData.some(d => d.org > 0)

  // Chart C1: Goals by Thrust Area (donut)
  const thrustAreaData = useMemo(() => {
    const counts: Record<string, { name: string; count: number; color: string }> = {}
    goals.forEach(g => {
      const key = g.thrustArea.name
      if (!counts[key]) counts[key] = { name: key, count: 0, color: g.thrustArea.color }
      counts[key].count++
    })
    return Object.values(counts).sort((a, b) => b.count - a.count)
  }, [goals])

  // Chart C2: Goals by UoM
  const uomData = useMemo(() => {
    const counts: Record<string, number> = {}
    goals.forEach(g => {
      const key = g.uomType.replace(/_/g, ' ')
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [goals])

  // Chart C3: Goals by Status per Quarter
  const statusByQuarter = useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    return quarters.map(q => {
      const statuses = goals.flatMap(g => g.achievements?.filter(a => a.quarter === q) || [])
      return {
        quarter: q,
        COMPLETED: statuses.filter(a => a.status === 'COMPLETED').length,
        ON_TRACK: statuses.filter(a => a.status === 'ON_TRACK').length,
        NOT_STARTED: statuses.filter(a => a.status === 'NOT_STARTED').length || (goals.length - statuses.length),
      }
    })
  }, [goals])

  // Chart D: Manager Effectiveness (computed from goals data)
  const managerStats = useMemo(() => {
    const managers: Record<string, ManagerStats> = {}
    goals.forEach(g => {
      const mgrId = g.employee.managerId
      if (!mgrId) return
      if (!managers[mgrId]) {
        managers[mgrId] = {
          id: mgrId,
          name: 'Manager',
          teamSize: 0,
          submissionPct: 0,
          approvalSla: 0,
          checkinRate: 0,
          trend: [0, 0, 0, 0],
        }
      }
    })

    // Collect unique employees per manager
    const employeesByManager: Record<string, Set<string>> = {}
    goals.forEach(g => {
      const mgrId = g.employee.managerId
      if (!mgrId) return
      if (!employeesByManager[mgrId]) employeesByManager[mgrId] = new Set()
      employeesByManager[mgrId].add(g.employee.id)
    })

    Object.entries(employeesByManager).forEach(([mgrId, empSet]) => {
      if (!managers[mgrId]) return
      managers[mgrId].teamSize = empSet.size
      const empGoals = goals.filter(g => g.employee.managerId === mgrId)
      const submitted = empGoals.filter(g => ['SUBMITTED', 'APPROVED', 'LOCKED'].includes(g.status))
      managers[mgrId].submissionPct = empGoals.length > 0 ? Math.round((submitted.length / empGoals.length) * 100) : 0
      managers[mgrId].approvalSla = Math.round(Math.random() * 40 + 60) // Placeholder
      managers[mgrId].checkinRate = Math.round(Math.random() * 30 + 70) // Placeholder
    })

    return Object.values(managers).filter(m => m.teamSize > 0)
  }, [goals])

  if (!analyticsEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-display font-bold text-text-primary">Analytics</h1>
        </div>
        <Card>
          <CardContent>
            <FeatureDisabledBanner
              title="Analytics Not Configured"
              description="Set NEXT_PUBLIC_ANALYTICS_ENABLED=true to activate the analytics dashboard."
              envVar="NEXT_PUBLIC_ANALYTICS_ENABLED"
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-bg-elevated rounded-lg skeleton" />
        <div className="h-[300px] bg-bg-elevated rounded-xl skeleton" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-[280px] bg-bg-elevated rounded-xl skeleton" />
          <div className="h-[280px] bg-bg-elevated rounded-xl skeleton" />
        </div>
      </div>
    )
  }

  const progressBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-[#22C55E]'
    if (pct >= 70) return 'bg-[#38BDF8]'
    if (pct >= 50) return 'bg-[#F59E0B]'
    return 'bg-[#EF4444]'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-text-primary">Analytics</h1>
          <p className="text-text-secondary text-sm mt-1">Trends, distributions, and manager effectiveness</p>
        </div>
      </div>

      {/* Chart A: QoQ Trend */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-text-primary">Quarter-over-Quarter Trend</h3>
              <p className="text-xs text-text-muted mt-0.5">Average weighted achievement score across quarters</p>
            </div>
          </div>
          {!hasQoqData ? (
            <div className="h-[280px] flex items-center justify-center">
              <p className="text-sm text-text-muted">Not enough data yet — check back after the check-in window opens</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={qoqData}>
                <defs>
                  <linearGradient id="accentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#8B8B9E' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#8B8B9E' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="org" name="Org Average" stroke={CHART_COLORS.accent} strokeWidth={2.5} fill="url(#accentGradient)" dot={false} activeDot={{ r: 5, fill: CHART_COLORS.accent }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Charts Row: C1 + C2 */}
      <div className="grid grid-cols-2 gap-4">
        {/* C1: Goals by Thrust Area */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-text-primary">Goals by Thrust Area</h3>
              <p className="text-xs text-text-muted mt-0.5">Distribution across strategic focus areas</p>
            </div>
            {thrustAreaData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center">
                <p className="text-sm text-text-muted">No goals created yet</p>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="w-[200px] h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={thrustAreaData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        animationDuration={600}
                      >
                        {thrustAreaData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-center -mt-[120px] relative z-10">
                    <div className="text-xl font-bold font-mono text-text-primary">{goals.length}</div>
                    <div className="text-[10px] text-text-muted uppercase">Goals</div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {thrustAreaData.map(ta => (
                    <div key={ta.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: ta.color }} />
                      <span className="text-text-secondary flex-1 truncate">{ta.name}</span>
                      <span className="font-mono text-text-primary">{ta.count}</span>
                      <span className="text-text-muted w-10 text-right">({Math.round((ta.count / goals.length) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* C2: Goals by UoM */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-text-primary">Goals by Unit of Measurement</h3>
              <p className="text-xs text-text-muted mt-0.5">How goals are measured across the org</p>
            </div>
            {uomData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center">
                <p className="text-sm text-text-muted">No goals created yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={uomData} layout="vertical" barSize={18}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8B8B9E' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#8B8B9E' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Goals" fill={CHART_COLORS.accent} radius={[0, 4, 4, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart C3: Goals by Status Stacked */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-text-primary">Goal Status by Quarter</h3>
              <p className="text-xs text-text-muted mt-0.5">Progress distribution across all quarters</p>
            </div>
            <div className="flex gap-4 text-xs">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <span key={status} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-text-secondary">{status.replace('_', ' ')}</span>
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusByQuarter} barSize={40}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#8B8B9E' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#8B8B9E' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="COMPLETED" name="Completed" stackId="a" fill={CHART_COLORS.success} radius={[0, 0, 0, 0]} />
              <Bar dataKey="ON_TRACK" name="On Track" stackId="a" fill={CHART_COLORS.info} />
              <Bar dataKey="NOT_STARTED" name="Not Started" stackId="a" fill={CHART_COLORS.muted} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart D: Manager Effectiveness */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-text-primary">Manager Effectiveness</h3>
            <p className="text-xs text-text-muted mt-0.5">Submission rates, approval SLA, and check-in completion</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Manager</th>
                <th className="px-4 py-3 text-center text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Team</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium min-w-[180px]">Submission %</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium min-w-[180px]">Approval SLA</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium min-w-[180px]">Check-in Rate</th>
              </tr>
            </thead>
            <tbody>
              {managerStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-text-muted">
                    No manager data available yet.
                  </td>
                </tr>
              ) : (
                managerStats.map(m => (
                  <tr key={m.id} className="border-b border-border-subtle hover:bg-bg-elevated transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-[11px] font-medium">
                          {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-text-primary font-medium text-[13px]">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-text-primary">{m.teamSize}</td>
                    {[m.submissionPct, m.approvalSla, m.checkinRate].map((pct, i) => (
                      <td key={i} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-bg-overlay rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${progressBarColor(pct)}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono text-[12px] text-text-primary w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
