import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

function parseCycleDates(body: {
  goalSettingOpen: string
  q1Open: string
  q2Open: string
  q3Open: string
  q4Open: string
}) {
  const dates = [
    new Date(body.goalSettingOpen),
    new Date(body.q1Open),
    new Date(body.q2Open),
    new Date(body.q3Open),
    new Date(body.q4Open),
  ]

  if (dates.some((date) => Number.isNaN(date.getTime()))) {
    return { error: 'All phase dates must be valid dates' }
  }

  for (let index = 1; index < dates.length; index += 1) {
    if (dates[index] <= dates[index - 1]) {
      return { error: 'Phase dates must be in chronological order' }
    }
  }

  return {
    dates: {
      goalSettingOpen: dates[0],
      q1Open: dates[1],
      q2Open: dates[2],
      q3Open: dates[3],
      q4Open: dates[4],
    },
  }
}

export async function GET(_req: NextRequest) {
  try {
    const cycles = await prisma.cycle.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(cycles)
  } catch (error) {
    console.error('Error fetching cycles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, year, goalSettingOpen, q1Open, q2Open, q3Open, q4Open } = body

    if (!name || !year || !goalSettingOpen || !q1Open || !q2Open || !q3Open || !q4Open) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const parsed = parseCycleDates({ goalSettingOpen, q1Open, q2Open, q3Open, q4Open })
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const existing = await prisma.cycle.findFirst({
      where: {
        OR: [{ name: name.trim() }, { year: Number(year) }],
      },
    })
    if (existing) {
      return NextResponse.json({ error: 'A cycle with this name or year already exists' }, { status: 400 })
    }

    const cycle = await prisma.cycle.create({
      data: {
        name: name.trim(),
        year: Number(year),
        ...parsed.dates,
      },
    })

    return NextResponse.json(cycle)
  } catch (error) {
    console.error('Error creating cycle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
