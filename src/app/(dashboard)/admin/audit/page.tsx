'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Download, ChevronDown, ChevronRight, AlertTriangle
} from 'lucide-react'

interface AuditEntry {
  id: string
  userId: string
  user: { name: string; email: string }
  entityType: string
  entityId: string
  action: string
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  reason: string | null
  isPostLock: boolean
  createdAt: string
}

const ACTION_BADGES: Record<string, { variant: string; label: string }> = {
  UNLOCK:        { variant: 'warning', label: 'UNLOCK' },
  EDIT_POST_LOCK:{ variant: 'danger', label: 'POST-LOCK EDIT' },
  EDIT:          { variant: 'accent', label: 'EDIT' },
  APPROVE:       { variant: 'success', label: 'APPROVE' },
  RETURN:        { variant: 'danger', label: 'RETURN' },
  CREATE:        { variant: 'default', label: 'CREATE' },
  DELETE:        { variant: 'danger', label: 'DELETE' },
}

const ACTION_OPTIONS = ['UNLOCK', 'EDIT_POST_LOCK', 'EDIT', 'APPROVE', 'RETURN', 'CREATE', 'DELETE']
const ENTITY_OPTIONS = ['Goal', 'Cycle', 'User', 'Achievement']

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [postLockOnly, setPostLockOnly] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 50

  useEffect(() => {
    async function loadData() {
      try {
        const params = new URLSearchParams()
        if (postLockOnly) params.set('postLockOnly', 'true')
        const res = await fetch(`/api/audit?${params}`)
        if (res.ok) setLogs(await res.json())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [postLockOnly])

  const filtered = useMemo(() => {
    let result = [...logs]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.user.name.toLowerCase().includes(q) ||
        l.user.email.toLowerCase().includes(q) ||
        l.entityId.toLowerCase().includes(q)
      )
    }
    if (filterAction) result = result.filter(l => l.action === filterAction)
    if (filterEntity) result = result.filter(l => l.entityType === filterEntity)
    if (dateFrom) result = result.filter(l => new Date(l.createdAt) >= new Date(dateFrom))
    if (dateTo) result = result.filter(l => new Date(l.createdAt) <= new Date(dateTo + 'T23:59:59'))
    return result
  }, [logs, search, filterAction, filterEntity, dateFrom, dateTo])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const getChangedField = (entry: AuditEntry): string => {
    if (entry.oldValue) return Object.keys(entry.oldValue).join(', ')
    if (entry.newValue) return Object.keys(entry.newValue).join(', ')
    return '—'
  }

  const handleExport = () => {
    const headers = ['Timestamp', 'User Email', 'User Name', 'Action', 'Entity Type', 'Entity ID', 'Changed Field', 'Old Value', 'New Value', 'Reason', 'Post-Lock']
    const rows = filtered.map(l => [
      new Date(l.createdAt).toISOString(),
      l.user.email,
      l.user.name,
      l.action,
      l.entityType,
      l.entityId,
      getChangedField(l),
      l.oldValue ? JSON.stringify(l.oldValue) : '',
      l.newValue ? JSON.stringify(l.newValue) : '',
      l.reason || '',
      l.isPostLock ? 'Yes' : 'No',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'AtomQuest_Audit_Trail.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-bg-elevated rounded-lg skeleton" />
        <div className="h-12 bg-bg-elevated rounded-lg skeleton" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 bg-bg-elevated rounded-lg skeleton" style={{ animationDelay: `${i * 60}ms` }} />
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
          <h1 className="text-xl font-display font-bold text-text-primary">Audit Trail</h1>
          <p className="text-text-secondary text-sm mt-1">All system changes, post-lock edits, and admin actions</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download size={14} className="mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-xl px-4 py-3">
        <AlertTriangle size={16} className="text-[#F59E0B] mt-0.5 shrink-0" />
        <p className="text-sm text-text-secondary">
          Post-lock changes are automatically flagged. All entries are immutable.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-bg-surface border border-border-subtle rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search by user or entity..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <select
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(1) }}
            className="h-9 px-3 text-sm bg-bg-elevated border border-border-default rounded-[var(--radius-md)] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow"
          >
            <option value="">All Actions</option>
            {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
          <select
            value={filterEntity}
            onChange={e => { setFilterEntity(e.target.value); setPage(1) }}
            className="h-9 px-3 text-sm bg-bg-elevated border border-border-default rounded-[var(--radius-md)] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow"
          >
            <option value="">All Entities</option>
            {ENTITY_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            placeholder="From"
            className="h-9 px-3 text-sm bg-bg-elevated border border-border-default rounded-[var(--radius-md)] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1) }}
            placeholder="To"
            className="h-9 px-3 text-sm bg-bg-elevated border border-border-default rounded-[var(--radius-md)] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={postLockOnly}
                onChange={e => { setPostLockOnly(e.target.checked); setPage(1) }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-bg-overlay rounded-full peer-checked:bg-accent transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
            </div>
            <span className="text-sm text-text-secondary">Post-Lock Only</span>
          </label>
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-text-muted">
        {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-elevated">
                  <th className="w-8 px-2" />
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Timestamp</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">User</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Action</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Entity</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Changed</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Old → New</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Reason</th>
                  <th className="px-4 py-3 text-center text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">⚠️</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(log => {
                  const isExpanded = expandedRow === log.id
                  const actionBadge = ACTION_BADGES[log.action] || { variant: 'default', label: log.action }

                  return (
                    <tbody key={log.id}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                        className={`border-b border-border-subtle cursor-pointer transition-colors duration-[120ms] hover:bg-bg-elevated ${
                          log.isPostLock ? 'bg-[rgba(239,68,68,0.04)] border-l-[3px] border-l-[#EF4444]' : ''
                        }`}
                      >
                        <td className="px-2 text-text-muted">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[12px] text-text-secondary">
                          {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[13px] text-text-primary font-medium">{log.user.name}</div>
                          <div className="text-[11px] text-text-muted">{log.user.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={actionBadge.variant as any}>{actionBadge.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-text-secondary text-[13px]">{log.entityType}</span>
                          <span className="text-text-muted text-[11px] ml-1">({log.entityId.substring(0, 8)}…)</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-text-secondary">{getChangedField(log)}</td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="flex items-center gap-1.5 text-[12px] font-mono">
                            {log.oldValue && (
                              <span className="text-[#EF4444] truncate max-w-[80px]">{JSON.stringify(Object.values(log.oldValue)[0])}</span>
                            )}
                            {log.oldValue && log.newValue && <span className="text-text-muted">→</span>}
                            {log.newValue && (
                              <span className="text-[#22C55E] truncate max-w-[80px]">{JSON.stringify(Object.values(log.newValue)[0])}</span>
                            )}
                            {!log.oldValue && !log.newValue && <span className="text-text-muted">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-text-secondary max-w-[150px] truncate">{log.reason || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {log.isPostLock && <AlertTriangle size={14} className="text-[#EF4444] inline" />}
                        </td>
                      </tr>

                      {/* Expandable JSON diff */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 py-4 bg-bg-elevated border-b border-border-subtle">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-2">Old Value</div>
                                      <pre className="bg-[#1A0A0A] border border-[rgba(239,68,68,0.2)] rounded-lg p-3 text-[12px] font-mono text-[#EF4444] overflow-x-auto max-h-[200px]">
                                        {log.oldValue ? JSON.stringify(log.oldValue, null, 2) : 'null'}
                                      </pre>
                                    </div>
                                    <div>
                                      <div className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-2">New Value</div>
                                      <pre className="bg-[#0A1A0A] border border-[rgba(34,197,94,0.2)] rounded-lg p-3 text-[12px] font-mono text-[#22C55E] overflow-x-auto max-h-[200px]">
                                        {log.newValue ? JSON.stringify(log.newValue, null, 2) : 'null'}
                                      </pre>
                                    </div>
                                  </div>
                                  {log.reason && (
                                    <div className="mt-3 p-3 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-lg">
                                      <span className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Reason: </span>
                                      <span className="text-sm text-text-primary">{log.reason}</span>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </tbody>
                  )
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-text-muted">
                      No audit logs found.
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
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm text-text-secondary px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
