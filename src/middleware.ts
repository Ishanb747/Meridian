import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

const roleHome: Record<string, string> = {
  EMPLOYEE: '/employee/dashboard',
  MANAGER: '/manager/dashboard',
  ADMIN: '/admin/dashboard',
}

const roleRank: Record<string, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  ADMIN: 3,
}

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string | undefined
    const pathname = req.nextUrl.pathname

    if (!role) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const requiredRole = pathname.startsWith('/admin')
      ? 'ADMIN'
      : pathname.startsWith('/manager') || pathname.startsWith('/reports')
        ? 'MANAGER'
        : pathname.startsWith('/employee')
          ? 'EMPLOYEE'
          : null

    if (requiredRole && (roleRank[role] ?? 0) < roleRank[requiredRole]) {
      return NextResponse.redirect(new URL(roleHome[role] ?? '/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/employee/:path*', '/manager/:path*', '/admin/:path*', '/reports/:path*'],
}
