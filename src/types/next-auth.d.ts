import { DefaultSession } from 'next-auth'
import { Role } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      managerId: string | null
      department: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: Role
    managerId: string | null
    department: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    managerId: string | null
    department: string | null
  }
}
