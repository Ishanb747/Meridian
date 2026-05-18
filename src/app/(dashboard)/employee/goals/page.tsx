'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, GripVertical, Target, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThrustArea {
  id: string
  name: string
  color: string
}

interface Goal {
  id: string
  title: string
  description: string | null
  thrustArea: ThrustArea
  uomType: string
  targetValue: number | null
  targetDate: string | null
  weightage: number
  status: string
  isSharedGoal: boolean
  sharedFromGoalId?: string | null
  lockedAt?: string | null
}

const uomTypes = [
  { value: 'MIN_NUMERIC', label: 'Min Numeric', helper: 'Higher is better — e.g., Sales Revenue' },
  { value: 'MAX_NUMERIC', label: 'Max Numeric', helper: 'Lower is better — e.g., Response Time' },
  { value: 'MIN_PERCENT', label: 'Min Percent', helper: 'Higher is better — e.g., Customer Satisfaction' },
  { value: 'MAX_PERCENT', label: 'Max Percent', helper: 'Lower is better — e.g., Error Rate' },
  { value: 'TIMELINE', label: 'Timeline', helper: 'Complete by target date' },
  { value: 'ZERO', label: 'Zero', helper: 'Zero = success — e.g., Defects' },
]

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  APPROVED: 'success',
  LOCKED: 'warning',
  RETURNED: 'danger',
}

