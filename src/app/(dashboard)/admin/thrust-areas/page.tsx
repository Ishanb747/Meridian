'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'

interface ThrustArea {
  id: string
  name: string
  color: string
}

const presetColors = [
  '#6366F1', '#22C55E', '#F59E0B', '#EC4899', '#8B5CF6',
  '#06B6D4', '#EF4444', '#10B981', '#F97316', '#3B82F6',
]

export default function ThrustAreasPage() {
  const [thrustAreas, setThrustAreas] = useState<ThrustArea[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(presetColors[0])
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    fetchThrustAreas()
  }, [])

  const fetchThrustAreas = async () => {
    try {
      const res = await fetch('/api/thrust-areas')
      if (res.ok) {
        const data = await res.json()
        setThrustAreas(data)
      }
    } catch (error) {
      console.error('Error fetching thrust areas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newName.trim()) return

    try {
      const res = await fetch('/api/thrust-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, color: newColor }),
      })

      if (res.ok) {
        const newArea = await res.json()
        setThrustAreas([...thrustAreas, newArea])
        setNewName('')
        setIsAdding(false)
      }
    } catch (error) {
      console.error('Error creating thrust area:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/thrust-areas/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setThrustAreas(thrustAreas.filter((t) => t.id !== id))
      }
    } catch (error) {
      console.error('Error deleting thrust area:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">Thrust Areas</h1>
        <p className="text-text-secondary mt-1">Manage organizational thrust areas for goals</p>
      </div>

      {/* Thrust Areas Grid */}
      <div className="flex flex-wrap gap-3">
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="skeleton h-4 w-24 mx-auto rounded" />
            </CardContent>
          </Card>
        ) : thrustAreas.length === 0 ? (
          <p className="text-text-muted">No thrust areas created yet</p>
        ) : (
          thrustAreas.map((area) => (
            <div
              key={area.id}
              className="flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-bg-surface"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: area.color }}
              />
              <span className="text-sm text-text-primary">{area.name}</span>
              <button
                onClick={() => handleDelete(area.id)}
                className="text-text-muted hover:text-danger transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}

        {/* Add new button/form */}
        {isAdding ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Name"
              className="w-32 h-8"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="flex gap-1">
              {presetColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    newColor === color ? 'scale-110 ring-2 ring-white' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <Button size="sm" onClick={handleAdd}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setIsAdding(true)}>
            <Plus size={14} />
            Add Thrust Area
          </Button>
        )}
      </div>
    </div>
  )
}