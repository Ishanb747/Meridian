import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { computeScore, ScoreInput } from '@/lib/scoring'
import { getCycleWindow } from '@/lib/window-logic'
import { GoalProgressStatus, Quarter } from '@prisma/client'

const quarters: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4']

function statusFromScore(score: number | null, requested?: GoalProgressStatus): GoalProgressStatus {
  if (requested) return requested
  if (score === null) return 'NOT_STARTED'
  if (score >= 1) return 'COMPLETED'
  return 'ON_TRACK'
}

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireRole()
    if ('error' in auth) return auth.error

    // Find active cycle
    const cycle = await prisma.cycle.findFirst({
      where: { isActive: true }
    })
    
    if (!cycle) return NextResponse.json({ error: 'No active cycle' }, { status: 404 })

    const goals = await prisma.goal.findMany({
      where: {
        cycleId: cycle.id,
        employeeId: auth.user.id,
        status: { in: ['APPROVED', 'LOCKED'] },
      },
      include: {
        thrustArea: true,
        achievements: true,
        sharedFromGoal: {
          include: {
            employee: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ cycle, window: getCycleWindow(cycle), goals })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole()
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { goalId, quarter, actualValue, actualDate, notes, status } = body

    if (!goalId || !quarter || !quarters.includes(quarter)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const activeCycle = await prisma.cycle.findFirst({ where: { isActive: true } })
    if (!activeCycle) return NextResponse.json({ error: 'No active cycle' }, { status: 404 })

    const window = getCycleWindow(activeCycle)
    if (!window?.isOpen || window.quarter !== quarter) {
      return NextResponse.json({ error: 'Achievement updates are only available during the active check-in window' }, { status: 400 })
    }

    const goal = await prisma.goal.findUnique({ where: { id: goalId } })
    if (!goal || goal.employeeId !== auth.user.id || goal.cycleId !== activeCycle.id) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    if (!['APPROVED', 'LOCKED'].includes(goal.status)) {
      return NextResponse.json({ error: 'Only approved goals can receive achievement updates' }, { status: 400 })
    }

    if (goal.isSharedGoal && goal.sharedFromGoalId) {
      return NextResponse.json({ error: 'This shared goal is synced from its primary owner' }, { status: 400 })
    }

    // Compute score
    const scoreInput: ScoreInput = {
      uomType: goal.uomType,
      targetValue: goal.targetValue,
      targetDate: goal.targetDate,
      actualValue: actualValue === undefined || actualValue === null || actualValue === '' ? null : Number(actualValue),
      actualDate: actualDate ? new Date(actualDate) : undefined,
      goalCreatedAt: goal.createdAt
    }
    const computedScore = computeScore(scoreInput)
    const progressStatus = statusFromScore(computedScore, status)

    const achievement = await prisma.achievement.upsert({
      where: {
        goalId_quarter: {
          goalId,
          quarter: quarter as Quarter
        }
      },
      update: {
        actualValue: scoreInput.actualValue,
        actualDate: actualDate ? new Date(actualDate) : null,
        notes,
        computedScore,
        status: progressStatus,
        loggedBy: auth.user.id,
        loggedAt: new Date(),
      },
      create: {
        goalId,
        cycleId: goal.cycleId,
        quarter: quarter as Quarter,
        actualValue: scoreInput.actualValue,
        actualDate: actualDate ? new Date(actualDate) : null,
        notes,
        computedScore,
        loggedBy: auth.user.id,
        status: progressStatus,
      }
    })

    // Sync shared goal achievement if this is the primary owner
    if (goal.isSharedGoal && !goal.sharedFromGoalId) {
      await fetch(new URL('/api/internal/sync-shared-achievement', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentGoalId: goal.id, quarter, actualValue: scoreInput.actualValue, actualDate, notes, status: progressStatus })
      }).catch(err => console.error('Failed to trigger sync:', err))
    }

    return NextResponse.json(achievement)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
