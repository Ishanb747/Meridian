import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const validRoles: Role[] = ['EMPLOYEE', 'MANAGER', 'ADMIN']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole('ADMIN')
    if ('error' in auth) return auth.error

    const { id } = await params
    const body = await req.json()
    const { name, role, department, managerId, password } = body

    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (role) {
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updateData.role = role
    }
    if (department !== undefined) updateData.department = department
    if (managerId !== undefined) {
      if (managerId) {
        if (managerId === id) {
          return NextResponse.json({ error: 'User cannot report to themselves' }, { status: 400 })
        }
        const manager = await prisma.user.findFirst({
          where: { id: managerId, role: { in: ['MANAGER', 'ADMIN'] }, deletedAt: null },
        })
        if (!manager) {
          return NextResponse.json({ error: 'Manager not found' }, { status: 400 })
        }
      }
      updateData.managerId = managerId || null
    }
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole('ADMIN')
    if ('error' in auth) return auth.error

    const { id } = await params

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        managerId: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
