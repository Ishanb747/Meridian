'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Search, Bell, Sun, Moon, ChevronRight, LogOut, User, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface TopbarProps {
  breadcrumbs?: string[]
  user: {
    name: string
    email: string
    role: string
    avatarUrl?: string | null
  } | null
  onThemeToggle?: () => void
  isDark?: boolean
  onSearchClick?: () => void
}

export function Topbar({ breadcrumbs = [], user, onThemeToggle, isDark = true, onSearchClick }: TopbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/login' })
    } catch (error) {
      console.error('Sign out failed:', error)
      router.push('/login')
    }
  }

  return (
    <header className="h-14 border-b border-border-subtle bg-bg-surface flex items-center justify-between px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.length > 0 ? (
          <>
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <ChevronRight size={14} className="text-text-muted" />}
                <span className={index === breadcrumbs.length - 1 ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                  {crumb}
                </span>
              </span>
            ))}
          </>
        ) : (
          <span className="text-text-secondary">Dashboard</span>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Search - cmd+k placeholder */}
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-bg-elevated text-text-muted text-sm hover:border-border-strong hover:text-text-secondary transition-colors"
        >
          <Search size={14} />
          <span>Search</span>
          <kbd className="ml-2 px-1.5 py-0.5 rounded bg-bg-overlay text-[10px]">⌘K</kbd>
        </button>

        {/* Notifications */}
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={18} className="text-text-secondary" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
          </Button>
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 top-full mt-2 w-80 bg-bg-elevated border border-border rounded-lg shadow-lg overflow-hidden"
              >
                <div className="p-3 border-b border-border-subtle">
                  <h3 className="font-medium text-text-primary">Notifications</h3>
                </div>
                <div className="p-4 text-center text-text-muted text-sm">
                  No new notifications
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={onThemeToggle}>
          {isDark ? <Sun size={18} className="text-text-secondary" /> : <Moon size={18} className="text-text-secondary" />}
        </Button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-bg-elevated transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-xs font-medium">
              {user ? getInitials(user.name) : '?'}
            </div>
          </button>
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 top-full mt-2 w-56 bg-bg-elevated border border-border rounded-lg shadow-lg overflow-hidden"
              >
                <div className="p-3 border-b border-border-subtle">
                  <div className="text-sm font-medium text-text-primary">{user?.name}</div>
                  <div className="text-xs text-text-muted">{user?.email}</div>
                </div>
                <div className="p-1">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay rounded-md transition-colors">
                    <User size={14} />
                    Profile
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay rounded-md transition-colors">
                    <Settings size={14} />
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-subtle rounded-md transition-colors"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
