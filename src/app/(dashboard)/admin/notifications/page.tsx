'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, MessageSquare, Send, Clock, XCircle, RefreshCw, Download, Settings } from 'lucide-react'

interface NotificationLogEntry {
  id: string
  recipientId: string
  recipientName: string
  channel: 'EMAIL' | 'TEAMS'
  template: string
  subject: string | null
  status: 'PENDING' | 'SENT' | 'FAILED'
  sentAt: string | null
  error: string | null
  createdAt: string
}

const STATUS_CONFIG = {
  SENT:    { label: 'Sent',    variant: 'success' as const, icon: Send },
  PENDING: { label: 'Pending', variant: 'accent' as const,  icon: Clock },
  FAILED:  { label: 'Failed',  variant: 'danger' as const,  icon: XCircle },
}

const TEMPLATE_LABELS: Record<string, string> = {
  goal_submitted: 'Goal Submitted',
  goal_approved: 'Goal Approved',
  goal_returned: 'Goal Returned',
  checkin_reminder: 'Check-in Reminder',
  window_opening: 'Window Opening',
  escalation_level1: 'Escalation L1',
  escalation_level2: 'Escalation L2',
  escalation_level3: 'Escalation L3',
  goal_unlocked: 'Goal Unlocked',
  shared_goal_received: 'Shared Goal',
}

export default function NotificationsPage() {
  const [logs] = useState<NotificationLogEntry[]>([])
  const [filterChannel, setFilterChannel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTemplate, setFilterTemplate] = useState('')

  const emailEnabled = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_NOTIFICATIONS_EMAIL_ENABLED === 'true' : false
  const teamsEnabled = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_NOTIFICATIONS_TEAMS_ENABLED === 'true' : false
  const anyEnabled = emailEnabled || teamsEnabled

  // Compute stats
  const stats = {
    total: logs.length,
    email: logs.filter(l => l.channel === 'EMAIL').length,
    teams: logs.filter(l => l.channel === 'TEAMS').length,
    failed: logs.filter(l => l.status === 'FAILED').length,
  }

  const filtered = logs.filter(l => {
    if (filterChannel && l.channel !== filterChannel) return false
    if (filterStatus && l.status !== filterStatus) return false
    if (filterTemplate && l.template !== filterTemplate) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-text-primary">Notification Log</h1>
          <p className="text-text-secondary text-sm mt-1">All emails and Teams messages sent by the system</p>
        </div>
        <Button variant="outline" size="sm" disabled={logs.length === 0}>
          <Download size={14} className="mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Feature flag notice */}
      {!anyEnabled && (
        <div className="flex items-start gap-3 bg-bg-surface border border-border-subtle rounded-xl px-5 py-4">
          <Settings size={18} className="text-text-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-text-primary font-medium">Notifications are not configured</p>
            <p className="text-xs text-text-secondary mt-1">
              Set <code className="px-1.5 py-0.5 bg-bg-elevated rounded text-accent font-mono text-[11px]">NEXT_PUBLIC_NOTIFICATIONS_EMAIL_ENABLED=true</code> or{' '}
              <code className="px-1.5 py-0.5 bg-bg-elevated rounded text-accent font-mono text-[11px]">NEXT_PUBLIC_NOTIFICATIONS_TEAMS_ENABLED=true</code> to activate.
            </p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 text-center">
          <div className="text-2xl font-bold font-mono text-text-primary">{stats.total}</div>
          <div className="text-[11px] text-text-muted uppercase tracking-wider mt-1">Total Sent</div>
        </div>
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Mail size={16} className="text-accent" />
            <span className="text-2xl font-bold font-mono text-text-primary">{stats.email}</span>
          </div>
          <div className="text-[11px] text-text-muted uppercase tracking-wider mt-1">Emails</div>
        </div>
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <MessageSquare size={16} className="text-[#38BDF8]" />
            <span className="text-2xl font-bold font-mono text-text-primary">{stats.teams}</span>
          </div>
          <div className="text-[11px] text-text-muted uppercase tracking-wider mt-1">Teams</div>
        </div>
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <XCircle size={16} className="text-[#EF4444]" />
            <span className="text-2xl font-bold font-mono text-text-primary">{stats.failed}</span>
          </div>
          <div className="text-[11px] text-text-muted uppercase tracking-wider mt-1">Failed</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterChannel}
          onChange={e => setFilterChannel(e.target.value)}
          className="h-9 px-3 text-sm bg-bg-elevated border border-border-default rounded-[var(--radius-md)] text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="">All Channels</option>
          <option value="EMAIL">Email</option>
          <option value="TEAMS">Teams</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="h-9 px-3 text-sm bg-bg-elevated border border-border-default rounded-[var(--radius-md)] text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="SENT">Sent</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
        <select
          value={filterTemplate}
          onChange={e => setFilterTemplate(e.target.value)}
          className="h-9 px-3 text-sm bg-bg-elevated border border-border-default rounded-[var(--radius-md)] text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="">All Templates</option>
          {Object.entries(TEMPLATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-elevated">
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Sent At</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Recipient</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Channel</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Template</th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Subject</th>
                <th className="px-4 py-3 text-center text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Status</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const statusConfig = STATUS_CONFIG[log.status]
                return (
                  <tr key={log.id} className="border-b border-border-subtle hover:bg-bg-elevated transition-colors">
                    <td className="px-4 py-3 font-mono text-[12px] text-text-secondary whitespace-nowrap">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-text-primary">{log.recipientName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        {log.channel === 'EMAIL' ? <Mail size={12} /> : <MessageSquare size={12} />}
                        {log.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{TEMPLATE_LABELS[log.template] || log.template}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-text-secondary max-w-[200px] truncate">{log.subject || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusConfig.variant}>
                        {log.status === 'PENDING' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1" />}
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {log.status === 'FAILED' && (
                        <Button variant="ghost" size="sm" className="text-accent">
                          <RefreshCw size={12} className="mr-1" /> Resend
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Mail size={32} className="mx-auto text-text-muted mb-3" />
                    <div className="text-text-muted">No notification logs yet.</div>
                    <div className="text-xs text-text-muted mt-1">
                      Notifications will appear here when triggered by the system.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
