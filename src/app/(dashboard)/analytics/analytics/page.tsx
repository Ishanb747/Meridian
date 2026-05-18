'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import { cn } from '@/lib/utils'

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/reports/analytics')
        if (res.ok) setData(await res.json())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) return <div className="p-8">Loading Analytics...</div>
  if (!data) return <div className="p-8 text-red-500">Failed to load analytics data.</div>

  const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4']

  const getHeatmapColor = (score: number | null) => {
    if (score === null) return 'bg-[#1A1A24] border border-gray-800'
    if (score === 0) return 'bg-red-500/30'
    if (score <= 25) return 'bg-red-400/40'
    if (score <= 50) return 'bg-amber-500/40'
    if (score <= 75) return 'bg-sky-400/40'
    if (score < 100) return 'bg-indigo-500/40'
    return 'bg-green-500/50'
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Trends</h1>
        <p className="text-muted-foreground mt-2">Executive Overview · FY 2026</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A. QoQ Trend Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Quarter-over-Quarter Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.qoqTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [`${value}%`, 'Average']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                  <ReferenceLine y={100} stroke="#9ca3af" strokeDasharray="3 3" label={{ position: 'top', value: 'Target', fill: '#9ca3af', fontSize: 12 }} />
                  <Line 
                    type="monotone" 
                    dataKey="orgAvg" 
                    name="Organization Average" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} 
                    animationDuration={800}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="deptAvg" 
                    name="Department Average" 
                    stroke="#0ea5e9" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }} 
                    animationDuration={800}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* C1. Goals by Thrust Area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Goals by Thrust Area</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full flex items-center justify-center">
              {data.thrustAreaData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.thrustAreaData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.thrustAreaData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">No goal data available.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* C3. Goals by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Goals by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {data.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.statusData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground text-sm">No status data available.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* B. Completion Heatmap */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Performance Heatmap (Quarterly)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[600px]">
                {/* Header Row */}
                <div className="flex mb-2 pl-[150px]">
                  {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                    <div key={q} className="w-12 mx-1 text-center text-xs font-medium text-muted-foreground">
                      {q}
                    </div>
                  ))}
                </div>
                
                {/* Grid Rows */}
                <div className="space-y-1">
                  {data.heatmapData.length > 0 ? data.heatmapData.map((emp: any) => (
                    <div key={emp.id} className="flex items-center group">
                      <div className="w-[140px] pr-4 text-right">
                        <div className="text-sm font-medium truncate" title={emp.name}>{emp.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate" title={emp.department}>{emp.department}</div>
                      </div>
                      <div className="flex">
                        {[emp.q1, emp.q2, emp.q3, emp.q4].map((score, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "w-12 h-8 mx-1 rounded-sm flex items-center justify-center transition-transform group-hover:scale-[1.02]",
                              getHeatmapColor(score)
                            )}
                            title={score !== null ? `${score}% completed` : 'No data'}
                          >
                            {score !== null && <span className="text-[10px] font-mono text-white/80 mix-blend-difference">{score}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      No employee data found.
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Heatmap Legend */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t text-xs text-muted-foreground">
              <span>Legend:</span>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-[#1A1A24] border border-gray-800" /> N/A</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-red-400/40" /> 1-25%</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-amber-500/40" /> 26-50%</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-sky-400/40" /> 51-75%</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-indigo-500/40" /> 76-99%</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-sm bg-green-500/50" /> 100%</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
