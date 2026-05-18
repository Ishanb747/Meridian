import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Quarter } from '@prisma/client'
import { computeScore, ScoreInput } from '@/lib/scoring'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { parentGoalId, quarter, actualValue, actualDate, notes, status } = body

    if (!parentGoalId || !quarter) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const linkedGoals = await prisma.goal.findMany({
      where: { sharedFromGoalId: parentGoalId }
    })

    await Promise.all(linkedGoals.map(async (goal) => {
      const scoreInput: ScoreInput = {
        uomType: goal.uomType,
        targetValue: goal.targetValue,
        targetDate: goal.targetDate,
        actualValue,
        actualDate: actualDate ? new Date(actualDate) : undefined,
        goalCreatedAt: goal.createdAt
      }
      const computedScore = computeScore(scoreInput)

      await prisma.achievement.upsert({
        where: { goalId_quarter: { goalId: goal.id, quarter: quarter as Quarter } },
        update: { 
          actualValue, 
          actualDate: actualDate ? new Date(actualDate) : null,
          computedScore,
          notes,
          status,
          loggedAt: new Date() 
        },
        create: {
          goalId: goal.id,
          cycleId: goal.cycleId,
          quarter: quarter as Quarter,
          actualValue,
          actualDate: actualDate ? new Date(actualDate) : null,
          notes,
          computedScore,
          loggedBy: 'SYSTEM_SYNC',
          status: status || 'ON_TRACK',
        }
      })
    }))

    return NextResponse.json({ success: true, synced: linkedGoals.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
