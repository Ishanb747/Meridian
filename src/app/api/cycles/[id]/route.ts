import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

function getDateUpdate(body: Record<string, unknown>) {
  const fields = ['goalSettingOpen', 'q1Open', 'q2Open', 'q3Open', 'q4Open'] as const
  const update: Record<string, Date> = {}

  for (const field of fields) {
    if (body[field] !== undefined) {
      const date = new Date(String(body[field]))
      if (Number.isNaN(date.getTime())) {
        return { error: `${field} must be a valid date` }
      }
      update[field] = date
    }
  }

  return { update }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { isActive, currentPhase, name, year } = body
    const dateUpdate = getDateUpdate(body)
    if ('error' in dateUpdate) {
      return NextResponse.json({ error: dateUpdate.error }, { status: 400 })
    }

    if (name || year) {
      const existing = await prisma.cycle.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(name ? [{ name: String(name).trim() }] : []),
            ...(year ? [{ year: Number(year) }] : []),
          ],
        },
      })
      if (existing) {
        return NextResponse.json({ error: 'A cycle with this name or year already exists' }, { status: 400 })
      }
    }

    if (isActive === true) {
      // Deactivate all other cycles
      await prisma.cycle.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
    }

    const cycle = await prisma.cycle.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(year !== undefined && { year: Number(year) }),
        ...(isActive !== undefined && { isActive }),
        ...(currentPhase !== undefined && { currentPhase }),
        ...dateUpdate.update,
      },
    })

    return NextResponse.json(cycle)
  } catch (error) {
    console.error('Error updating cycle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const cycle = await prisma.cycle.findUnique({
      where: { id },
      include: { _count: { select: { goals: true } } },
    })

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    if (cycle.isActive) {
      return NextResponse.json({ error: 'Deactivate or activate another cycle before deleting this one' }, { status: 400 })
    }

    if (cycle._count.goals > 0) {
      return NextResponse.json({ error: 'Cycles with goals cannot be deleted' }, { status: 400 })
    }

    await prisma.cycle.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cycle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
