import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCycleWindow } from '@/lib/window-logic'

export async function GET(_req: NextRequest) {
  try {
    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true }
    })
    
    if (!activeCycle) {
      return NextResponse.json({ error: 'No active cycle' }, { status: 404 })
    }

    const window = getCycleWindow(activeCycle)
    if (!window) {
      return NextResponse.json({ error: 'Window logic failed' }, { status: 500 })
    }

    return NextResponse.json(window)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
