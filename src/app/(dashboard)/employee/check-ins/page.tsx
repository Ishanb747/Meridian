'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, Clock, RefreshCw, Save, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { computeScore, formatScore, scoreExplanation } from '@/lib/scoring'
import { cn } from '@/lib/utils'

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

interface Achievement {
  id: string
  quarter: Quarter
  actualValue: number | null
  actualDate: string | null
  status: 'NOT_STARTED' | 'ON_TRACK' | 'COMPLETED'
  computedScore: number | null
  notes: string | null
  loggedAt: string
  updatedAt: string
}

interface Goal {
  id: string
  title: string
  description: string | null
  uomType: 'MIN_NUMERIC' | 'MAX_NUMERIC' | 'MIN_PERCENT' | 'MAX_PERCENT' | 'TIMELINE' | 'ZERO'
  targetValue: number | null
  targetDate: string | null
  weightage: number
  isSharedGoal: boolean
  sharedFromGoalId: string | null
  thrustArea: { name: string; color: string }
  achievements: Achievement[]
  sharedFromGoal?: { employee: { name: string } } | null
}

interface WindowData {
  phase: string
  isOpen: boolean
  opensAt: string
  closesAt: string
  quarterLabel: string
  quarter: Quarter | null
  daysRemaining: number | null
}

interface AchievementResponse {
  cycle: { id: string; name: string; currentPhase: string }
  window: WindowData
  goals: Goal[]
}

interface DraftValue {
  actualValue: string
  actualDate: string
  status: 'NOT_STARTED' | 'ON_TRACK' | 'COMPLETED'
  notes: string
}

const statusVariants = {
  NOT_STARTED: 'default',
  ON_TRACK: 'info',
  COMPLETED: 'success',
} as const

const statusLabels = {
  NOT_STARTED: 'Not Started',
  ON_TRACK: 'On Track',
  COMPLETED: 'Completed',
}

function targetLabel(goal: Goal) {
  if (goal.uomType === 'TIMELINE') return goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'No deadline'
  if (goal.uomType === 'ZERO') return 'Zero'
  return goal.targetValue ?? 'Not set'
}

function getAchievement(goal: Goal, quarter: Quarter | null) {
  if (!quarter) return null
  return goal.achievements.find((achievement) => achievement.quarter === quarter) || null
}

