import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { requireRole } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const validRoles: Role[] = ['EMPLOYEE', 'MANAGER', 'ADMIN']

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireRole('ADMIN')
    if ('error' in auth) return auth.error

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        manager: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole('ADMIN')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { name, email, password, role, department, managerId } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser && !existingUser.deletedAt) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    if (managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerId, role: { in: ['MANAGER', 'ADMIN'] }, deletedAt: null },
      })
      if (!manager) {
        return NextResponse.json({ error: 'Manager not found' }, { status: 400 })
      }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            passwordHash,
            role,
            department,
            managerId: managerId || null,
            deletedAt: null,
          },
        })
      : await prisma.user.create({
          data: {
            name,
            email,
            passwordHash,
            role,
            department,
            managerId: managerId || null,
          },
        })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
