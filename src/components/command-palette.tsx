'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Search, Target, CheckSquare, Users, Settings } from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  icon: React.ReactNode
  action: () => void
  category: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const commands: CommandItem[] = [
    { id: 'goals', label: 'Submit Goals', icon: <Target size={16} />, action: () => router.push('/employee/goals'), category: 'Actions' },
    { id: 'checkin', label: 'View My Check-in', icon: <CheckSquare size={16} />, action: () => router.push('/employee/check-ins'), category: 'Actions' },
    { id: 'team-goals', label: 'Team Goals', icon: <Users size={16} />, action: () => router.push('/manager/team-goals'), category: 'Navigation' },
    { id: 'team-checkins', label: 'Team Check-ins', icon: <CheckSquare size={16} />, action: () => router.push('/manager/team-check-ins'), category: 'Navigation' },
    { id: 'settings', label: 'Settings', icon: <Settings size={16} />, action: () => router.push('/settings'), category: 'Navigation' },
  ]

  const filteredCommands = query
    ? commands.filter((cmd) => cmd.label.toLowerCase().includes(query.toLowerCase()))
    : commands

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault()
      filteredCommands[selectedIndex].action()
      onOpenChange(false)
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }, [open, filteredCommands, selectedIndex, onOpenChange])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 bg-bg-surface border-border">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="sr-only">Command Palette</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Search commands..."
              className="pl-10 bg-bg-elevated border-border"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-text-muted text-sm">
              No results found
            </div>
          ) : (
            <div className="px-2 pb-2">
              {['Actions', 'Navigation'].map((category) => {
                const categoryItems = filteredCommands.filter((c) => c.category === category)
                if (categoryItems.length === 0) return null
                return (
                  <div key={category} className="mb-2">
                    <div className="px-2 py-1 text-xs text-text-muted uppercase tracking-wider">
                      {category}
                    </div>
                    {categoryItems.map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd)
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => {
                            cmd.action()
                            onOpenChange(false)
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                            globalIndex === selectedIndex
                              ? 'bg-accent-subtle text-accent'
                              : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                          }`}
                        >
                          {cmd.icon}
                          {cmd.label}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="p-3 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
          <span>Use ↑↓ to navigate, Enter to select</span>
          <span>ESC to close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}