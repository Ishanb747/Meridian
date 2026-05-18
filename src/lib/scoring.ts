import { UomType } from '@prisma/client'

export interface ScoreInput {
  uomType: UomType
  targetValue?: number | null
  targetDate?: Date | null
  actualValue?: number | null
  actualDate?: Date | null
  goalCreatedAt?: Date // used as timeline start
}

export function computeScore(input: ScoreInput): number | null {
  const { uomType, targetValue, targetDate, actualValue, actualDate } = input

  switch (uomType) {
    case 'MIN_NUMERIC':
    case 'MIN_PERCENT':
      // Higher actual = better; Achievement ÷ Target
      if (targetValue === undefined || targetValue === null || targetValue === 0) return null
      if (actualValue === undefined || actualValue === null) return null
      return Math.min(actualValue / targetValue, 2) // cap at 200% to prevent outliers
      
    case 'MAX_NUMERIC':
    case 'MAX_PERCENT':
      // Lower actual = better; Target ÷ Achievement
      if (targetValue === undefined || targetValue === null) return null
      if (actualValue === undefined || actualValue === null || actualValue === 0) return null
      return Math.min(targetValue / actualValue, 2)
      
    case 'TIMELINE':
      // On or before deadline = 100%
      // Past deadline = partial score based on overshoot
      if (!targetDate || !actualDate) return null
      if (actualDate <= targetDate) return 1.0
      // Penalty: score decreases by 10% per week past deadline
      const daysLate = (actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)
      return Math.max(0, 1 - (daysLate / 7) * 0.1)
      
    case 'ZERO':
      if (actualValue === undefined || actualValue === null) return null
      return actualValue === 0 ? 1.0 : 0.0
      
    default:
      return null
  }
}

// Display helper: score → percentage string with color
export function formatScore(score: number | null): { label: string; color: string } {
  if (score === null) return { label: '—', color: 'text-muted-foreground' }
  const pct = Math.round(score * 100)
  if (pct >= 100) return { label: `${pct}%`, color: 'text-green-600' }
  if (pct >= 75)  return { label: `${pct}%`, color: 'text-blue-600' }
  if (pct >= 50)  return { label: `${pct}%`, color: 'text-amber-600' }
  return { label: `${pct}%`, color: 'text-red-600' }
}

export function scoreExplanation(input: ScoreInput): string {
  const { uomType, targetValue, targetDate, actualValue, actualDate } = input

  if (uomType === 'MIN_NUMERIC' || uomType === 'MIN_PERCENT') {
    if (targetValue === undefined || targetValue === null || actualValue === undefined || actualValue === null) return 'Enter an actual value to preview the score.'
    return `Achievement / target = ${actualValue} / ${targetValue}.`
  }

  if (uomType === 'MAX_NUMERIC' || uomType === 'MAX_PERCENT') {
    if (targetValue === undefined || targetValue === null || actualValue === undefined || actualValue === null) return 'Enter an actual value to preview the score.'
    return `Target / achievement = ${targetValue} / ${actualValue}.`
  }

  if (uomType === 'TIMELINE') {
    if (!targetDate || !actualDate) return 'Enter the completion date to preview the timeline score.'
    const days = Math.round((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return `Completed ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} early or on time.`
    return `${days} day${days === 1 ? '' : 's'} late; score drops by 10% per week.`
  }

  if (uomType === 'ZERO') {
    if (actualValue === undefined || actualValue === null) return 'Enter the incident/count value.'
    return actualValue === 0 ? 'Zero recorded; goal achieved.' : `${actualValue} recorded; zero was required.`
  }

  return ''
}
