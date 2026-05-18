'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

interface EmployeeGoalsData {
  employee: {
    name: string
    email: string
    department: string | null
    manager: { name: string } | null
  } | null
  goals: Array<{
    id: string
    title: string
    description: string | null
    thrustArea: { name: string; color: string }
    uomType: string
    targetValue: number | null
    targetDate: string | null
    weightage: number
    status: string
  }>
}

export default function EmployeeGoalsReviewPage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params.employeeId as string

  const [data, setData] = useState<EmployeeGoalsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showConfirmApprove, setShowConfirmApprove] = useState(false)
  const [returnComment, setReturnComment] = useState('')
  const [editedGoals, setEditedGoals] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/manager/goals/${employeeId}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [employeeId])

  const totalWeightage = data?.goals.reduce((sum, g) => sum + g.weightage, 0) || 0

  // Handle inline edit
  const handleGoalUpdate = async (goalId: string, field: string, value: unknown) => {
    if (!data) return

    setData({
      ...data,
      goals: data.goals.map((g) => (g.id === goalId ? { ...g, [field]: value } : g)),
    })

    try {
      await fetch(`/api/manager/goals/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, [field]: value }),
      })

      setEditedGoals((prev) => new Set(prev).add(goalId))
    } catch (error) {
      console.error('Error updating goal:', error)
    }
  }

  // Approve all goals
  const handleApprove = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/manager/approve/${employeeId}`, { method: 'POST' })
      if (res.ok) {
        router.push('/manager/team-goals')
      }
    } catch (error) {
      console.error('Error approving goals:', error)
    } finally {
      setSubmitting(false)
      setShowConfirmApprove(false)
    }
  }

  // Return goals for rework
  const handleReturn = async () => {
    if (!returnComment.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/manager/return/${employeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: returnComment }),
      })
      if (res.ok) {
        router.push('/manager/team-goals')
      }
    } catch (error) {
      console.error('Error returning goals:', error)
    } finally {
      setSubmitting(false)
      setShowReturnModal(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64 rounded" />
        <Card>
          <CardContent className="py-8">
            <div className="skeleton h-4 w-full rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data?.employee) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Employee not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/manager/team-goals')}>
          <ArrowLeft size={16} />
          Back to Team Goals
        </Button>
      </div>
    )
  }

  const uomLabels: Record<string, string> = {
    MIN_NUMERIC: 'Min Numeric',
    MAX_NUMERIC: 'Max Numeric',
    MIN_PERCENT: 'Min Percent',
    MAX_PERCENT: 'Max Percent',
    TIMELINE: 'Timeline',
    ZERO: 'Zero',
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/manager/team-goals')}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            {data.employee.name}
          </h1>
          <p className="text-text-secondary flex items-center gap-2">
            {data.employee.department || 'No department'}
            <span className="text-text-muted">•</span>
            Submitted goals
          </p>
        </div>
      </div>

      {/* Goals Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Thrust Area</TableHead>
                <TableHead>Goal Title</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Weightage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.goals.map((goal, index) => (
                <TableRow key={goal.id}>
                  <TableCell className="font-mono text-text-muted">{index + 1}</TableCell>
                  <TableCell>
                    <Badge
                      style={{ backgroundColor: `${goal.thrustArea.color}20`, color: goal.thrustArea.color }}
                    >
                      {goal.thrustArea.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-text-primary font-medium">{goal.title}</p>
                      {goal.description && (
                        <p className="text-xs text-text-muted mt-0.5">{goal.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-text-secondary">{uomLabels[goal.uomType]}</TableCell>
                  <TableCell>
                    {goal.uomType === 'TIMELINE' ? (
                      goal.targetDate ? (
                        <Input
                          type="date"
                          value={goal.targetDate.split('T')[0]}
                          onChange={(e) => handleGoalUpdate(goal.id, 'targetDate', e.target.value)}
                          className="w-36 h-8"
                        />
                      ) : (
                        <span className="text-text-muted">—</span>
                      )
                    ) : goal.uomType === 'ZERO' ? (
                      <span className="text-text-muted">Zero</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={goal.targetValue || ''}
                          onChange={(e) =>
                            handleGoalUpdate(goal.id, 'targetValue', parseFloat(e.target.value) || null)
                          }
                          className="w-24 h-8"
                        />
                        {editedGoals.has(goal.id) && (
                          <span className="w-2 h-2 rounded-full bg-warning" title="Edited" />
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={goal.weightage}
                        onChange={(e) =>
                          handleGoalUpdate(goal.id, 'weightage', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 h-8"
                      />
                      <span className="text-text-muted">%</span>
                      {editedGoals.has(goal.id) && (
                        <span className="w-2 h-2 rounded-full bg-warning" title="Edited" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border-subtle p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-text-secondary">Total Weightage:</span>
            <span className={`font-mono font-semibold ${totalWeightage === 100 ? 'text-success' : 'text-warning'}`}>
              {totalWeightage}%
              {totalWeightage === 100 && <CheckCircle className="w-4 h-4 inline ml-2 text-success" />}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setShowReturnModal(true)}>
              <AlertCircle size={16} />
              Return for Rework
            </Button>

            {showConfirmApprove ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setShowConfirmApprove(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApprove} disabled={submitting}>
                  {submitting ? 'Approving...' : 'Yes, Approve'}
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowConfirmApprove(true)} disabled={totalWeightage !== 100}>
                <CheckCircle size={16} />
                Approve All Goals
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Return Modal */}
      <AnimatePresence>
        {showReturnModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Return for Rework
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Add instructions for {data.employee.name} to improve their goals.
              </p>

              <textarea
                value={returnComment}
                onChange={(e) => setReturnComment(e.target.value)}
                placeholder="Enter feedback..."
                className="w-full h-32 rounded-md border border-border bg-bg-elevated p-3 text-text-primary placeholder:text-text-muted resize-none"
              />

              <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" onClick={() => setShowReturnModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleReturn}
                  disabled={!returnComment.trim() || submitting}
                >
                  {submitting ? 'Sending...' : 'Send Return Request →'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}