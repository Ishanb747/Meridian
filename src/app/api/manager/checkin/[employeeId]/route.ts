import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { getCycleWindow } from '@/lib/window-logic'
import { Quarter } from '@prisma/client'

export async function GET(
  req: NextRequest,
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

    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true }
    })
    
    if (!activeCycle) {
      return NextResponse.json({ error: 'No active cycle' }, { status: 404 })
    }

    const window = getCycleWindow(activeCycle)
    const quarter = window?.quarter || 'Q1'

    const goals = await prisma.goal.findMany({
      where: { employeeId, cycleId: activeCycle.id, status: { in: ['APPROVED', 'LOCKED'] } },
      include: {
        achievements: true,
        thrustArea: true
      },
      orderBy: { createdAt: 'asc' },
    })

    const checkin = await prisma.checkinSession.findUnique({
      where: {
        managerId_employeeId_cycleId_quarter: {
          managerId: auth.user.id,
          employeeId,
          cycleId: activeCycle.id,
          quarter,
        },
      },
    })

    return NextResponse.json({ employee, cycle: activeCycle, window, quarter, goals, checkin })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const auth = await requireRole('MANAGER')
    if ('error' in auth) return auth.error

    const { employeeId } = await params
    const body = await req.json()
    const { quarter, comment } = body

    if (!quarter || !comment || comment.trim().length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const employee = await prisma.user.findUnique({ where: { id: employeeId } })
    if (!employee || employee.managerId !== auth.user.id) {
      return NextResponse.json({ error: 'Employee not found or not in your team' }, { status: 403 })
    }

    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true }
    })
    
    if (!activeCycle) {
      return NextResponse.json({ error: 'No active cycle' }, { status: 404 })
    }

    const window = getCycleWindow(activeCycle)
    if (!window?.isOpen || window.quarter !== quarter) {
      return NextResponse.json({ error: 'Manager check-ins are only available during the active check-in window' }, { status: 400 })
    }

    const checkin = await prisma.checkinSession.upsert({
      where: {
        managerId_employeeId_cycleId_quarter: {
          managerId: auth.user.id,
          employeeId,
          cycleId: activeCycle.id,
          quarter: quarter as Quarter
        }
      },
      update: {
        comment,
        completedAt: new Date()
      },
      create: {
        managerId: auth.user.id,
        employeeId,
        cycleId: activeCycle.id,
        quarter: quarter as Quarter,
        comment
      }
    })

    return NextResponse.json(checkin)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
