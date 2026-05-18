import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import { Quarter } from '@prisma/client'

export async function GET(_req: NextRequest) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exemptions = await prisma.exemptionRecord.findMany({
      include: {
        employee: true,
        grantedBy: true
      },
      orderBy: { grantedAt: 'desc' }
    })

    return NextResponse.json(exemptions)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { employeeIds, cycleId, quarter, reason } = body

    if (!employeeIds || !employeeIds.length || !cycleId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await prisma.exemptionRecord.createMany({
      data: employeeIds.map((id: string) => ({
        employeeId: id,
        cycleId,
        quarter: quarter ? quarter as Quarter : null,
        reason,
        grantedById: user.id
      }))
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing exemption ID' }, { status: 400 })
    }

    await prisma.exemptionRecord.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
