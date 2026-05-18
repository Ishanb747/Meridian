'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X, Settings } from 'lucide-react'

// Default escalation rules (seeded or from API)
const DEFAULT_RULES = [
  { id: '1', name: 'Goal Submission Overdue', ruleType: 'GOAL_SUBMISSION_OVERDUE', thresholdDays: 7, repeatDays: 3, isActive: true },
  { id: '2', name: 'Manager Approval Overdue', ruleType: 'MANAGER_APPROVAL_OVERDUE', thresholdDays: 5, repeatDays: 3, isActive: true },
  { id: '3', name: 'Check-in Missing', ruleType: 'CHECKIN_MISSING', thresholdDays: 7, repeatDays: 3, isActive: true },
  { id: '4', name: 'Manager Check-in Missing', ruleType: 'MANAGER_CHECKIN_MISSING', thresholdDays: 7, repeatDays: 3, isActive: false },
]

interface EscalationRule {
  id: string
  name: string
  ruleType: string
  thresholdDays: number
  repeatDays: number
  isActive: boolean
}

interface EscalationLog {
  id: string
  ruleType: string
  ruleName: string
  targetUser: { name: string; department: string | null }
  level: number
  notifiedChain: { userId: string; name: string; role: string; notifiedAt: string; channel: string }[]
  resolvedAt: string | null
  triggeredAt: string
}

// const LEVEL_CONFIG = {
//   1: { label: 'Reminder', variant: 'default', icon: Bell },
//   2: { label: 'Skip-level', variant: 'warning', icon: AlertCircle },
//   3: { label: 'HR Escalation', variant: 'danger', icon: AlertCircle },
// }

const RULE_DESCRIPTIONS: Record<string, string> = {
  GOAL_SUBMISSION_OVERDUE: 'Fires when an employee has not submitted goals within N days of the goal setting window opening.',
  MANAGER_APPROVAL_OVERDUE: 'Fires when a manager has pending goal submissions older than N days.',
  CHECKIN_MISSING: 'Fires when an employee has not logged achievements for the current quarter within N days.',
  MANAGER_CHECKIN_MISSING: 'Fires when a manager has not submitted check-in feedback within N days.',
}

export default function EscalationsPage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'log'>('rules')
  const [rules, setRules] = useState<EscalationRule[]>(DEFAULT_RULES)
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null)
  const [logs] = useState<EscalationLog[]>([])
  const [logFilter, setLogFilter] = useState<'active' | 'resolved'>('active')

  // Check feature flag from env (client-side via NEXT_PUBLIC_)
  const escalationEnabled = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_ESCALATION_ENABLED === 'true')
    : false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-bold text-text-primary">Escalations</h1>
        <p className="text-text-secondary text-sm mt-1">Configure automated reminders and escalation chains</p>
      </div>

      {/* Feature flag banner */}
      {!escalationEnabled && (
        <div className="flex items-start gap-3 bg-bg-surface border border-border-subtle rounded-xl px-5 py-4">
          <Settings size={18} className="text-text-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-text-primary font-medium">Escalations are disabled</p>
            <p className="text-xs text-text-secondary mt-1">
              Set <code className="px-1.5 py-0.5 bg-bg-elevated rounded text-accent font-mono text-[11px]">NEXT_PUBLIC_ESCALATION_ENABLED=true</code> in your environment to activate. The rules below will be applied once enabled.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-elevated rounded-xl p-1 w-fit">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'rules' ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('rules')}
        >
          Rules
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'log' ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('log')}
        >
          Escalation Log
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-elevated">
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Rule Name</th>
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Type</th>
                    <th className="px-4 py-3 text-center text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Threshold</th>
                    <th className="px-4 py-3 text-center text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Repeat</th>
                    <th className="px-4 py-3 text-center text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Active</th>
                    <th className="px-4 py-3 text-right text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <tr key={rule.id} className="border-b border-border-subtle hover:bg-bg-elevated transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-primary text-[13px]">{rule.name}</div>
                        <div className="text-[11px] text-text-muted mt-0.5 max-w-[300px]">
                          {RULE_DESCRIPTIONS[rule.ruleType] || ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="default">{rule.ruleType.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-[13px] text-text-primary">{rule.thresholdDays} days</td>
                      <td className="px-4 py-3 text-center font-mono text-[13px] text-text-secondary">every {rule.repeatDays}d</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setRules(r => r.map(x => x.id === rule.id ? { ...x, isActive: !x.isActive } : x))}
                          className="relative inline-flex"
                        >
                          <div className={`w-9 h-5 rounded-full transition-colors ${rule.isActive ? 'bg-accent' : 'bg-bg-overlay'}`} />
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rule.isActive ? 'translate-x-4' : ''}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditingRule(rule)}>Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="text-right">
            <Button variant="outline" size="sm" disabled className="opacity-50 cursor-not-allowed" title="Coming soon">
              + Add Custom Rule
            </Button>
          </div>
        </div>
      )}

      {/* Log Tab */}
      {activeTab === 'log' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-bg-elevated rounded-lg p-0.5">
              <button
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${logFilter === 'active' ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary'}`}
                onClick={() => setLogFilter('active')}
              >
                Active
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${logFilter === 'resolved' ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-secondary'}`}
                onClick={() => setLogFilter('resolved')}
              >
                Resolved
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-elevated">
                    <th className="w-8 px-2" />
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Triggered</th>
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Employee</th>
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Rule</th>
                    <th className="px-4 py-3 text-center text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Level</th>
                    <th className="px-4 py-3 text-center text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <AlertCircle size={32} className="mx-auto text-text-muted mb-3" />
                        <div className="text-text-muted">No escalation logs yet.</div>
                        <div className="text-xs text-text-muted mt-1">
                          {escalationEnabled
                            ? 'Escalations will appear here when rules are triggered.'
                            : 'Enable escalations to start generating logs.'}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Rule Modal */}
      <AnimatePresence>
        {editingRule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50" onClick={() => setEditingRule(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                <h2 className="text-lg font-display font-semibold text-text-primary">Edit Rule</h2>
                <button onClick={() => setEditingRule(null)} className="text-text-muted hover:text-text-primary"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                <div>
                  <label className="text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium mb-2 block">Rule Name</label>
                  <Input value={editingRule.name} onChange={e => setEditingRule({ ...editingRule, name: e.target.value })} className="h-9" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium mb-2 block">First Notify After (days)</label>
                  <Input
                    type="number"
                    min={1}
                    value={editingRule.thresholdDays}
                    onChange={e => setEditingRule({ ...editingRule, thresholdDays: parseInt(e.target.value) || 1 })}
                    className="h-9 w-32"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium mb-2 block">Re-escalate Every (days)</label>
                  <Input
                    type="number"
                    min={1}
                    value={editingRule.repeatDays}
                    onChange={e => setEditingRule({ ...editingRule, repeatDays: parseInt(e.target.value) || 1 })}
                    className="h-9 w-32"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={editingRule.isActive}
                        onChange={e => setEditingRule({ ...editingRule, isActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-bg-overlay rounded-full peer-checked:bg-accent transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
                    </div>
                    <span className="text-sm text-text-primary">Active</span>
                  </label>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-subtle flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditingRule(null)}>Cancel</Button>
                <Button onClick={() => {
                  setRules(r => r.map(x => x.id === editingRule.id ? editingRule : x))
                  setEditingRule(null)
                }}>
                  Save
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
