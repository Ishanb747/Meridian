import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  try {
    const thrustAreas = await prisma.thrustArea.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(thrustAreas)
  } catch (error) {
    console.error('Error fetching thrust areas:', error)
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
    const { name, color } = body

    if (!name || !color) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const thrustArea = await prisma.thrustArea.create({
      data: { name, color },
    })

    return NextResponse.json(thrustArea)
  } catch (error) {
    console.error('Error creating thrust area:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}