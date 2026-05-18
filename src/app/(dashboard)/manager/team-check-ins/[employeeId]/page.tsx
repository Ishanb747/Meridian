'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { formatScore } from '@/lib/scoring'
import { cn } from '@/lib/utils'

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

interface Achievement {
  id: string
  quarter: Quarter
  actualValue: number | null
  actualDate: string | null
  status: string
  computedScore: number | null
  notes: string | null
}

interface Goal {
  id: string
  title: string
  description: string | null
  uomType: string
  targetValue: number | null
  targetDate: string | null
  weightage: number
  thrustArea: { name: string; color: string }
  achievements: Achievement[]
}

interface DetailResponse {
  employee: { name: string; email: string; department: string | null }
  window: { quarterLabel: string; quarter: Quarter | null; isOpen: boolean }
  quarter: Quarter
  goals: Goal[]
  checkin: { comment: string; completedAt: string } | null
}

function targetLabel(goal: Goal) {
  if (goal.uomType === 'TIMELINE') return goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'No deadline'
  if (goal.uomType === 'ZERO') return 'Zero'
  return goal.targetValue ?? 'Not set'
}

function actualLabel(goal: Goal, achievement?: Achievement) {
  if (!achievement) return 'Not reported'
  if (goal.uomType === 'TIMELINE') return achievement.actualDate ? new Date(achievement.actualDate).toLocaleDateString() : 'Not reported'
  return achievement.actualValue ?? 'Not reported'
}

export default function ManagerCheckInDetailPage() {
  const params = useParams()
  const employeeId = params.employeeId as string

  const [data, setData] = useState<DetailResponse | null>(null)
  const [history, setHistory] = useState<Array<{ id: string; quarter: string; comment: string; completedAt: string }>>([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [detailRes, historyRes] = await Promise.all([
        fetch(`/api/manager/checkin/${employeeId}`),
        fetch(`/api/manager/checkin/${employeeId}/history`),
      ])
      if (detailRes.ok) {
        const payload = await detailRes.json()
        setData(payload)
        setComment(payload.checkin?.comment || '')
      }
      if (historyRes.ok) setHistory(await historyRes.json())
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const weightedScore = useMemo(() => {
    if (!data) return null
    let weighted = 0
    let total = 0
    for (const goal of data.goals) {
      const achievement = goal.achievements.find((item) => item.quarter === data.quarter)
      if (achievement?.computedScore !== null && achievement?.computedScore !== undefined) {
        weighted += achievement.computedScore * goal.weightage
        total += goal.weightage
      }
    }
    return total ? weighted / total : null
  }, [data])

  const submitCheckIn = async () => {
    if (!data) return
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/manager/checkin/${employeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quarter: data.quarter, comment }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error || 'Unable to save check-in')
        return
      }
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="space-y-4"><div className="skeleton h-8 w-64 rounded" /><div className="skeleton h-40 w-full rounded" /></div>
  if (!data) return <Card><CardContent className="py-12 text-center text-text-secondary">Unable to load check-in detail.</CardContent></Card>

  const scoreFmt = formatScore(weightedScore)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/manager/team-check-ins"><ArrowLeft size={18} /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-text-primary">{data.employee.name}</h1>
            <p className="text-text-secondary mt-1">{data.employee.department || data.employee.email} · {data.window.quarterLabel}</p>
          </div>
        </div>
        <div className={cn('font-mono text-2xl font-semibold', scoreFmt.color)}>{scoreFmt.label}</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Goal Achievement Data</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-elevated text-xs uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">Goal</th>
                    <th className="px-4 py-3 text-left">Target</th>
                    <th className="px-4 py-3 text-left">Actual</th>
                    <th className="px-4 py-3 text-left">Score</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.goals.map((goal) => {
                    const achievement = goal.achievements.find((item) => item.quarter === data.quarter)
                    const score = formatScore(achievement?.computedScore ?? null)
                    return (
                      <tr key={goal.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-text-primary">{goal.title}</div>
                          <div className="text-xs text-text-muted">{goal.thrustArea.name} · {goal.weightage}%</div>
                          {achievement?.notes && <div className="mt-2 rounded bg-bg-elevated p-2 text-xs text-text-secondary">{achievement.notes}</div>}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{targetLabel(goal)}</td>
                        <td className="px-4 py-3 text-text-secondary">{actualLabel(goal, achievement)}</td>
                        <td className={cn('px-4 py-3 font-mono font-semibold', score.color)}>{score.label}</td>
                        <td className="px-4 py-3"><Badge variant={achievement?.status === 'COMPLETED' ? 'success' : achievement?.status === 'ON_TRACK' ? 'info' : 'default'}>{achievement?.status || 'NOT_STARTED'}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{data.window.quarterLabel} Check-in Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Progress highlights, areas needing attention, and support needed..."
                className="min-h-[180px]"
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              {data.checkin && <p className="text-xs text-text-muted">Last completed {new Date(data.checkin.completedAt).toLocaleString()}</p>}
              <Button onClick={submitCheckIn} disabled={saving || !comment.trim() || !data.window.isOpen} className="w-full">
                <CheckCircle size={16} />
                {saving ? 'Saving...' : 'Mark Check-in Complete'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Previous Check-ins</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-text-muted">No previous check-ins yet.</p>
              ) : history.map((session) => (
                <div key={session.id} className="rounded-md border border-border-subtle p-3">
                  <div className="text-xs font-medium text-text-muted">{session.quarter} · {new Date(session.completedAt).toLocaleDateString()}</div>
                  <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">{session.comment}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
