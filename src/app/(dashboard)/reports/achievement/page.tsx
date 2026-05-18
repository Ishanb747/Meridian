'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatScore } from '@/lib/scoring'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Download, X, ChevronDown, ChevronUp,
  ArrowUpDown, ArrowUp, ArrowDown, Filter
} from 'lucide-react'

interface AchievementRow {
  id: string
  quarter: string
  actualValue: number | null
  actualDate: string | null
  computedScore: number | null
  status: string
  notes: string | null
  goal: {
    id: string
    title: string
    description: string | null
    targetValue: number | null
    targetDate: string | null
    uomType: string
    weightage: number
    employee: { id: string; name: string; department: string | null }
    thrustArea: { name: string; color: string }
  }
}

type SortField = 'employee' | 'title' | 'thrustArea' | 'quarter' | 'target' | 'actual' | 'score' | 'status'
type SortDir = 'asc' | 'desc'

const STATUS_OPTIONS = ['NOT_STARTED', 'ON_TRACK', 'COMPLETED']
const QUARTER_OPTIONS = ['Q1', 'Q2', 'Q3', 'Q4']
const UOM_OPTIONS = ['MIN_NUMERIC', 'MAX_NUMERIC', 'MIN_PERCENT', 'MAX_PERCENT', 'TIMELINE', 'ZERO']

const statusBadgeConfig: Record<string, { bg: string; text: string }> = {
  NOT_STARTED: { bg: 'bg-bg-elevated', text: 'text-text-secondary' },
  ON_TRACK:    { bg: 'bg-[rgba(56,189,248,0.12)]', text: 'text-[#38BDF8]' },
  COMPLETED:   { bg: 'bg-[rgba(34,197,94,0.12)]', text: 'text-[#22C55E]' },
}

