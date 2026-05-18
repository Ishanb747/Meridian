'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { ThemeProvider, useTheme } from '@/components/theme-provider'
import { motion } from 'framer-motion'
import { CommandPalette } from '@/components/command-palette'

interface DashboardShellProps {
  children: React.ReactNode
  user: {
    name: string
    email: string
    role: string
    avatarUrl?: string | null
  }
  activeCycle: {
    name: string
    currentPhase: string
  } | null
}

function DashboardContent({ children, user, activeCycle }: DashboardShellProps) {
  const { theme, toggleTheme } = useTheme()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-bg-base">
      <Sidebar
        user={user}
        activeCycle={activeCycle}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <motion.div 
        animate={{ marginLeft: collapsed ? 64 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex flex-col min-h-screen"
      >
        <Topbar
          breadcrumbs={['Dashboard']}
          user={user}
          onThemeToggle={toggleTheme}
          isDark={theme === 'dark'}
          onSearchClick={() => setCommandPaletteOpen(true)}
        />
        <main className="p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </motion.div>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </div>
  )
}

export function DashboardShell({ children, user, activeCycle }: DashboardShellProps) {
  return (
    <ThemeProvider>
      <DashboardContent user={user} activeCycle={activeCycle}>
        {children}
      </DashboardContent>
    </ThemeProvider>
  )
}