import { CyclePhase, Cycle } from '@prisma/client'

export interface CycleWindow {
  phase: CyclePhase
  isOpen: boolean
  opensAt: Date
  closesAt: Date
  quarterLabel: string
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null
  daysRemaining: number | null
}

export function getCycleWindow(cycle: Cycle): CycleWindow | null {
  if (!cycle) return null
  
  const now = new Date()
  
  const phases = [
    { phase: 'GOAL_SETTING' as CyclePhase, opens: cycle.goalSettingOpen, label: 'Goal Setting', quarter: null },
    { phase: 'Q1_CHECKIN' as CyclePhase, opens: cycle.q1Open, label: 'Q1', quarter: 'Q1' as const },
    { phase: 'Q2_CHECKIN' as CyclePhase, opens: cycle.q2Open, label: 'Q2', quarter: 'Q2' as const },
    { phase: 'Q3_CHECKIN' as CyclePhase, opens: cycle.q3Open, label: 'Q3', quarter: 'Q3' as const },
    { phase: 'Q4_ANNUAL' as CyclePhase, opens: cycle.q4Open, label: 'Q4', quarter: 'Q4' as const },
  ]
  
  // Find current phase (latest phase whose opens date has passed)
  let currentPhaseIndex = 0
  for (let i = phases.length - 1; i >= 0; i--) {
    if (now >= new Date(phases[i].opens)) {
      currentPhaseIndex = i
      break
    }
  }

  const currentPhaseDef = phases[currentPhaseIndex]
  let closesAt: Date

  if (currentPhaseIndex < phases.length - 1) {
    const nextPhaseOpens = new Date(phases[currentPhaseIndex + 1].opens)
    closesAt = new Date(nextPhaseOpens.getTime() - 24 * 60 * 60 * 1000)
  } else {
    // End of year? Let's just say +30 days for Q4
    closesAt = new Date(currentPhaseDef.opens.getTime() + 30 * 24 * 60 * 60 * 1000)
  }

  const opensAt = new Date(currentPhaseDef.opens)
  const isOpen = now >= opensAt && now <= closesAt
  
  let daysRemaining = null
  if (isOpen) {
    daysRemaining = Math.ceil((closesAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  return {
    phase: currentPhaseDef.phase,
    isOpen,
    opensAt,
    closesAt,
    quarterLabel: currentPhaseDef.label,
    quarter: currentPhaseDef.quarter,
    daysRemaining
  }
}

export function phaseToQuarter(phase: CyclePhase): 'Q1' | 'Q2' | 'Q3' | 'Q4' | null {
  if (phase === 'Q1_CHECKIN') return 'Q1'
  if (phase === 'Q2_CHECKIN') return 'Q2'
  if (phase === 'Q3_CHECKIN') return 'Q3'
  if (phase === 'Q4_ANNUAL') return 'Q4'
  return null
}
