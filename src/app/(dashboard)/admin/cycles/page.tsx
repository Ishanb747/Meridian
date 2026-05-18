'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Cycle {
  id: string
  name: string
  year: number
  currentPhase: string
  isActive: boolean
  goalSettingOpen: string
  q1Open: string
  q2Open: string
  q3Open: string
  q4Open: string
}

const phases = [
  { key: 'GOAL_SETTING', label: 'Goal Setting', field: 'goalSettingOpen' },
  { key: 'Q1_CHECKIN', label: 'Q1', field: 'q1Open' },
  { key: 'Q2_CHECKIN', label: 'Q2', field: 'q2Open' },
  { key: 'Q3_CHECKIN', label: 'Q3', field: 'q3Open' },
  { key: 'Q4_ANNUAL', label: 'Q4', field: 'q4Open' },
] as const

const phaseLabels: Record<string, string> = {
  GOAL_SETTING: 'Goal Setting',
  Q1_CHECKIN: 'Q1 Check-in',
  Q2_CHECKIN: 'Q2 Check-in',
  Q3_CHECKIN: 'Q3 Check-in',
  Q4_ANNUAL: 'Q4 Annual',
  CLOSED: 'Closed',
}

const emptyForm = {
  name: '',
  year: new Date().getFullYear(),
  currentPhase: 'GOAL_SETTING',
  goalSettingOpen: '',
  q1Open: '',
  q2Open: '',
  q3Open: '',
  q4Open: '',
}

type CycleForm = typeof emptyForm

