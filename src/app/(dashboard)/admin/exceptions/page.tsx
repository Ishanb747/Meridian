'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Shield, AlertTriangle, Unlock, Plus } from 'lucide-react'

interface Exemption {
  id: string
  employeeId: string
  employee: { id: string; name: string; department: string | null }
  cycleId: string
  quarter: string | null
  reason: string
  grantedById: string
  grantedBy: { name: string }
  grantedAt: string
}

interface LockedGoal {
  id: string
  title: string
  lockedAt: string | null
  lockedBy: string | null
  employee: { id: string; name: string }
  status: string
}

interface Employee {
  id: string
  name: string
  department: string | null
}

export default function AdminExceptionsPage() {
  const [exemptions, setExemptions] = useState<Exemption[]>([])
  const [lockedGoals, setLockedGoals] = useState<LockedGoal[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'exemptions' | 'unlocks'>('exemptions')
  const [showDrawer, setShowDrawer] = useState(false)
  const [showUnlockDrawer, setShowUnlockDrawer] = useState<LockedGoal | null>(null)

  // Exemption form state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [exemptScope, setExemptScope] = useState<'cycle' | 'quarter'>('cycle')
  const [exemptQuarter, setExemptQuarter] = useState('Q1')
  const [exemptReason, setExemptReason] = useState('')
  const [empSearch, setEmpSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Unlock form state
  const [unlockReason, setUnlockReason] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [exemptRes, empRes, goalsRes] = await Promise.all([
        fetch('/api/admin/exempt'),
        fetch('/api/users'),
        fetch('/api/admin/goals?status=LOCKED'),
      ])
      if (exemptRes.ok) setExemptions(await exemptRes.json())
      if (empRes.ok) {
        const users = await empRes.json()
        setEmployees(Array.isArray(users) ? users.filter((u: any) => u.role === 'EMPLOYEE') : [])
      }
      if (goalsRes.ok) {
        const goals = await goalsRes.json()
        setLockedGoals(Array.isArray(goals) ? goals : [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(empSearch.toLowerCase()) &&
    !selectedEmployees.includes(e.id)
  )

  async function handleGrantExemption() {
    if (!selectedEmployees.length || exemptReason.length < 10) return
    setSubmitting(true)
    try {
      const activeCycle = await fetch('/api/cycles').then(r => r.json()).then((c: any[]) => c.find(x => x.isActive))
      if (!activeCycle) return alert('No active cycle found')

      const res = await fetch('/api/admin/exempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: selectedEmployees,
          cycleId: activeCycle.id,
          quarter: exemptScope === 'quarter' ? exemptQuarter : null,
          reason: exemptReason,
        }),
      })
      if (res.ok) {
        setShowDrawer(false)
        setSelectedEmployees([])
        setExemptReason('')
        setEmpSearch('')
        loadData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Are you sure you want to revoke this exemption?')) return
    try {
      const res = await fetch(`/api/admin/exempt?id=${id}`, { method: 'DELETE' })
      if (res.ok) loadData()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleUnlock(goalId: string) {
    if (unlockReason.length < 5) return
    try {
      const res = await fetch(`/api/admin/goals/${goalId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: unlockReason }),
      })
      if (res.ok) {
        setShowUnlockDrawer(null)
        setUnlockReason('')
        loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-bg-elevated rounded-lg skeleton" />
        <div className="h-64 bg-bg-elevated rounded-xl skeleton" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-text-primary">Goal Exceptions</h1>
          <p className="text-text-secondary text-sm mt-1">Exempt employees from escalation rules or unlock goals</p>
        </div>
        {activeTab === 'exemptions' && (
          <Button onClick={() => setShowDrawer(true)}>
            <Plus size={14} className="mr-1.5" /> Grant Exemption
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-elevated rounded-xl p-1 w-fit">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'exemptions' ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('exemptions')}
        >
          <Shield size={14} className="inline mr-1.5 -mt-0.5" />
          Exemptions
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'unlocks' ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('unlocks')}
        >
          <Unlock size={14} className="inline mr-1.5 -mt-0.5" />
          Goal Unlocks
        </button>
      </div>

      {/* Exemptions Tab */}
      {activeTab === 'exemptions' && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Exempted employees are excluded from automated escalation notifications and overdue flags in the completion dashboard.
          </p>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-elevated">
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Employee</th>
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Scope</th>
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Reason</th>
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Granted By</th>
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Date</th>
                    <th className="px-4 py-3 text-right text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exemptions.map(ex => (
                    <tr key={ex.id} className="border-b border-border-subtle hover:bg-bg-elevated transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-primary text-[13px]">{ex.employee.name}</div>
                        <div className="text-[11px] text-text-muted">{ex.employee.department || 'Employee'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ex.quarter ? 'accent' : 'default'}>
                          {ex.quarter || 'Entire Cycle'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-[13px] max-w-[250px] truncate">{ex.reason}</td>
                      <td className="px-4 py-3 text-text-secondary text-[13px]">{ex.grantedBy.name}</td>
                      <td className="px-4 py-3 text-text-muted text-[12px] font-mono">
                        {new Date(ex.grantedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(ex.id)}
                          className="text-[#EF4444] hover:text-[#DC2626] hover:bg-[rgba(239,68,68,0.08)]"
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {exemptions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                        No active exemptions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goal Unlocks Tab */}
      {activeTab === 'unlocks' && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Unlock locked goals to allow employees to edit them. All unlock actions are logged in the audit trail.
          </p>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-elevated">
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Employee</th>
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Goal Title</th>
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Locked On</th>
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lockedGoals.map(goal => (
                    <tr key={goal.id} className="border-b border-border-subtle hover:bg-bg-elevated transition-colors">
                      <td className="px-4 py-3 text-text-primary text-[13px] font-medium">{goal.employee?.name || '—'}</td>
                      <td className="px-4 py-3 text-text-secondary text-[13px] max-w-[250px] truncate">{goal.title}</td>
                      <td className="px-4 py-3 text-text-muted text-[12px] font-mono">
                        {goal.lockedAt ? new Date(goal.lockedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="warning">LOCKED</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => { setShowUnlockDrawer(goal); setUnlockReason('') }}>
                          <Unlock size={12} className="mr-1" /> Unlock
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {lockedGoals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                        No locked goals found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grant Exemption Modal */}
      <AnimatePresence>
        {showDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowDrawer(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                <h2 className="text-lg font-display font-semibold text-text-primary">Grant Exemption</h2>
                <button onClick={() => setShowDrawer(false)} className="text-text-muted hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Employee Selection */}
                <div>
                  <label className="text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium mb-2 block">
                    Select Employees *
                  </label>
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <Input
                      placeholder="Search employees..."
                      value={empSearch}
                      onChange={e => setEmpSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  {/* Selected chips */}
                  {selectedEmployees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedEmployees.map(id => {
                        const emp = employees.find(e => e.id === id)
                        return (
                          <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-subtle text-accent text-xs rounded-full">
                            {emp?.name || id}
                            <button onClick={() => setSelectedEmployees(s => s.filter(x => x !== id))}>
                              <X size={10} />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                  <div className="max-h-[160px] overflow-y-auto border border-border-subtle rounded-lg">
                    {filteredEmployees.slice(0, 20).map(emp => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-bg-elevated cursor-pointer text-sm border-b border-border-subtle last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedEmployees(s => [...s, emp.id])
                            else setSelectedEmployees(s => s.filter(x => x !== emp.id))
                          }}
                          className="rounded border-border-default text-accent focus:ring-accent"
                        />
                        <span className="text-text-primary">{emp.name}</span>
                        {emp.department && <span className="text-text-muted text-xs">— {emp.department}</span>}
                      </label>
                    ))}
                  </div>
                  <div className="text-xs text-text-muted mt-1">Selected: {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''}</div>
                </div>

                {/* Scope */}
                <div>
                  <label className="text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium mb-2 block">
                    Applies to *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="scope" checked={exemptScope === 'cycle'} onChange={() => setExemptScope('cycle')} className="text-accent focus:ring-accent" />
                      <span className="text-sm text-text-primary">Entire Cycle</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="scope" checked={exemptScope === 'quarter'} onChange={() => setExemptScope('quarter')} className="text-accent focus:ring-accent" />
                      <span className="text-sm text-text-primary">Specific Quarter</span>
                    </label>
                    {exemptScope === 'quarter' && (
                      <select
                        value={exemptQuarter}
                        onChange={e => setExemptQuarter(e.target.value)}
                        className="h-8 px-2 text-sm bg-bg-elevated border border-border-default rounded-md text-text-primary"
                      >
                        {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                    )}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium mb-2 block">
                    Reason * <span className="normal-case tracking-normal">(min 10 characters)</span>
                  </label>
                  <textarea
                    value={exemptReason}
                    onChange={e => setExemptReason(e.target.value)}
                    rows={3}
                    placeholder="e.g., Parental leave, extended medical absence..."
                    className="w-full px-3 py-2.5 text-sm bg-bg-elevated border border-border-default rounded-[var(--radius-md)] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow resize-none"
                  />
                  {exemptReason.length > 0 && exemptReason.length < 10 && (
                    <p className="text-[11px] text-[#EF4444] mt-1">{10 - exemptReason.length} more characters needed</p>
                  )}
                </div>

                {/* Warning */}
                <div className="flex items-start gap-3 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-[#F59E0B] mt-0.5 shrink-0" />
                  <p className="text-xs text-text-secondary">
                    This action is logged. Exempt employees will show &apos;~&apos; in the completion dashboard and be skipped by escalations.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border-subtle flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDrawer(false)}>Cancel</Button>
                <Button
                  onClick={handleGrantExemption}
                  disabled={submitting || selectedEmployees.length === 0 || exemptReason.length < 10}
                >
                  {submitting ? 'Granting...' : `Grant Exemption for ${selectedEmployees.length} employee${selectedEmployees.length !== 1 ? 's' : ''} →`}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unlock Modal */}
      <AnimatePresence>
        {showUnlockDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowUnlockDrawer(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                <h2 className="text-lg font-display font-semibold text-text-primary">Unlock Goal</h2>
                <button onClick={() => setShowUnlockDrawer(null)} className="text-text-muted hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1">Employee</div>
                  <div className="text-text-primary font-medium">{showUnlockDrawer.employee?.name || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1">Goal</div>
                  <div className="text-text-primary">{showUnlockDrawer.title}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1">Locked On</div>
                  <div className="text-text-secondary text-sm font-mono">
                    {showUnlockDrawer.lockedAt ? new Date(showUnlockDrawer.lockedAt).toLocaleString() : '—'}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium mb-2 block">
                    Reason for Unlock *
                  </label>
                  <textarea
                    value={unlockReason}
                    onChange={e => setUnlockReason(e.target.value)}
                    rows={3}
                    placeholder="Why is this goal being unlocked?"
                    className="w-full px-3 py-2.5 text-sm bg-bg-elevated border border-border-default rounded-[var(--radius-md)] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow resize-none"
                  />
                </div>
                <div className="flex items-start gap-3 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-[#F59E0B] mt-0.5 shrink-0" />
                  <p className="text-xs text-text-secondary">
                    Unlocking this goal will allow the employee to edit it. This action is logged in the audit trail.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-subtle flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowUnlockDrawer(null)}>Cancel</Button>
                <Button onClick={() => handleUnlock(showUnlockDrawer.id)} disabled={unlockReason.length < 5}>
                  Confirm Unlock
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
