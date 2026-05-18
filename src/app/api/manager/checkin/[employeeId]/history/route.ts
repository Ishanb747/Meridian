import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const auth = await requireRole('MANAGER')
    if ('error' in auth) return auth.error

    const { employeeId } = await params

    // Verify employee belongs to manager
    const employee = await prisma.user.findUnique({ where: { id: employeeId } })
    if (!employee || employee.managerId !== auth.user.id) {
      return NextResponse.json({ error: 'Employee not found or not in your team' }, { status: 403 })
    }

    const history = await prisma.checkinSession.findMany({
      where: { employeeId },
      orderBy: [
        { cycleId: 'desc' },
        { quarter: 'desc' }
      ]
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