export default function EmployeeGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [thrustAreas, setThrustAreas] = useState<ThrustArea[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [canEdit, setCanEdit] = useState(true)

  // Fetch goals and thrust areas
  useEffect(() => {
    async function fetchData() {
      try {
        const [goalsRes, thrustRes] = await Promise.all([
          fetch('/api/goals'),
          fetch('/api/thrust-areas'),
        ])

        if (goalsRes.ok) {
          const data = await goalsRes.json()
          setGoals(data)
          // Check if any goals are not in DRAFT status - determines if user can edit
          const hasNonDraft = data.some((g: Goal) => !g.isSharedGoal && !['DRAFT', 'RETURNED'].includes(g.status))
          setCanEdit(!hasNonDraft)
        }
        if (thrustRes.ok) {
          setThrustAreas(await thrustRes.json())
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate total weightage
  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0)
  const weightageRemaining = 100 - totalWeightage
  const ownGoals = goals.filter((goal) => !goal.isSharedGoal || !goal.sharedFromGoalId)
  const hasSubmittedOrLockedOwnGoals = ownGoals.some((goal) => ['SUBMITTED', 'APPROVED', 'LOCKED'].includes(goal.status))
  const canSubmitGoalSheet = canEdit && !hasSubmittedOrLockedOwnGoals

  // Add new goal
  const handleAddGoal = async () => {
    if (goals.filter((goal) => !goal.isSharedGoal).length >= 8 || thrustAreas.length === 0) return

    const newGoal = {
      title: 'New Goal',
      description: '',
      thrustAreaId: thrustAreas[0]?.id || '',
      uomType: 'MIN_NUMERIC',
      targetValue: 100,
      targetDate: null,
      weightage: 10,
    }

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoal),
      })

      if (res.ok) {
        const created = await res.json()
        setGoals([...goals, { ...created, status: 'DRAFT', isSharedGoal: false }])
      }
    } catch (error) {
      console.error('Error creating goal:', error)
    }
  }

  // Update goal
  const handleUpdateGoal = useCallback(async (id: string, field: string, value: unknown) => {
    const currentGoal = goals.find((goal) => goal.id === id)
    const endpoint =
      currentGoal?.isSharedGoal && currentGoal.sharedFromGoalId && field === 'weightage'
        ? `/api/goals/shared/${id}`
        : `/api/goals/${id}`

    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    )

    // Debounce API call
    setTimeout(async () => {
      try {
        await fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        })
      } catch (error) {
        console.error('Error updating goal:', error)
      }
    }, 500)
  }, [goals])

  // Delete goal
  const handleDeleteGoal = async (id: string) => {
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setGoals(goals.filter((g) => g.id !== id))
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  // Submit goals
  const handleSubmit = async () => {
    setSubmitting(true)
    setErrors([])
    setSuccess('')

    try {
      const res = await fetch('/api/goals/submit', { method: 'POST' })

      if (!res.ok) {
        const data = await res.json()
        setErrors([data.error])
        setSubmitting(false)
        return
      }

      setSuccess('Goals submitted successfully. Your manager has been notified.')
      // Refresh goals to get updated status
      const goalsRes = await fetch('/api/goals')
      if (goalsRes.ok) {
        const data = await goalsRes.json()
        setGoals(data)
        setCanEdit(false)
      }
    } catch (error) {
      console.error('Error submitting goals:', error)
      setErrors(['Failed to submit goals'])
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="skeleton h-4 w-full rounded mb-2" />
                <div className="skeleton h-4 w-2/3 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">My Goals — FY 2026</h1>
          <p className="text-text-secondary mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Goal Setting Window Open
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="accent">Goal Setting</Badge>
        </div>
      </div>

      {/* Success Banner */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-success-subtle border border-success/30 rounded-lg p-4 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
            <p className="text-sm text-success">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Banner */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-danger-subtle border border-danger/30 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              {errors.map((err, i) => (
                <p key={i} className="text-sm text-danger">{err}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals List */}
      <div className="space-y-4">
        <AnimatePresence>
          {goals.map((goal, index) => {
            const uom = uomTypes.find((u) => u.value === goal.uomType)
            const canEditThis = canSubmitGoalSheet && ['DRAFT', 'RETURNED'].includes(goal.status) && !goal.isSharedGoal
            const canEditWeightageOnly = canSubmitGoalSheet && goal.isSharedGoal && !!goal.sharedFromGoalId

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    'relative overflow-hidden',
                    goal.status === 'APPROVED' && 'border-l-4 border-l-success',
                    goal.status === 'LOCKED' && 'border-l-4 border-l-warning',
                    goal.status === 'RETURNED' && 'border-l-4 border-l-danger'
                  )}
                >
                  <CardContent className="pt-6">
                    {/* Left border by thrust area color */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: goal.thrustArea.color }}
                    />

                    {/* Header with drag handle and thrust area */}
                    <div className="flex items-start justify-between mb-4 pl-3">
                      <div className="flex items-center gap-3">
                        {canEditThis && (
                          <button className="cursor-grab text-text-muted hover:text-text-secondary">
                            <GripVertical size={18} />
                          </button>
                        )}
                        <Badge
                          style={{ backgroundColor: `${goal.thrustArea.color}20`, color: goal.thrustArea.color }}
                        >
                          {goal.thrustArea.name}
                        </Badge>
                        {goal.isSharedGoal && (
                          <Badge variant="accent">Shared</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusColors[goal.status]}>{goal.status}</Badge>
                        {canEditThis && (
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-1 text-text-muted hover:text-danger transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Goal Title */}
                    <div className="space-y-1.5 pl-3">
                      <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Goal Title *
                      </label>
                      {canEditThis ? (
                        <Input
                          value={goal.title}
                          onChange={(e) => handleUpdateGoal(goal.id, 'title', e.target.value)}
                          placeholder="Enter goal title..."
                          className={!goal.title ? 'border-danger' : ''}
                        />
                      ) : (
                        <p className="text-text-primary font-medium">{goal.title}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5 mt-4 pl-3">
                      <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Description (optional)
                      </label>
                      {canEditThis ? (
                        <Input
                          value={goal.description || ''}
                          onChange={(e) => handleUpdateGoal(goal.id, 'description', e.target.value)}
                          placeholder="Add description..."
                        />
                      ) : (
                        <p className="text-text-secondary">{goal.description || '—'}</p>
                      )}
                    </div>

                    {/* UoM, Target, Weightage */}
                    <div className="grid grid-cols-3 gap-4 mt-4 pl-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Unit of Measurement
                        </label>
                        {canEditThis ? (
                          <select
                            value={goal.uomType}
                            onChange={(e) => handleUpdateGoal(goal.id, 'uomType', e.target.value)}
                            className="w-full h-10 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary"
                          >
                            {uomTypes.map((u) => (
                              <option key={u.value} value={u.value}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-text-primary">{uom?.label}</p>
                        )}
                        {canEditThis && (
                          <p className="text-xs text-text-muted">{uom?.helper}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Target {goal.uomType === 'TIMELINE' ? 'Date' : 'Value'}
                        </label>
                        {canEditThis ? (
                          goal.uomType === 'TIMELINE' ? (
                            <Input
                              type="date"
                              value={goal.targetDate ? goal.targetDate.split('T')[0] : ''}
                              onChange={(e) => handleUpdateGoal(goal.id, 'targetDate', e.target.value)}
                            />
                          ) : goal.uomType === 'ZERO' ? (
                            <p className="text-sm text-text-muted py-2">Zero = Success</p>
                          ) : (
                            <Input
                              type="number"
                              value={goal.targetValue || ''}
                              onChange={(e) => handleUpdateGoal(goal.id, 'targetValue', parseFloat(e.target.value) || null)}
                              placeholder="Enter target..."
                            />
                          )
                        ) : (
                          <p className="text-text-primary">
                            {goal.uomType === 'TIMELINE'
                              ? goal.targetDate
                                ? new Date(goal.targetDate).toLocaleDateString()
                                : '—'
                              : goal.targetValue || '—'}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Weightage (%)
                        </label>
                        {canEditThis ? (
                          <div className="relative">
                            <Input
                              type="number"
                              value={goal.weightage}
                              onChange={(e) => handleUpdateGoal(goal.id, 'weightage', parseFloat(e.target.value) || 0)}
                              className={cn(
                                'pr-8',
                                goal.weightage < 10 && 'border-danger'
                              )}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">%</span>
                          </div>
                        ) : canEditWeightageOnly ? (
                          <div className="relative">
                            <Input
                              type="number"
                              value={goal.weightage}
                              onChange={(e) => handleUpdateGoal(goal.id, 'weightage', parseFloat(e.target.value) || 0)}
                              className={cn(
                                'pr-8',
                                goal.weightage < 10 && 'border-danger'
                              )}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">%</span>
                          </div>
                        ) : (
                          <p className="text-text-primary font-mono">{goal.weightage}%</p>
                        )}
                        {(canEditThis || canEditWeightageOnly) && goal.weightage < 10 && (
                          <p className="text-xs text-danger">Min 10% required</p>
                        )}
                      </div>
                    </div>

                    {/* Returned comment */}
                    {goal.status === 'RETURNED' && (
                      <div className="mt-4 pl-3 p-3 bg-danger-subtle border-l-2 border-l-danger rounded-r-md">
                        <p className="text-xs text-danger font-medium mb-1">Manager comment:</p>
                        <p className="text-sm text-text-secondary">
                          Goals returned for rework. Please review and update.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Add Goal Button */}
        {canSubmitGoalSheet && ownGoals.length < 8 && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleAddGoal}
          >
            <Plus size={16} />
            Add Goal
          </Button>
        )}
        {canSubmitGoalSheet && ownGoals.length >= 8 && (
          <p className="text-center text-text-muted text-sm">
            Maximum 8 goals reached
          </p>
        )}
      </div>

      {/* Weightage Summary Bar */}
      <Card className="sticky bottom-6 bg-bg-surface/95 backdrop-blur-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-text-secondary" />
              <span className="text-sm text-text-secondary">Total Weightage</span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'font-mono font-semibold',
                  totalWeightage === 100
                    ? 'text-success'
                    : totalWeightage > 100
                    ? 'text-danger'
                    : 'text-warning'
                )}
              >
                {totalWeightage}%
              </span>
              {totalWeightage !== 100 && (
                <span className="text-sm text-text-muted">
                  {totalWeightage < 100 ? `${weightageRemaining}% remaining` : `${totalWeightage - 100}% over`}
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-track mb-4">
            <div
              className={cn(
                'progress-fill',
                totalWeightage === 100
                  ? 'success'
                  : totalWeightage > 100
                  ? 'danger'
                  : 'warning'
              )}
              style={{ width: `${Math.min(totalWeightage, 100)}%` }}
            />
          </div>

          {canSubmitGoalSheet ? (
            <Button
              className="w-full"
              disabled={totalWeightage !== 100 || goals.length === 0 || submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          ) : (
            <div className="rounded-md border border-border-subtle bg-bg-elevated px-4 py-3 text-sm text-text-secondary">
              Goal sheet is already submitted or locked. The total is shown for reference only.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
