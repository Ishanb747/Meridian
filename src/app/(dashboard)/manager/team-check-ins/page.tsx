'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'

interface TeamMember {
  id: string
  name: string
  email: string
  department: string | null
  goalsCount: number
  achievementsLogged: number
  averageScore: number
  checkin: { completedAt: string } | null
  checkinStatus: 'DONE' | 'PENDING'
  lastUpdated: string | null
}

interface StatusResponse {
  window: { quarterLabel: string; quarter: string | null; closesAt: string; isOpen: boolean }
  quarter: string
  team: TeamMember[]
}

export default function ManagerTeamCheckInsPage() {
  const [data, setData] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/manager/checkin-status')
        if (res.ok) setData(await res.json())
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const stats = useMemo(() => {
    const team = data?.team || []
    const completed = team.filter((member) => member.checkinStatus === 'DONE').length
    return {
      teamSize: team.length,
      due: Math.max(0, team.length - completed),
      completed,
    }
  }, [data])

  if (loading) return <div className="space-y-4"><div className="skeleton h-8 w-64 rounded" /><div className="skeleton h-32 w-full rounded" /></div>

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-text-secondary">Unable to load team check-ins.</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">Team Check-ins · {data.window?.quarterLabel || data.quarter}</h1>
        <p className="text-text-secondary mt-1">Review your team&apos;s progress and log structured feedback.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="py-4"><div className="text-2xl font-mono text-text-primary">{stats.teamSize}</div><div className="text-xs uppercase text-text-muted">Team Members</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-2xl font-mono text-warning">{stats.due}</div><div className="text-xs uppercase text-text-muted">Check-ins Due</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-2xl font-mono text-success">{stats.completed}</div><div className="text-xs uppercase text-text-muted">Completed</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-base font-medium text-text-primary">{data.window?.quarterLabel || data.quarter}</div><div className="text-xs text-text-muted">{data.window?.isOpen ? `Closes ${new Date(data.window.closesAt).toLocaleDateString()}` : 'Window closed'}</div></CardContent></Card>
      </div>

      <div className="grid gap-4">
        {data.team.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-full bg-accent-subtle flex items-center justify-center text-accent font-medium">
                    {getInitials(member.name)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-text-primary">{member.name}</h3>
                      <Badge variant={member.checkinStatus === 'DONE' ? 'success' : 'warning'}>
                        {member.checkinStatus === 'DONE' ? 'DONE ✓' : 'PENDING'}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      {member.department || 'Employee'} · {member.goalsCount} goals · {member.achievementsLogged}/{member.goalsCount} achievements logged
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {member.lastUpdated ? `Last updated ${new Date(member.lastUpdated).toLocaleString()}` : 'No achievement updates yet'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <div className="font-mono text-xl font-semibold text-text-primary">{member.averageScore}%</div>
                    <div className="text-xs text-text-muted">Avg Score</div>
                  </div>
                  <Button asChild variant={member.checkinStatus === 'DONE' ? 'secondary' : 'default'}>
                    <Link href={`/manager/team-check-ins/${member.id}`}>
                      {member.checkinStatus === 'DONE' ? 'View / Edit' : 'Start Check-in'}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.team.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-text-muted">No team members found.</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