export default function AchievementReportPage() {
  const [achievements, setAchievements] = useState<AchievementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterQuarter, setFilterQuarter] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUom, setFilterUom] = useState('')
  const [sortField, setSortField] = useState<SortField>('employee')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 25

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/reports/achievement')
        if (res.ok) setAchievements(await res.json())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; clear: () => void }[] = []
    if (filterQuarter) filters.push({ key: 'quarter', label: filterQuarter, clear: () => setFilterQuarter('') })
    if (filterStatus) filters.push({ key: 'status', label: filterStatus.replace('_', ' '), clear: () => setFilterStatus('') })
    if (filterUom) filters.push({ key: 'uom', label: filterUom.replace('_', ' '), clear: () => setFilterUom('') })
    return filters
  }, [filterQuarter, filterStatus, filterUom])

  const filtered = useMemo(() => {
    let result = [...achievements]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(a =>
        a.goal.employee.name.toLowerCase().includes(q) ||
        a.goal.title.toLowerCase().includes(q)
      )
    }
    if (filterQuarter) result = result.filter(a => a.quarter === filterQuarter)
    if (filterStatus) result = result.filter(a => a.status === filterStatus)
    if (filterUom) result = result.filter(a => a.goal.uomType === filterUom)
    return result
  }, [achievements, search, filterQuarter, filterStatus, filterUom])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'employee': cmp = a.goal.employee.name.localeCompare(b.goal.employee.name); break
        case 'title': cmp = a.goal.title.localeCompare(b.goal.title); break
        case 'thrustArea': cmp = a.goal.thrustArea.name.localeCompare(b.goal.thrustArea.name); break
        case 'quarter': cmp = a.quarter.localeCompare(b.quarter); break
        case 'target': cmp = (a.goal.targetValue || 0) - (b.goal.targetValue || 0); break
        case 'actual': cmp = (a.actualValue || 0) - (b.actualValue || 0); break
        case 'score': cmp = (a.computedScore || 0) - (b.computedScore || 0); break
        case 'status': cmp = a.status.localeCompare(b.status); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtered, sortField, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }, [sortField])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
  }

  const clearAllFilters = () => {
    setSearch('')
    setFilterQuarter('')
    setFilterStatus('')
    setFilterUom('')
  }

  const handleExport = async (format: 'csv' | 'xlsx') => {
    // Client-side CSV export
    if (format === 'csv') {
      const headers = ['Employee', 'Department', 'Goal Title', 'Thrust Area', 'UoM', 'Target', 'Actual', 'Score (%)', 'Status', 'Quarter']
      const rows = filtered.map(a => [
        a.goal.employee.name,
        a.goal.employee.department || '',
        a.goal.title,
        a.goal.thrustArea.name,
        a.goal.uomType,
        a.goal.targetValue ?? '',
        a.actualValue ?? '',
        a.computedScore !== null ? Math.round(a.computedScore * 100) : '',
        a.status,
        a.quarter,
      ])
      const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `AtomQuest_Achievement_Report.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-bg-elevated rounded-lg skeleton" />
        <div className="h-12 bg-bg-elevated rounded-lg skeleton" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-bg-elevated rounded-lg skeleton" style={{ animationDelay: `${i * 80}ms` }} />
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
          <h1 className="text-xl font-display font-bold text-text-primary">Achievement Report</h1>
          <p className="text-text-secondary text-sm mt-1">FY 2026 · All Goals · All Quarters</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download size={14} className="mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-bg-surface border border-border-subtle rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search employee or goal..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <select
            value={filterQuarter}
            onChange={e => { setFilterQuarter(e.target.value); setPage(1) }}
            className="h-9 px-3 text-sm bg-bg-elevated border border-border-default rounded-[var(--radius-md)] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow"
          >
            <option value="">All Quarters</option>
            {QUARTER_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            className="h-9 px-3 text-sm bg-bg-elevated border border-border-default rounded-[var(--radius-md)] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select
            value={filterUom}
            onChange={e => { setFilterUom(e.target.value); setPage(1) }}
            className="h-9 px-3 text-sm bg-bg-elevated border border-border-default rounded-[var(--radius-md)] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow"
          >
            <option value="">All UoM Types</option>
            {UOM_OPTIONS.map(u => <option key={u} value={u}>{u.replace(/_/g, ' ')}</option>)}
          </select>
          {(search || activeFilters.length > 0) && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-text-secondary text-xs">
              Reset all
            </Button>
          )}
        </div>

        {/* Filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {activeFilters.map(f => (
              <span key={f.key} className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent-subtle text-accent text-xs rounded-full font-medium">
                {f.label}
                <button onClick={f.clear} className="hover:text-accent-hover">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-xs text-text-muted">
        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== achievements.length && ` (filtered from ${achievements.length})`}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-elevated">
                  {([
                    ['employee', 'Employee'],
                    ['title', 'Goal Title'],
                    ['thrustArea', 'Thrust Area'],
                    ['quarter', 'Quarter'],
                    ['target', 'Target'],
                    ['actual', 'Actual'],
                    ['score', 'Score'],
                    ['status', 'Status'],
                  ] as [SortField, string][]).map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => handleSort(field)}
                      className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium cursor-pointer select-none group hover:text-text-primary transition-colors"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {label}
                        <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((ach) => {
                  const scoreFmt = formatScore(ach.computedScore)
                  const isExpanded = expandedRow === ach.id
                  const statusStyle = statusBadgeConfig[ach.status] || statusBadgeConfig.NOT_STARTED
                  const scorePct = ach.computedScore !== null ? Math.min(Math.round(ach.computedScore * 100), 200) : 0

                  return (
                    <motion.tbody key={ach.id} layout>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : ach.id)}
                        className="border-b border-border-subtle hover:bg-bg-elevated cursor-pointer transition-colors duration-[120ms]"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-text-primary text-[13px]">{ach.goal.employee.name}</div>
                          <div className="text-[11px] text-text-muted">{ach.goal.employee.department || '—'}</div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="truncate text-text-primary text-[13px]">{ach.goal.title}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 text-[11px] rounded-full font-medium border"
                            style={{
                              backgroundColor: `${ach.goal.thrustArea.color}18`,
                              color: ach.goal.thrustArea.color,
                              borderColor: `${ach.goal.thrustArea.color}30`,
                            }}
                          >
                            {ach.goal.thrustArea.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-[13px]">{ach.quarter}</td>
                        <td className="px-4 py-3 text-text-secondary font-mono text-[13px]">{ach.goal.targetValue ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-[13px]">
                          {ach.actualValue !== null ? (
                            <span className="text-text-primary">{ach.actualValue}</span>
                          ) : (
                            <span className="text-[#EF4444]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-[60px] h-1 bg-bg-overlay rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(scorePct, 100)}%`,
                                  backgroundColor: scorePct >= 100 ? '#22C55E' : scorePct >= 75 ? '#38BDF8' : scorePct >= 50 ? '#F59E0B' : '#EF4444'
                                }}
                              />
                            </div>
                            <span className={`font-mono text-[13px] font-semibold ${scoreFmt.color}`}>{scoreFmt.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {ach.status === 'ON_TRACK' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                            {ach.status === 'COMPLETED' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                            {ach.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable row */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 py-4 bg-bg-elevated border-b border-border-subtle">
                                  <div className="grid grid-cols-3 gap-6 text-sm">
                                    <div>
                                      <div className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1">Goal Description</div>
                                      <p className="text-text-secondary text-[13px]">{ach.goal.description || 'No description provided.'}</p>
                                    </div>
                                    <div>
                                      <div className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1">Employee Notes</div>
                                      <p className="text-text-secondary text-[13px]">{ach.notes || 'No notes added.'}</p>
                                    </div>
                                    <div>
                                      <div className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1">Details</div>
                                      <div className="space-y-1 text-[13px]">
                                        <div className="text-text-secondary">UoM: <span className="text-text-primary">{ach.goal.uomType.replace(/_/g, ' ')}</span></div>
                                        <div className="text-text-secondary">Weightage: <span className="text-text-primary">{ach.goal.weightage}%</span></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </motion.tbody>
                  )
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="text-text-muted mb-2">No results match your filters.</div>
                      <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear all filters</Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-text-secondary px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
