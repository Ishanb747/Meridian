'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Quarter } from '@prisma/client'

export default function AdminCompletionDashboard() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/admin/completion')
        if (res.ok) setEmployees(await res.json())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>

  function getStatusSymbol(emp: any, quarter: Quarter | 'GOAL_SETTING') {
    if (quarter === 'GOAL_SETTING') {
      return emp.goals && emp.goals.length > 0 ? '✓' : '—'
    }

    const hasCheckinSession = emp.employeeCheckins?.some((c: any) => c.quarter === quarter)
    const hasAchievements = emp.goals?.every((g: any) => 
      g.achievements?.some((a: any) => a.quarter === quarter)
    )

    if (hasCheckinSession) return '✓'  // Green
    if (hasAchievements) return '◑'    // Yellow (achievements saved, no checkin comment)
    return '—' // Needs proper window logic for ● (in progress) and ✕ (missed)
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Completion Dashboard</h1>
        <p className="text-muted-foreground mt-2">Real-time status of goal setting and check-ins</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-900">Employee</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-center">Goal Setting</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-center">Q1</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-center">Q2</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-center">Q3</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-center">Q4</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{emp.name}</td>
                    <td className="px-6 py-4 text-center">{getStatusSymbol(emp, 'GOAL_SETTING')}</td>
                    <td className="px-6 py-4 text-center">{getStatusSymbol(emp, 'Q1')}</td>
                    <td className="px-6 py-4 text-center">{getStatusSymbol(emp, 'Q2')}</td>
                    <td className="px-6 py-4 text-center">{getStatusSymbol(emp, 'Q3')}</td>
                    <td className="px-6 py-4 text-center">{getStatusSymbol(emp, 'Q4')}</td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-6 text-sm text-muted-foreground mt-4">
        <div><span className="font-bold text-green-600">✓</span> Complete (Manager check-in done)</div>
        <div><span className="font-bold text-amber-500">◑</span> Partial (Achievements saved, no comment)</div>
        <div><span className="font-bold text-gray-400">—</span> Upcoming / Not started</div>
      </div>
    </div>
  )
}
