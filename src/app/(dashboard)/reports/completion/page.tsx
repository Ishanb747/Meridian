'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, X, Info } from 'lucide-react'

interface EmployeeCompletion {
  id: string
  name: string
  department: string | null
  goals: {
    id: string
    status: string
    achievements: { quarter: string }[]
  }[]
  employeeCheckins: { quarter: string; completedAt: string }[]
  exemptions: { quarter: string | null; reason: string; grantedBy: { name: string }; grantedAt: string }[]
}

type CellStatus = 'complete' | 'partial' | 'open' | 'missed' | 'upcoming' | 'exempt'

const STATUS_CONFIG: Record<CellStatus, { symbol: string; label: string; bg: string; text: string; dot?: boolean }> = {
  complete: { symbol: '✓', label: 'Complete', bg: 'bg-[rgba(34,197,94,0.12)]', text: 'text-[#22C55E]' },
  partial:  { symbol: '◑', label: 'In Progress', bg: 'bg-[rgba(245,158,11,0.12)]', text: 'text-[#F59E0B]' },
  open:     { symbol: '●', label: 'Window Open', bg: 'bg-[rgba(56,189,248,0.12)]', text: 'text-[#38BDF8]', dot: true },
  missed:   { symbol: '✕', label: 'Missed', bg: 'bg-[rgba(239,68,68,0.12)]', text: 'text-[#EF4444]' },
  upcoming: { symbol: '─', label: 'Upcoming', bg: 'bg-bg-elevated', text: 'text-text-muted' },
  exempt:   { symbol: '~', label: 'Exempt', bg: 'bg-bg-overlay', text: 'text-text-muted italic' },
}

const COLUMNS = ['GOAL_SETTING', 'Q1', 'Q2', 'Q3', 'Q4', 'MGR_Q1', 'MGR_Q2', 'MGR_Q3', 'MGR_Q4'] as const
const COLUMN_LABELS: Record<string, string> = {
  GOAL_SETTING: 'Goal Setting',
  Q1: 'Q1', Q2: 'Q2', Q3: 'Q3', Q4: 'Q4',
  MGR_Q1: 'Mgr Q1', MGR_Q2: 'Mgr Q2', MGR_Q3: 'Mgr Q3', MGR_Q4: 'Mgr Q4',
}

// Map cycle phases to quarters for window-awareness
const PHASE_QUARTER_MAP: Record<string, string> = {
  Q1_CHECKIN: 'Q1', Q2_CHECKIN: 'Q2', Q3_CHECKIN: 'Q3', Q4_ANNUAL: 'Q4',
}

