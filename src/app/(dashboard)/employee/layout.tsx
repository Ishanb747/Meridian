import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only employees can access employee routes
  if (session.user.role !== 'EMPLOYEE' && session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    // For now, allow all authenticated users to see employee pages
  }

  return <>{children}</>
}