export default function EmployeeCheckInsPage() {
  const [data, setData] = useState<AchievementResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, DraftValue>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [savedAt, setSavedAt] = useState<Record<string, string>>({})
  const [error, setError] = useState<Record<string, string>>({})

  const loadData = async () => {
    try {
      const res = await fetch('/api/achievements')
      if (!res.ok) return
      const payload = await res.json()
      setData(payload)

      const quarter = payload.window?.quarter as Quarter | null
      const nextDrafts: Record<string, DraftValue> = {}
      for (const goal of payload.goals as Goal[]) {
        const achievement = getAchievement(goal, quarter)
        nextDrafts[goal.id] = {
          actualValue: achievement?.actualValue?.toString() || '',
          actualDate: achievement?.actualDate ? achievement.actualDate.slice(0, 10) : '',
          status: achievement?.status || 'NOT_STARTED',
          notes: achievement?.notes || '',
        }
      }
      setDrafts(nextDrafts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const summary = useMemo(() => {
    if (!data?.window.quarter) return { completed: 0, onTrack: 0, notStarted: 0, weightedScore: null as number | null }

    let weighted = 0
    let weightTotal = 0
    let completed = 0
    let onTrack = 0
    let notStarted = 0

    for (const goal of data.goals) {
      const achievement = getAchievement(goal, data.window.quarter)
      if (achievement?.status === 'COMPLETED') completed += 1
      else if (achievement?.status === 'ON_TRACK') onTrack += 1
      else notStarted += 1

      if (achievement?.computedScore !== null && achievement?.computedScore !== undefined) {
        weighted += achievement.computedScore * goal.weightage
        weightTotal += goal.weightage
      }
    }

    return {
      completed,
      onTrack,
      notStarted,
      weightedScore: weightTotal ? weighted / weightTotal : null,
    }
  }, [data])

  const saveGoal = async (goal: Goal) => {
    if (!data?.window.quarter || goal.sharedFromGoalId) return
    const draft = drafts[goal.id]
    setSaving((current) => ({ ...current, [goal.id]: true }))
    setError((current) => ({ ...current, [goal.id]: '' }))

    try {
      const res = await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: goal.id,
          quarter: data.window.quarter,
          actualValue: goal.uomType === 'TIMELINE' ? null : draft.actualValue,
          actualDate: goal.uomType === 'TIMELINE' ? draft.actualDate : null,
          status: draft.status,
          notes: draft.notes,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError((current) => ({ ...current, [goal.id]: body.error || 'Failed to save achievement' }))
        return
      }

      setSavedAt((current) => ({ ...current, [goal.id]: new Date().toLocaleTimeString() }))
      await loadData()
    } finally {
      setSaving((current) => ({ ...current, [goal.id]: false }))
    }
  }

  if (loading) return <div className="space-y-4"><div className="skeleton h-8 w-56 rounded" /><div className="skeleton h-40 w-full rounded" /></div>

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-text-secondary">
          Unable to load check-in data.
        </CardContent>
      </Card>
    )
  }

  const quarter = data.window.quarter
  const isCheckInPhase = !!quarter
  const isEditable = data.window.isOpen && isCheckInPhase
  const scoreSummary = formatScore(summary.weightedScore)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">
          {isCheckInPhase ? `${data.window.quarterLabel} Check-in` : 'My Check-ins'}
        </h1>
        <p className="text-text-secondary mt-1">
          {isCheckInPhase
            ? `Log actual achievements against approved goals for ${data.cycle.name}.`
            : `Achievements open when the cycle reaches Q1, Q2, Q3, or Q4.`}
        </p>
      </div>

      <div
        className={cn(
          'rounded-lg border p-4',
          isEditable ? 'border-info/30 bg-info-subtle text-info' : 'border-warning/30 bg-warning-subtle text-warning'
        )}
      >
        <div className="flex items-center gap-2 font-medium">
          {isEditable ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          {isEditable
            ? `${data.window.quarterLabel} window open until ${new Date(data.window.closesAt).toLocaleDateString()}`
            : isCheckInPhase
              ? `${data.window.quarterLabel} window is closed`
              : 'Achievement entry is not open yet'}
        </div>
        {isEditable && data.window.daysRemaining !== null && data.window.daysRemaining <= 7 && (
          <p className="mt-1 text-sm">Window closes in {data.window.daysRemaining} day{data.window.daysRemaining === 1 ? '' : 's'}.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).map((item) => {
          const complete = data.goals.length > 0 && data.goals.every((goal) => goal.achievements.some((achievement) => achievement.quarter === item))
          return (
            <Badge key={item} variant={item === quarter ? 'accent' : complete ? 'success' : 'default'}>
              {item} {complete ? '✓' : item === quarter ? '●' : '—'}
            </Badge>
          )
        })}
      </div>

      {data.goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">No approved goals are available for check-ins yet.</p>
            <p className="text-sm text-text-muted mt-1">Once goals are approved by your manager, they will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.goals.map((goal) => {
            const achievement = getAchievement(goal, quarter)
            const draft = drafts[goal.id] || { actualValue: '', actualDate: '', status: 'NOT_STARTED', notes: '' }
            const previewScore = computeScore({
              uomType: goal.uomType,
              targetValue: goal.targetValue,
              targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
              actualValue: draft.actualValue === '' ? null : Number(draft.actualValue),
              actualDate: draft.actualDate ? new Date(draft.actualDate) : null,
            })
            const score = formatScore(previewScore ?? achievement?.computedScore ?? null)
            const synced = goal.isSharedGoal && !!goal.sharedFromGoalId

            return (
              <Card key={goal.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge style={{ backgroundColor: `${goal.thrustArea.color}20`, color: goal.thrustArea.color }}>
                          {goal.thrustArea.name}
                        </Badge>
                        <Badge variant={statusVariants[draft.status]}>{statusLabels[draft.status]}</Badge>
                        {synced && <Badge variant="accent"><RefreshCw size={12} /> Synced</Badge>}
                      </div>
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                      <p className="text-sm text-text-secondary">
                        {goal.uomType.replace('_', ' ')} · Target: {targetLabel(goal)} · Weightage {goal.weightage}%
                      </p>
                    </div>
                    <div className={cn('font-mono text-xl font-semibold', score.color)}>{score.label}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {synced && (
                    <div className="rounded-md border border-accent/30 bg-accent-subtle p-3 text-sm text-accent">
                      Achievement is synced from {goal.sharedFromGoal?.employee.name || 'the primary owner'} and cannot be edited here.
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-3">
                    {goal.uomType === 'TIMELINE' ? (
                      <Input
                        type="date"
                        label="Actual Completion Date"
                        disabled={!isEditable || synced}
                        value={draft.actualDate}
                        onChange={(event) => setDrafts({ ...drafts, [goal.id]: { ...draft, actualDate: event.target.value } })}
                      />
                    ) : (
                      <Input
                        type="number"
                        label={goal.uomType.includes('PERCENT') ? 'Actual Value (%)' : goal.uomType === 'ZERO' ? 'Actual Count' : 'Actual Value'}
                        disabled={!isEditable || synced}
                        value={draft.actualValue}
                        onChange={(event) => setDrafts({ ...drafts, [goal.id]: { ...draft, actualValue: event.target.value } })}
                      />
                    )}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Status</label>
                      <select
                        disabled={!isEditable || synced}
                        value={draft.status}
                        onChange={(event) => setDrafts({ ...drafts, [goal.id]: { ...draft, status: event.target.value as DraftValue['status'] } })}
                        className="h-10 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary disabled:opacity-60"
                      >
                        <option value="NOT_STARTED">Not Started</option>
                        <option value="ON_TRACK">On Track</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                    <div className="rounded-md border border-border-subtle bg-bg-elevated p-3 text-sm text-text-secondary">
                      {scoreExplanation({
                        uomType: goal.uomType,
                        targetValue: goal.targetValue,
                        targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
                        actualValue: draft.actualValue === '' ? null : Number(draft.actualValue),
                        actualDate: draft.actualDate ? new Date(draft.actualDate) : null,
                      })}
                    </div>
                  </div>

                  <Textarea
                    disabled={!isEditable || synced}
                    value={draft.notes}
                    onChange={(event) => setDrafts({ ...drafts, [goal.id]: { ...draft, notes: event.target.value } })}
                    placeholder="Notes for your manager..."
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-text-muted">
                      {savedAt[goal.id]
                        ? `Saved at ${savedAt[goal.id]}`
                        : achievement
                          ? `Last saved ${new Date(achievement.updatedAt).toLocaleString()}`
                          : 'Not saved yet'}
                      {error[goal.id] && <span className="ml-2 text-danger">{error[goal.id]}</span>}
                    </div>
                    {isEditable && !synced && (
                      <Button size="sm" onClick={() => saveGoal(goal)} disabled={saving[goal.id]}>
                        <Save size={14} />
                        {saving[goal.id] ? 'Saving...' : 'Save'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardContent className="py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-medium text-text-primary">{quarter || 'Current'} Summary · {data.goals.length} goals</h2>
              <p className="text-sm text-text-secondary mt-1">
                Completed: {summary.completed} · On Track: {summary.onTrack} · Not Started: {summary.notStarted}
              </p>
              <p className="text-xs text-text-muted mt-2">This is a progress indicator, not a performance rating.</p>
            </div>
            <div className={cn('font-mono text-2xl font-semibold', scoreSummary.color)}>{scoreSummary.label}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