export default function CompletionDashboardPage() {
  const [employees, setEmployees] = useState<EmployeeCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPhase, setCurrentPhase] = useState('GOAL_SETTING')
  const [tooltip, setTooltip] = useState<{ id: string; col: string; text: string } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [empRes, windowRes] = await Promise.all([
          fetch('/api/reports/completion'),
          fetch('/api/cycles/active/window'),
        ])
        if (empRes.ok) setEmployees(await empRes.json())
        if (windowRes.ok) {
          const w = await windowRes.json()
          setCurrentPhase(w.phase || 'GOAL_SETTING')
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const currentQuarter = PHASE_QUARTER_MAP[currentPhase] || null

  function getCellStatus(emp: EmployeeCompletion, col: string): CellStatus {
    const isExempt = emp.exemptions?.some(e => e.quarter === col || e.quarter === null)
    if (isExempt) return 'exempt'

    if (col === 'GOAL_SETTING') {
      const hasGoals = emp.goals && emp.goals.some(g => ['SUBMITTED', 'APPROVED', 'LOCKED'].includes(g.status))
      return hasGoals ? 'complete' : (currentPhase === 'GOAL_SETTING' ? 'open' : 'missed')
    }

    // Manager check-in columns
    if (col.startsWith('MGR_')) {
      const q = col.replace('MGR_', '')
      const hasCheckin = emp.employeeCheckins?.some(c => c.quarter === q)
      if (hasCheckin) return 'complete'
      if (currentQuarter === q) return 'open'
      const qOrder = ['Q1', 'Q2', 'Q3', 'Q4']
      const currentIdx = currentQuarter ? qOrder.indexOf(currentQuarter) : -1
      const colIdx = qOrder.indexOf(q)
      return colIdx < currentIdx ? 'missed' : 'upcoming'
    }

    // Employee quarter columns
    const hasCheckin = emp.employeeCheckins?.some(c => c.quarter === col)
    const hasAllAchievements = emp.goals?.length > 0 && emp.goals.every(g =>
      g.achievements?.some(a => a.quarter === col)
    )
    const hasSomeAchievements = emp.goals?.some(g =>
      g.achievements?.some(a => a.quarter === col)
    )

    if (hasCheckin) return 'complete'
    if (hasAllAchievements) return 'partial'
    if (currentQuarter === col) {
      return hasSomeAchievements ? 'partial' : 'open'
    }
    const qOrder = ['Q1', 'Q2', 'Q3', 'Q4']
    const currentIdx = currentQuarter ? qOrder.indexOf(currentQuarter) : -1
    const colIdx = qOrder.indexOf(col)
    return colIdx < currentIdx ? 'missed' : 'upcoming'
  }

  function getCellTooltip(emp: EmployeeCompletion, col: string, status: CellStatus): string {
    if (status === 'exempt') {
      const ex = emp.exemptions?.find(e => e.quarter === col || e.quarter === null)
      return `Exempt — ${ex?.reason || 'No reason provided'}`
    }
    if (status === 'complete') {
      if (col === 'GOAL_SETTING') return 'Goals submitted and approved'
      const checkin = emp.employeeCheckins?.find(c => c.quarter === col.replace('MGR_', ''))
      if (checkin) return `Check-in completed ${new Date(checkin.completedAt).toLocaleDateString()}`
      return 'Complete'
    }
    if (status === 'partial') return 'Achievements logged, manager check-in pending'
    if (status === 'open') return 'Window currently open'
    if (status === 'missed') return 'Window closed — no entry made'
    return 'Upcoming'
  }

  // Stats
  const stats = useMemo(() => {
    const total = employees.length
    const goalsDone = employees.filter(e => e.goals?.some(g => ['SUBMITTED', 'APPROVED', 'LOCKED'].includes(g.status))).length
    const q1Done = employees.filter(e => e.employeeCheckins?.some(c => c.quarter === 'Q1')).length
    return { total, goalsDone, q1Done }
  }, [employees])

  const handleExport = () => {
    const headers = ['Employee', 'Department', 'Goal Setting', 'Q1', 'Q2', 'Q3', 'Q4', 'Mgr Q1', 'Mgr Q2', 'Mgr Q3', 'Mgr Q4']
    const rows = employees.map(emp =>
      [emp.name, emp.department || '', ...COLUMNS.map(col => STATUS_CONFIG[getCellStatus(emp, col)].label)]
    )
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'AtomQuest_Completion_Dashboard.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-bg-elevated rounded-lg skeleton" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-bg-elevated rounded-xl skeleton" />)}
        </div>
        <div className="h-64 bg-bg-elevated rounded-xl skeleton" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-text-primary">Completion Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">Real-time check-in status across your team · FY 2026</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download size={14} className="mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 text-center">
          <div className="text-2xl font-bold font-mono text-text-primary">{stats.total}</div>
          <div className="text-[11px] text-text-muted uppercase tracking-wider mt-1">Total Employees</div>
        </div>
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 text-center">
          <div className="text-2xl font-bold font-mono text-text-primary">{stats.goalsDone} / {stats.total}</div>
          <div className="text-[11px] text-text-muted uppercase tracking-wider mt-1">Goal Setting Complete</div>
        </div>
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 text-center">
          <div className="text-2xl font-bold font-mono text-text-primary">{stats.q1Done} / {stats.total}</div>
          <div className="text-[11px] text-text-muted uppercase tracking-wider mt-1">Q1 Check-in Complete</div>
        </div>
        <div className="bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.2)] rounded-xl p-4 text-center">
          <div className="font-semibold text-[#38BDF8]">{currentQuarter || 'Goal Setting'} · Active</div>
          <div className="text-sm text-text-secondary mt-1">Window Open</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold ${config.bg} ${config.text}`}>
              {config.symbol}
            </span>
            <span>{config.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-elevated">
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium sticky left-0 z-10 bg-bg-elevated min-w-[180px]">
                    Employee
                  </th>
                  {COLUMNS.map(col => (
                    <th key={col} className="px-3 py-3 text-center text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium min-w-[80px]">
                      {COLUMN_LABELS[col]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b border-border-subtle hover:bg-bg-elevated transition-colors duration-[120ms] group">
                    <td className="px-4 py-3 sticky left-0 z-10 bg-bg-surface group-hover:bg-bg-elevated transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-[11px] font-medium shrink-0">
                          {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-text-primary text-[13px]">{emp.name}</div>
                          <div className="text-[11px] text-text-muted">{emp.department || 'Employee'}</div>
                        </div>
                      </div>
                    </td>
                    {COLUMNS.map(col => {
                      const status = getCellStatus(emp, col)
                      const config = STATUS_CONFIG[status]
                      const tipText = getCellTooltip(emp, col, status)
                      const tipKey = `${emp.id}-${col}`
                      const isHovered = tooltip?.id === tipKey

                      return (
                        <td key={col} className="px-3 py-3 text-center relative">
                          <div
                            className="relative inline-block"
                            onMouseEnter={() => setTooltip({ id: tipKey, col, text: tipText })}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-transform hover:scale-110 ${config.bg} ${config.text}`}>
                              {config.dot && <span className="absolute w-1.5 h-1.5 rounded-full bg-current animate-pulse top-1 right-1" />}
                              {config.symbol}
                            </span>
                            {isHovered && (
                              <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-bg-overlay border border-border-default rounded-lg shadow-lg text-[11px] text-text-primary whitespace-nowrap">
                                {tipText}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-bg-overlay border-r border-b border-border-default rotate-45 -mt-1" />
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-6 py-16 text-center text-text-muted">
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
