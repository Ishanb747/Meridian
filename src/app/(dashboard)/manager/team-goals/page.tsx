'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { getInitials } from '@/lib/utils'
import { Users, ChevronRight, Plus, X } from 'lucide-react'

interface PendingApproval {
  employee: {
    id: string
    name: string
    email: string
    department: string | null
  }
  goalsCount: number
  totalWeightage: number
  submittedAt: string
}

export default function ManagerTeamGoalsPage() {
  const router = useRouter()
  const [pending, setPending] = useState<PendingApproval[]>([])
  const [team, setTeam] = useState<Array<{ id: string; name: string; email: string; department: string | null }>>([])
  const [thrustAreas, setThrustAreas] = useState<Array<{ id: string; name: string; color: string }>>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [sharedGoal, setSharedGoal] = useState({
    title: '',
    description: '',
    thrustAreaId: '',
    uomType: 'MIN_NUMERIC',
    targetValue: '100',
    targetDate: '',
  })
  const [pushing, setPushing] = useState(false)
  const [pushError, setPushError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [pendingRes, teamRes, thrustRes] = await Promise.all([
          fetch('/api/manager/pending'),
          fetch('/api/manager/team'),
          fetch('/api/thrust-areas'),
        ])

        if (pendingRes.ok) setPending(await pendingRes.json())
        if (teamRes.ok) setTeam(await teamRes.json())
        if (thrustRes.ok) {
          const areas = await thrustRes.json()
          setThrustAreas(areas)
          setSharedGoal((prev) => ({ ...prev, thrustAreaId: areas[0]?.id || '' }))
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const toggleRecipient = (id: string) => {
    setSelectedRecipients((current) =>
      current.includes(id) ? current.filter((recipientId) => recipientId !== id) : [...current, id]
    )
  }

  const pushSharedGoal = async () => {
    setPushing(true)
    setPushError('')

    try {
      const res = await fetch('/api/goals/shared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sharedGoal,
          targetValue: sharedGoal.uomType === 'TIMELINE' || sharedGoal.uomType === 'ZERO'
            ? null
            : Number(sharedGoal.targetValue),
          targetDate: sharedGoal.uomType === 'TIMELINE' ? sharedGoal.targetDate : null,
          recipientIds: selectedRecipients,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setPushError(data.error || 'Unable to push shared goal')
        return
      }

      setDrawerOpen(false)
      setSelectedRecipients([])
      setSharedGoal({
        title: '',
        description: '',
        thrustAreaId: thrustAreas[0]?.id || '',
        uomType: 'MIN_NUMERIC',
        targetValue: '100',
        targetDate: '',
      })
    } finally {
      setPushing(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded" />
        <Card>
          <CardContent className="py-8">
            <div className="skeleton h-4 w-full rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-text-primary">Team Goals — Pending Review</h1>
            <p className="text-text-secondary mt-1">
              {pending.length} submission{pending.length !== 1 ? 's' : ''} awaiting your approval
            </p>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus size={16} />
            Push Shared Goal
          </Button>
        </div>
      </div>

      {/* Pending Approvals List */}
      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary">No pending approvals</p>
            <p className="text-sm text-text-muted mt-1">
              Team members who submit goals will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((item) => (
            <Card key={item.employee.id} className="hover:border-border-strong transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-sm font-medium">
                      {getInitials(item.employee.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-text-primary">{item.employee.name}</h3>
                        <span className="text-sm text-text-muted">•</span>
                        <span className="text-sm text-text-secondary">
                          {item.employee.department || 'No department'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                        <span>{item.goalsCount} goals</span>
                        <span>•</span>
                        <span>Total {item.totalWeightage}%</span>
                        <span>•</span>
                        <span>{formatDate(item.submittedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="progress-track w-32 mb-1">
                        <div
                          className={`progress-fill ${item.totalWeightage === 100 ? 'success' : 'warning'}`}
                          style={{ width: `${Math.min(item.totalWeightage, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted">{item.goalsCount}/8 goals</span>
                        <span
                          className={`font-mono ${
                            item.totalWeightage === 100 ? 'text-success' : 'text-warning'
                          }`}
                        >
                          {item.totalWeightage}%{item.totalWeightage === 100 && ' ✓'}
                        </span>
                      </div>
                    </div>

                    <Badge variant="info">SUBMITTED</Badge>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/manager/team-goals/${item.employee.id}`)}
                    >
                      Review Goals
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[90vh] bg-bg-surface border border-border-subtle rounded-xl p-6 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-display font-bold text-text-primary">Push Shared Goal</h2>
                <p className="text-sm text-text-secondary mt-1">Assign a common goal to selected team members.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)}>
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-4">
              <Input
                label="Goal Title"
                value={sharedGoal.title}
                onChange={(event) => setSharedGoal({ ...sharedGoal, title: event.target.value })}
                placeholder="Enter shared goal title"
              />
              <Input
                label="Description"
                value={sharedGoal.description}
                onChange={(event) => setSharedGoal({ ...sharedGoal, description: event.target.value })}
                placeholder="Optional context"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Thrust Area</label>
                  <select
                    value={sharedGoal.thrustAreaId}
                    onChange={(event) => setSharedGoal({ ...sharedGoal, thrustAreaId: event.target.value })}
                    className="w-full h-10 rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary"
                  >
                    {thrustAreas.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">UoM</label>
                  <select
                    value={sharedGoal.uomType}
                    onChange={(event) => setSharedGoal({ ...sharedGoal, uomType: event.target.value })}
                    className="w-full h-10 rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary"
                  >
                    <option value="MIN_NUMERIC">Min Numeric</option>
                    <option value="MAX_NUMERIC">Max Numeric</option>
                    <option value="MIN_PERCENT">Min Percent</option>
                    <option value="MAX_PERCENT">Max Percent</option>
                    <option value="TIMELINE">Timeline</option>
                    <option value="ZERO">Zero</option>
                  </select>
                </div>
              </div>

              {sharedGoal.uomType === 'TIMELINE' ? (
                <Input
                  type="date"
                  label="Target Date"
                  value={sharedGoal.targetDate}
                  onChange={(event) => setSharedGoal({ ...sharedGoal, targetDate: event.target.value })}
                />
              ) : sharedGoal.uomType !== 'ZERO' ? (
                <Input
                  type="number"
                  label="Target Value"
                  value={sharedGoal.targetValue}
                  onChange={(event) => setSharedGoal({ ...sharedGoal, targetValue: event.target.value })}
                />
              ) : (
                <div className="rounded-lg border border-border-subtle bg-bg-elevated p-3 text-sm text-text-secondary">
                  Zero incidents or defects is treated as success.
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Recipients</label>
                <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border-subtle divide-y divide-border-subtle">
                  {team.map((member) => (
                    <label key={member.id} className="flex items-center gap-3 p-3 hover:bg-bg-elevated cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(member.id)}
                        onChange={() => toggleRecipient(member.id)}
                      />
                      <span>
                        <span className="block text-sm text-text-primary">{member.name}</span>
                        <span className="block text-xs text-text-muted">{member.department || member.email}</span>
                      </span>
                    </label>
                  ))}
                  {team.length === 0 && (
                    <div className="p-4 text-sm text-text-muted">No team members available.</div>
                  )}
                </div>
              </div>

              {pushError && <p className="text-sm text-danger">{pushError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                <Button
                  onClick={pushSharedGoal}
                  disabled={pushing || !sharedGoal.title || !selectedRecipients.length || !sharedGoal.thrustAreaId}
                >
                  {pushing ? 'Pushing...' : `Push to ${selectedRecipients.length} employee${selectedRecipients.length === 1 ? '' : 's'}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
