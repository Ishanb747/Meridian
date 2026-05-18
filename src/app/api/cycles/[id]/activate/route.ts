import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Deactivate all cycles first
    await prisma.cycle.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    // Activate the selected cycle
    const cycle = await prisma.cycle.update({
      where: { id },
      data: { isActive: true },
    })

    return NextResponse.json(cycle)
  } catch (error) {
    console.error('Error activating cycle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}