import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Redirect to role-specific dashboard
  switch (session.user.role) {
    case 'ADMIN':
      redirect('/admin/dashboard')
    case 'MANAGER':
      redirect('/manager/dashboard')
    default:
      redirect('/employee/dashboard')
  }
}