function toDateInput(value: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildForm(cycle: Cycle): CycleForm {
  return {
    name: cycle.name,
    year: cycle.year,
    currentPhase: cycle.currentPhase,
    goalSettingOpen: toDateInput(cycle.goalSettingOpen),
    q1Open: toDateInput(cycle.q1Open),
    q2Open: toDateInput(cycle.q2Open),
    q3Open: toDateInput(cycle.q3Open),
    q4Open: toDateInput(cycle.q4Open),
  }
}

function CycleTimeline({ cycle }: { cycle: Cycle }) {
  const currentIndex = phases.findIndex((phase) => phase.key === cycle.currentPhase)

  return (
    <div className="mt-5">
      <div className="grid grid-cols-5 items-start gap-0">
        {phases.map((phase, index) => {
          const isCurrent = phase.key === cycle.currentPhase
          const isDone = currentIndex > index
          const isUpcoming = currentIndex < index

          return (
            <div key={phase.key} className="relative flex flex-col items-center text-center">
              {index > 0 && (
                <div className={cn(
                  'absolute right-1/2 top-2.5 h-0.5 w-full',
                  isDone || isCurrent ? 'bg-success/50' : 'bg-border'
                )} />
              )}
              <div
                className={cn(
                  'relative z-10 h-5 w-5 rounded-full border-2 bg-bg-surface',
                  isCurrent && 'border-success bg-success shadow-[0_0_0_4px_var(--success-subtle)]',
                  isDone && 'border-success bg-success',
                  isUpcoming && 'border-border bg-bg-overlay'
                )}
              >
                {isDone && <Check className="h-3 w-3 text-white absolute left-0.5 top-0.5" />}
              </div>
              <div className="mt-3 text-xs font-medium text-text-primary">{phase.label}</div>
              <div className="mt-1 text-[11px] text-text-muted">
                {formatDate(cycle[phase.field])}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CyclesPage() {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null)
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null)
  const [form, setForm] = useState<CycleForm>(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const activeCycle = useMemo(() => cycles.find((cycle) => cycle.isActive), [cycles])
  const inactiveCycles = useMemo(() => cycles.filter((cycle) => !cycle.isActive), [cycles])

  const fetchCycles = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cycles')
      if (res.ok) setCycles(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCycles()
  }, [])

  const openCreate = () => {
    setError('')
    setEditingCycleId(null)
    setForm({
      ...emptyForm,
      name: `FY ${new Date().getFullYear()}`,
      year: new Date().getFullYear(),
    })
    setDrawerMode('create')
  }

  const openEdit = (cycle: Cycle) => {
    setError('')
    setEditingCycleId(cycle.id)
    setForm(buildForm(cycle))
    setDrawerMode('edit')
  }

  const closeDrawer = () => {
    setDrawerMode(null)
    setEditingCycleId(null)
    setError('')
    setSaving(false)
  }

  const saveCycle = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const endpoint = drawerMode === 'edit' && editingCycleId ? `/api/cycles/${editingCycleId}` : '/api/cycles'
    const method = drawerMode === 'edit' ? 'PATCH' : 'POST'

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Unable to save cycle')
        return
      }

      closeDrawer()
      fetchCycles()
    } finally {
      setSaving(false)
    }
  }

  const activateCycle = async (cycleId: string) => {
    const res = await fetch(`/api/cycles/${cycleId}/activate`, { method: 'POST' })
    if (res.ok) fetchCycles()
  }

  const deleteCycle = async (cycleId: string) => {
    if (!window.confirm('Delete this cycle? This only works for inactive cycles without goals.')) return
    const res = await fetch(`/api/cycles/${cycleId}`, { method: 'DELETE' })
    if (res.ok) {
      fetchCycles()
      return
    }
    const data = await res.json()
    alert(data.error || 'Unable to delete cycle')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">Cycles</h1>
          <p className="text-text-secondary mt-1">Manage the annual goal cycle and check-in phases.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Create Cycle
        </Button>
      </div>

      {activeCycle ? (
        <Card className="border-accent/30">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{activeCycle.name}</CardTitle>
                <div className="mt-3 flex items-center gap-3 text-sm text-text-secondary">
                  <Calendar className="h-4 w-4 text-text-muted" />
                  Current Phase: {phaseLabels[activeCycle.currentPhase] || activeCycle.currentPhase}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Active</Badge>
                <Button variant="secondary" size="sm" onClick={() => openEdit(activeCycle)}>
                  <Pencil size={14} />
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CycleTimeline cycle={activeCycle} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-text-secondary">
            No active cycle. Activate one below or create a new cycle.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">All Cycles</h2>
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="skeleton h-4 w-32 mx-auto rounded" />
            </CardContent>
          </Card>
        ) : cycles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-text-muted">No cycles created yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-subtle">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3">Cycle</th>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Goal Setting</th>
                  <th className="px-4 py-3">Q1</th>
                  <th className="px-4 py-3">Q2</th>
                  <th className="px-4 py-3">Q3</th>
                  <th className="px-4 py-3">Q4</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-bg-surface">
                {[activeCycle, ...inactiveCycles].filter(Boolean).map((cycle) => (
                  <tr key={cycle!.id} className="hover:bg-bg-elevated">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{cycle!.name}</div>
                      <div className="text-xs text-text-muted">FY {cycle!.year}</div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {cycle!.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        phaseLabels[cycle!.currentPhase] || cycle!.currentPhase
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(cycle!.goalSettingOpen)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(cycle!.q1Open)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(cycle!.q2Open)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(cycle!.q3Open)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(cycle!.q4Open)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(cycle!)}>
                          <Pencil size={14} />
                          Edit
                        </Button>
                        {!cycle!.isActive && (
                          <>
                            <Button variant="secondary" size="sm" onClick={() => activateCycle(cycle!.id)}>
                              Activate
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteCycle(cycle!.id)}>
                              <Trash2 size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawerMode && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl max-h-[90vh] rounded-xl overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border-subtle">
              <CardTitle>{drawerMode === 'create' ? 'Create Cycle' : 'Edit Cycle'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={closeDrawer}>
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={saveCycle} className="space-y-4">
                <Input
                  label="Name"
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="FY 2027"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Year"
                    type="number"
                    required
                    value={form.year}
                    onChange={(event) => setForm({ ...form, year: Number(event.target.value) })}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Current Phase</label>
                    <select
                      value={form.currentPhase}
                      onChange={(event) => setForm({ ...form, currentPhase: event.target.value })}
                      className="w-full h-10 rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary"
                    >
                      {Object.entries(phaseLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Goal Setting Open" type="date" required value={form.goalSettingOpen} onChange={(event) => setForm({ ...form, goalSettingOpen: event.target.value })} />
                  <Input label="Q1 Check-in Open" type="date" required value={form.q1Open} onChange={(event) => setForm({ ...form, q1Open: event.target.value })} />
                  <Input label="Q2 Check-in Open" type="date" required value={form.q2Open} onChange={(event) => setForm({ ...form, q2Open: event.target.value })} />
                  <Input label="Q3 Check-in Open" type="date" required value={form.q3Open} onChange={(event) => setForm({ ...form, q3Open: event.target.value })} />
                  <Input label="Q4 Annual Review" type="date" required value={form.q4Open} onChange={(event) => setForm({ ...form, q4Open: event.target.value })} />
                </div>

                {error && <p className="rounded-md border border-danger/30 bg-danger-subtle p-3 text-sm text-danger">{error}</p>}

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={closeDrawer}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Cycle'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
