'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface AuditLog {
  id: string
  user: { name: string; email: string }
  entityType: string
  entityId: string
  action: string
  reason: string | null
  createdAt: string
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })

  useEffect(() => {
    fetchLogs(pagination.page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page])

  const fetchLogs = async (page: number) => {
    try {
      const res = await fetch(`/api/audit-logs?page=${page}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const actionColors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'accent'> = {
    UNLOCK: 'warning',
    APPROVE: 'success',
    RETURN: 'danger',
    EDIT: 'accent',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">Audit Log</h1>
        <p className="text-text-secondary mt-1">Track all system actions and changes</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="skeleton h-4 w-32 mx-auto rounded" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-text-muted">No audit logs yet</p>
                    <p className="text-xs text-text-muted mt-1">Logs will appear here when actions are performed</p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-text-secondary font-mono text-xs">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-text-primary">{log.user.name}</div>
                        <div className="text-xs text-text-muted">{log.user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-text-secondary">{log.entityType}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionColors[log.action] || 'default'}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-text-secondary max-w-xs truncate">
                      {log.reason || '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="px-3 py-1 rounded border border-border text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page === pagination.totalPages}
            className="px-3 py-1 rounded border border-border text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}