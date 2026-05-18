import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const activeCycle = await prisma.cycle.findFirst({ where: { isActive: true } })
    console.log('Active Cycle:', activeCycle)

    if (activeCycle) {
      const employees = await prisma.user.findMany({
        where: { role: 'EMPLOYEE' },
        include: {
          goals: {
            where: { cycleId: activeCycle.id },
            include: { achievements: true }
          },
          employeeCheckins: {
            where: { cycleId: activeCycle.id }
          },
          exemptions: {
            where: { cycleId: activeCycle.id }
          }
        },
        orderBy: { name: 'asc' }
      })
      console.log('Employees found:', employees.length)
    }
  } catch (e) {
    console.error('Error:', e)
  }
}

main().finally(() => prisma.$disconnect())
