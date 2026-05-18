import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const activeCycle = await prisma.cycle.findFirst({
    where: { isActive: true },
    select: { name: true, currentPhase: true },
  })

  return (
    <DashboardShell
      user={{
        name: session.user.name || '',
        email: session.user.email || '',
        role: session.user.role,
        avatarUrl: session.user.image,
      }}
      activeCycle={activeCycle}
    >
      {children}
    </DashboardShell>
  )
}