import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create password hashes
  const adminPassword = await bcrypt.hash('Admin@1234', 10)
  const managerPassword = await bcrypt.hash('Manager@1234', 10)
  const employeePassword = await bcrypt.hash('Employee@1234', 10)

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@meridian.in' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@meridian.in',
      passwordHash: adminPassword,
      role: 'ADMIN',
      department: 'Administration',
    },
  })
  console.log('Created admin:', admin.email)

  // Create Manager User
  const manager = await prisma.user.upsert({
    where: { email: 'manager@meridian.in' },
    update: {},
    create: {
      name: 'Manager One',
      email: 'manager@meridian.in',
      passwordHash: managerPassword,
      role: 'MANAGER',
      department: 'Engineering',
    },
  })
  console.log('Created manager:', manager.email)

  // Create Employee Users
  const emp1 = await prisma.user.upsert({
    where: { email: 'emp1@meridian.in' },
    update: {},
    create: {
      name: 'Employee One',
      email: 'emp1@meridian.in',
      passwordHash: employeePassword,
      role: 'EMPLOYEE',
      department: 'Engineering',
      managerId: manager.id,
    },
  })
  console.log('Created employee:', emp1.email)

  const emp2 = await prisma.user.upsert({
    where: { email: 'emp2@meridian.in' },
    update: {},
    create: {
      name: 'Employee Two',
      email: 'emp2@meridian.in',
      passwordHash: employeePassword,
      role: 'EMPLOYEE',
      department: 'Engineering',
      managerId: manager.id,
    },
  })
  console.log('Created employee:', emp2.email)

  const emp3 = await prisma.user.upsert({
    where: { email: 'emp3@meridian.in' },
    update: {},
    create: {
      name: 'Employee Three',
      email: 'emp3@meridian.in',
      passwordHash: employeePassword,
      role: 'EMPLOYEE',
      department: 'Design',
      managerId: manager.id,
    },
  })
  console.log('Created employee:', emp3.email)

  // Create Active Cycle (FY 2026)
  const cycle = await prisma.cycle.upsert({
    where: { id: 'fy-2026' },
    update: {},
    create: {
      id: 'fy-2026',
      name: 'FY 2026',
      year: 2026,
      currentPhase: 'GOAL_SETTING',
      goalSettingOpen: new Date('2026-05-01'),
      q1Open: new Date('2026-07-01'),
      q2Open: new Date('2026-10-01'),
      q3Open: new Date('2027-01-01'),
      q4Open: new Date('2027-03-01'),
      isActive: true,
    },
  })
  console.log('Created cycle:', cycle.name)

  // Create Thrust Areas
  const thrustAreas = [
    { name: 'Customer Excellence', color: '#6366F1' },
    { name: 'Revenue Growth', color: '#22C55E' },
    { name: 'Operational Efficiency', color: '#F59E0B' },
    { name: 'People & Culture', color: '#EC4899' },
    { name: 'Innovation', color: '#8B5CF6' },
    { name: 'Compliance & Risk', color: '#06B6D4' },
  ]

  for (const area of thrustAreas) {
    await prisma.thrustArea.upsert({
      where: { name: area.name },
      update: {},
      create: area,
    })
    console.log('Created thrust area:', area.name)
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })