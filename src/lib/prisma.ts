import { PrismaClient } from '@prisma/client'
import { requestContext } from './context'

function toAuditJson(value: unknown) {
  if (value instanceof Date) return value.toISOString()
  return value === undefined ? null : value
}

const prismaClientSingleton = () => {
  const client = new PrismaClient()

  client.$use(async (params, next) => {
    if (params.model === 'Goal' && params.action === 'update') {
      const before = await client.goal.findUnique({
        where: params.args.where
      })

      const result = await next(params)

      const after = await client.goal.findUnique({
        where: params.args.where
      })

      const isPostLock = !!before?.lockedAt

      if (before && after && params.args.data) {
        const store = requestContext.getStore()
        const userId = store?.userId

        if (!userId) return result
        
        const changedFields = Object.keys(params.args.data)
        
        await Promise.all(
          changedFields.map(field => {
            const beforeValue = toAuditJson(before[field as keyof typeof before])
            const afterValue = toAuditJson(after[field as keyof typeof after])

            if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
              return client.auditLog.create({
                data: {
                  userId,
                  entityType: 'Goal',
                  entityId: after.id,
                  action: isPostLock ? 'EDIT_POST_LOCK' : 'EDIT',
                  oldValue: { [field]: beforeValue },
                  newValue: { [field]: afterValue },
                  isPostLock,
                }
              })
            }
          })
        )
      }

      return result
    }

    return next(params)
  })

  return client
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
export { prisma }
