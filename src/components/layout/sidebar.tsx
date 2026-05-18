'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  Users,
  ClipboardList,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Shield,
  FileText,
  AlertCircle,
  Bell,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  user: {
    name: string
    email: string
    role: string
    avatarUrl?: string | null
  } | null
  activeCycle?: {
    name: string
    currentPhase: string
  } | null
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const navItems = {
  common: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ],
  employee: [
    { href: '/employee/goals', label: 'My Goals', icon: Target },
    { href: '/employee/check-ins', label: 'My Check-ins', icon: CheckSquare },
  ],
  manager: [
    { href: '/manager/team-goals', label: 'Team Goals', icon: Users },
    { href: '/manager/team-check-ins', label: 'Team Check-ins', icon: ClipboardList },
  ],
  reports: [
    { href: '/reports/achievement', label: 'Achievement Report', icon: FileText },
    { href: '/reports/completion', label: 'Completion Report', icon: BarChart3 },
    { href: '/analytics', label: 'Analytics', icon: TrendingUp },
  ],
  admin: [
    { href: '/admin/users', label: 'Users & Org', icon: Users },
    { href: '/admin/cycles', label: 'Cycles', icon: FolderKanban },
    { href: '/admin/thrust-areas', label: 'Thrust Areas', icon: Target },
    { href: '/admin/audit', label: 'Audit Trail', icon: Shield },
    { href: '/admin/exceptions', label: 'Exceptions', icon: ShieldAlert },
    { href: '/admin/escalations', label: 'Escalations', icon: AlertCircle },
    { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  ],
}

const roleLabels = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  ADMIN: 'Admin',
}

const phaseLabels: Record<string, string> = {
  GOAL_SETTING: 'Goal Setting',
  Q1_CHECKIN: 'Q1 Check-in',
  Q2_CHECKIN: 'Q2 Check-in',
  Q3_CHECKIN: 'Q3 Check-in',
  Q4_ANNUAL: 'Q4 Annual',
  CLOSED: 'Closed',
}

export function Sidebar({ user, activeCycle, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()

  const role = user?.role || 'EMPLOYEE'

  // Build nav sections with dividers
  const sections: { label?: string; items: typeof navItems.common }[] = [
    { items: navItems.common },
  ]

  if (role === 'EMPLOYEE') {
    sections.push({ items: navItems.employee })
  }

  if (role === 'MANAGER' || role === 'ADMIN') {
    sections.push({ items: navItems.manager })
    sections.push({ label: 'Reports', items: navItems.reports })
  }

  if (role === 'ADMIN') {
    sections.push({ label: 'Admin', items: navItems.admin })
  }

  const sidebarWidth = collapsed ? 64 : 240

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-screen bg-bg-surface border-r border-border-subtle flex flex-col z-50"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border-subtle">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-[#818CF8] flex items-center justify-center font-display font-bold text-white text-sm">
            M
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-display font-bold text-lg text-text-primary whitespace-nowrap"
              >
                Meridian
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Active Cycle Badge */}
      {activeCycle && !collapsed && (
        <div className="px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-text-secondary">{activeCycle.name}</span>
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            {phaseLabels[activeCycle.currentPhase] || activeCycle.currentPhase}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {sections.map((section, sIdx) => (
          <div key={sIdx}>
            {/* Section divider/label */}
            {section.label && !collapsed && (
              <div className="px-3 pt-4 pb-1.5">
                <span className="text-[10px] uppercase tracking-[0.1em] text-text-muted font-semibold">
                  {section.label}
                </span>
              </div>
            )}
            {section.label && collapsed && <div className="border-b border-border-subtle mx-2 my-2" />}

            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-fast',
                    isActive
                      ? 'bg-accent-subtle text-accent border-l-2 border-accent'
                      : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                  )}
                >
                  <Icon size={18} className="shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User section */}
      {user && (
        <div className="p-3 border-t border-border-subtle">
          <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : '')}>
            <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-sm font-medium shrink-0">
              {getInitials(user.name)}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <div className="text-sm font-medium text-text-primary truncate">
                    {user.name}
                  </div>
                  <Badge variant="accent" className="text-[10px] mt-0.5">
                    {roleLabels[user.role as keyof typeof roleLabels] || user.role}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.aside>
  )
}