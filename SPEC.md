# AtomQuest Phase 1 — Detailed Specification

## Project Overview

**Name:** AtomQuest Goal Portal
**Type:** Enterprise Web Application (SaaS)
**Phase:** 1 — Foundation, Auth, Roles & Design System
**Target Users:** Employees, Managers, Administrators in mid-to-large organizations

---

## 1. Technical Stack Specification

### 1.1 Core Framework
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v3 + custom CSS variables

### 1.2 Dependencies
```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "typescript": "5.x",
    "@prisma/client": "5.x",
    "next-auth": "4.x",
    "bcryptjs": "2.x",
    "lucide-react": "latest",
    "framer-motion": "11.x",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "class-variance-authority": "latest"
  },
  "devDependencies": {
    "prisma": "5.x",
    "@types/node": "20.x",
    "@types/react": "18.x",
    "@types/react-dom": "18.x",
    "@types/bcryptjs": "2.x",
    "tailwindcss": "3.x",
    "postcss": "8.x",
    "autoprefixer": "10.x"
  }
}
```

### 1.3 Database
- **Provider:** PostgreSQL
- **ORM:** Prisma 5.x
- **Connection:** Environment variable `DATABASE_URL`

### 1.4 Fonts (Google Fonts)
- **Display (headings, brand):** Syne — weights 600, 700, 800
- **Body (labels, content):** DM Sans — weights 300, 400, 500, 600
- **Monospace (numbers, IDs):** JetBrains Mono — weight 400, 500

---

## 2. Database Schema Specification

### 2.1 Models

```prisma
// src/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  role         Role      @default(EMPLOYEE)
  department   String?
  managerId    String?
  manager      User?     @relation("Reports", fields: [managerId], references: [id])
  reports      User[]    @relation("Reports")
  avatarUrl    String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  goals        Goal[]    @relation("EmployeeGoals")
  managedGoals Goal[]    @relation("ManagerGoals")
  approvals    GoalApproval[]
  checkinsGiven  CheckinSession[] @relation("ManagerCheckins")
  checkinsReceived CheckinSession[] @relation("EmployeeCheckins")
  achievements Achievement[]
}

enum Role {
  EMPLOYEE
  MANAGER
  ADMIN
}

model Cycle {
  id              String      @id @default(cuid())
  name            String      // e.g., "FY 2026"
  year            Int
  currentPhase    CyclePhase  @default(GOAL_SETTING)
  goalSettingOpen DateTime    // May 1
  q1Open          DateTime    // July 1
  q2Open          DateTime    // October 1
  q3Open          DateTime    // January 1
  q4Open          DateTime    // March 1
  isActive        Boolean     @default(false)
  createdAt       DateTime    @default(now())

  goals           Goal[]
  achievements    Achievement[]
  checkins        CheckinSession[]
}

enum CyclePhase {
  GOAL_SETTING
  Q1_CHECKIN
  Q2_CHECKIN
  Q3_CHECKIN
  Q4_ANNUAL
  CLOSED
}

model Goal {
  id                String       @id @default(cuid())
  employeeId        String
  employee          User         @relation("EmployeeGoals", fields: [employeeId], references: [id])
  managerId         String?
  manager           User?        @relation("ManagerGoals", fields: [managerId], references: [id])
  cycleId           String
  cycle             Cycle        @relation(fields: [cycleId], references: [id])
  title             String
  description       String?
  thrustAreaId      String
  thrustArea        ThrustArea   @relation(fields: [thrustAreaId], references: [id])
  uomType           UomType
  targetValue       Float?       // for NUMERIC, PERCENT
  targetDate        DateTime?    // for TIMELINE
  weightage         Float        // 10–100
  status            GoalStatus   @default(DRAFT)
  isSharedGoal      Boolean      @default(false)
  sharedFromGoalId  String?
  sharedFromGoal    Goal?        @relation("SharedGoals", fields: [sharedFromGoalId], references: [id])
  sharedInstances   Goal[]       @relation("SharedGoals")
  lockedAt          DateTime?
  lockedBy          String?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  approvals         GoalApproval[]
  achievements      Achievement[]
}

enum UomType {
  MIN_NUMERIC
  MAX_NUMERIC
  MIN_PERCENT
  MAX_PERCENT
  TIMELINE
  ZERO
}

enum GoalStatus {
  DRAFT
  SUBMITTED
  APPROVED
  LOCKED
  RETURNED
}

model GoalApproval {
  id         String         @id @default(cuid())
  goalId     String
  goal       Goal           @relation(fields: [goalId], references: [id])
  managerId  String
  manager    User           @relation(fields: [managerId], references: [id])
  action     ApprovalAction
  comment    String?
  actedAt    DateTime       @default(now())
}

enum ApprovalAction {
  APPROVED
  RETURNED
  EDITED
}

model ThrustArea {
  id    String  @id @default(cuid())
  name  String  @unique
  color String  // hex for UI badge
  goals Goal[]
}

model Achievement {
  id            String            @id @default(cuid())
  goalId         String
  goal           Goal              @relation(fields: [goalId], references: [id])
  cycleId        String
  quarter        Quarter
  actualValue    Float?
  actualDate     DateTime?
  status        GoalProgressStatus @default(NOT_STARTED)
  computedScore Float?
  notes          String?
  loggedBy       String
  loggedAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@unique([goalId, quarter])
}

enum Quarter {
  Q1
  Q2
  Q3
  Q4
}

enum GoalProgressStatus {
  NOT_STARTED
  ON_TRACK
  COMPLETED
}

model CheckinSession {
  id          String   @id @default(cuid())
  managerId   String
  manager     User     @relation("ManagerCheckins", fields: [managerId], references: [id])
  employeeId  String
  employee    User     @relation("EmployeeCheckins", fields: [employeeId], references: [id])
  cycleId     String
  cycle       Cycle    @relation(fields: [cycleId], references: [id])
  quarter     Quarter
  comment     String
  completedAt DateTime @default(now())

  @@unique([managerId, employeeId, cycleId, quarter])
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  entityType String   // "Goal" | "Cycle" | "User"
  entityId   String
  action     String   // "UNLOCK" | "EDIT_POST_LOCK" | "APPROVE" | "RETURN"
  oldValue   Json?
  newValue   Json?
  reason     String?
  createdAt  DateTime @default(now())
}

model SharedGoalAssignment {
  id               String   @id @default(cuid())
  sourceGoalId     String
  recipientId      String
  recipient        User     @relation(fields: [recipientId], references: [id])
  customWeightage  Float
  assignedById     String
  assignedAt       DateTime  @default(now())
}
```

### 2.2 Seed Data

```typescript
// src/prisma/seed.ts

const seedData = {
  users: [
    { name: 'Admin User', email: 'admin@atomquest.in', password: 'Admin@1234', role: 'ADMIN' },
    { name: 'Manager One', email: 'manager@atomquest.in', password: 'Manager@1234', role: 'MANAGER', department: 'Engineering' },
    { name: 'Employee One', email: 'emp1@atomquest.in', password: 'Employee@1234', role: 'EMPLOYEE', department: 'Engineering' },
    { name: 'Employee Two', email: 'emp2@atomquest.in', password: 'Employee@1234', role: 'EMPLOYEE', department: 'Engineering' },
    { name: 'Employee Three', email: 'emp3@atomquest.in', password: 'Employee@1234', role: 'EMPLOYEE', department: 'Design' },
  ],
  cycles: [
    {
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
  ],
  thrustAreas: [
    { name: 'Customer Excellence', color: '#6366F1' },
    { name: 'Revenue Growth', color: '#22C55E' },
    { name: 'Operational Efficiency', color: '#F59E0B' },
    { name: 'People & Culture', color: '#EC4899' },
    { name: 'Innovation', color: '#8B5CF6' },
    { name: 'Compliance & Risk', color: '#06B6D4' },
  ],
}
```

---

## 3. Design System Specification

### 3.1 CSS Variables (globals.css)

```css
:root {
  /* Dark Theme (default) */
  --bg-base: #0A0A0F;
  --bg-surface: #111118;
  --bg-elevated: #1A1A24;
  --bg-overlay: #22222E;

  --border-subtle: rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.10);
  --border-strong: rgba(255,255,255,0.18);

  --text-primary: #F0F0F5;
  --text-secondary: #8B8B9E;
  --text-muted: #4A4A5E;
  --text-inverse: #0A0A0F;

  --accent: #6366F1;
  --accent-hover: #4F52D9;
  --accent-subtle: rgba(99,102,241,0.12);
  --accent-glow: rgba(99,102,241,0.25);

  --success: #22C55E;
  --success-subtle: rgba(34,197,94,0.12);
  --warning: #F59E0B;
  --warning-subtle: rgba(245,158,11,0.12);
  --danger: #EF4444;
  --danger-subtle: rgba(239,68,68,0.12);
  --info: #38BDF8;
  --info-subtle: rgba(56,189,248,0.12);

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  --ease-default: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 120ms;
  --duration-default: 200ms;
  --duration-slow: 350ms;

  --font-display: 'Syne', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

/* Light Theme */
[data-theme="light"] {
  --bg-base: #F4F4F8;
  --bg-surface: #FFFFFF;
  --bg-elevated: #F0F0F5;
  --bg-overlay: #E8E8F0;
  --border-subtle: rgba(0,0,0,0.05);
  --border-default: rgba(0,0,0,0.09);
  --border-strong: rgba(0,0,0,0.15);
  --text-primary: #0F0F1A;
  --text-secondary: #5A5A72;
  --text-muted: #9898B0;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05);
}
```

### 3.2 Tailwind Configuration

```javascript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          overlay: 'var(--bg-overlay)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
          glow: 'var(--accent-glow)',
        },
        success: {
          DEFAULT: 'var(--success)',
          subtle: 'var(--success-subtle)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          subtle: 'var(--warning-subtle)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          subtle: 'var(--danger-subtle)',
        },
        info: {
          DEFAULT: 'var(--info)',
          subtle: 'var(--info-subtle)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--ease-default)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        DEFAULT: 'var(--duration-default)',
        slow: 'var(--duration-slow)',
      },
    },
  },
  plugins: [],
}
export default config
```

### 3.3 Typography Scale

```css
/* In globals.css */
:root {
  --text-xs: 11px / 1.5;
  --text-sm: 13px / 1.5;
  --text-base: 14px / 1.6;
  --text-md: 16px / 1.5;
  --text-lg: 18px / 1.4;
  --text-xl: 22px / 1.3;
  --text-2xl: 28px / 1.2;
  --text-3xl: 36px / 1.1;
}
```

---

## 4. Component Specifications

### 4.1 Button Component

```typescript
// src/components/ui/button.tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:bg-accent-hover hover:scale-[1.01] active:scale-[0.98]',
        secondary: 'bg-bg-elevated border border-border hover:bg-bg-overlay hover:border-border-strong',
        ghost: 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
        danger: 'bg-danger-subtle text-danger border border-danger/30 hover:bg-danger/20',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        default: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

### 4.2 Input Component

```typescript
// src/components/ui/input.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-all duration-fast',
            'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow',
            error && 'border-danger focus:border-danger focus:ring-danger/15',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

### 4.3 Card Component

```typescript
// src/components/ui/card.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border-subtle bg-bg-surface p-6 shadow-sm transition-all duration-default',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold text-text-primary font-display', className)} {...props} />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-text-secondary', className)} {...props} />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('', className)} {...props} />
)
CardContent.displayName = 'CardContent'

export { Card, CardHeader, CardTitle, CardDescription, CardContent }
```

### 4.4 Badge Component

```typescript
// src/components/ui/badge.tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-bg-elevated text-text-muted border border-border',
        success: 'bg-success-subtle text-success border border-success/30',
        warning: 'bg-warning-subtle text-warning border border-warning/30',
        danger: 'bg-danger-subtle text-danger border border-danger/30',
        info: 'bg-info-subtle text-info border border-info/30',
        accent: 'bg-accent-subtle text-accent border border-accent/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

### 4.5 Table Component

```typescript
// src/components/ui/table.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
)
Table.displayName = 'Table'

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('[&_tr]:border-b border-border-subtle bg-bg-elevated', className)} {...props} />
  )
)
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  )
)
TableBody.displayName = 'TableBody'

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-border-subtle transition-colors hover:bg-bg-elevated data-[state=selected]:bg-bg-elevated',
        className
      )}
      {...props}
    />
  )
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-10 px-4 text-left align-middle text-xs font-medium text-text-secondary uppercase tracking-wider [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
)
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('p-4 align-middle text-text-primary [&:has([role=checkbox])]:pr-0', className)} {...props} />
  )
)
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => <caption ref={ref} className={cn('mt-4 text-sm text-text-muted', className)} {...props} />
)
TableCaption.displayName = 'TableCaption'

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption }
```

---

## 5. Authentication Specification

### 5.1 NextAuth Configuration

```typescript
// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) return null

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          managerId: user.managerId,
          department: user.department,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.managerId = user.managerId
        token.department = user.department
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.managerId = token.managerId as string | null
        session.user.department = token.department as string | null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
}
```

### 5.2 Session Type Extension

```typescript
// src/types/next-auth.d.ts
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      managerId: string | null
      department: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: string
    managerId: string | null
    department: string | null
  }
}
```

### 5.3 Middleware (Role-Based Routes)

```typescript
// src/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Admin-only routes
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Manager routes (admin also has access)
    if (path.startsWith('/manager') && token?.role === 'EMPLOYEE') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Employee routes
    if (path.startsWith('/employee') && token?.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/employee/:path*', '/manager/:path*', '/admin/:path*', '/dashboard'],
}
```

---

## 6. API Routes Specification

### 6.1 Auth Routes
```
GET  /api/auth/[...nextauth]  — NextAuth handler
GET  /api/auth/me             — Get current user with role and manager info
```

### 6.2 User Management (Admin)
```
GET    /api/users              — List all users (admin)
POST   /api/users              — Create user (admin)
PATCH  /api/users/:id          — Update user (admin)
DELETE /api/users/:id          — Soft delete user (admin)
```

### 6.3 Cycle Management (Admin)
```
GET    /api/cycles             — List all cycles
POST   /api/cycles             — Create cycle (admin)
PATCH  /api/cycles/:id         — Update cycle (admin)
POST   /api/cycles/:id/activate — Set active cycle (admin)
```

### 6.4 Thrust Areas (Admin)
```
GET    /api/thrust-areas       — List all thrust areas
POST   /api/thrust-areas       — Create thrust area (admin)
PATCH  /api/thrust-areas/:id   — Update thrust area (admin)
DELETE /api/thrust-areas/:id   — Delete thrust area (admin)
```

### 6.5 Audit Logs (Admin)
```
GET    /api/audit-logs         — Paginated audit logs with filters
```

---

## 7. UI Shell Specification

### 7.1 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR (240px → 64px on collapse)                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Logo: "AQ" + "AtomQuest"                        │   │
│  │ Collapse toggle                                 │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Active Cycle Badge                              │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Nav Items (role-filtered)                       │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ User: Avatar + Name + Role                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  MAIN AREA                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ TOPBAR (56px height)                            │   │
│  │ Breadcrumb | Search | Notifications | Theme      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ PAGE CONTENT (max-width: 1280px)               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Sidebar Component

```typescript
// src/components/layout/sidebar.tsx
// Props: collapsed: boolean, setCollapsed: (v: boolean) => void
// Nav items based on user.role
// Logo with gradient text
// Animated collapse with Framer Motion
// Bottom: user avatar, name, role badge
```

### 7.3 Topbar Component

```typescript
// src/components/layout/topbar.tsx
// Props: title?: string, breadcrumbs?: string[]
// Right: search trigger, notifications, theme toggle, user menu
```

---

## 8. Page Specifications

### 8.1 Login Page (`/login`)

```
Layout: 60/40 split
Left: Dark bg, gradient logo, tagline, floating stat cards (decorative)
Right: Login form with email, password, forgot password, sign in button
       "Continue with Microsoft" button (ghost style)
```

### 8.2 Dashboard Pages

**Employee:** `/employee/dashboard`
- 4 stat cards: My Goals, Weightage Total, Current Phase, Days Until Deadline
- Goal sheet summary with progress bars
- Recent activity feed

**Manager:** `/manager/dashboard`
- 4 stat cards: Team Size, Goals Pending, Check-ins Pending, Completion %
- Pending approvals list
- Team status table

**Admin:** `/admin/dashboard`
- 4 stat cards: Total Employees, Goals Submitted, Approval Rate, Completion
- Org health + cycle timeline
- Audit events + escalations

### 8.3 Admin Pages

**Users:** `/admin/users`
- Table with search, role filter, department filter
- Add user drawer (slides from right)
- Table/Tree view toggle

**Cycles:** `/admin/cycles`
- Active cycle hero card with timeline strip
- Phase list with edit capability
- Create cycle form

**Thrust Areas:** `/admin/thrust-areas`
- Grid of colored chips
- Add inline form

**Audit Log:** `/admin/audit-log`
- Paginated table
- Filters: entity type, action, date range

---

## 9. Animations Specification

### 9.1 Page Transitions

```typescript
// src/components/ui/page-transition.tsx
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}
```

### 9.2 Staggered List Items

```typescript
const listVariants = {
  animate: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
}
```

### 9.3 Other Animations
- Sidebar collapse: spring (stiffness: 300, damping: 30)
- Stat card count-up: 800ms on mount
- Button hover: scale(1.01), active: scale(0.98)
- Focus rings: smooth 150ms transition

---

## 10. Environment Variables

```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/atomquest"
NEXTAUTH_SECRET="your-secret-key-min-32-chars-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Azure AD (stub - can be empty)
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID=""
```

---

## 11. Acceptance Criteria

### Auth & Roles
- [ ] Login with credentials works for all 4 seeded users
- [ ] Role-based redirect after login (admin → admin/dashboard, manager → manager/dashboard, employee → employee/dashboard)
- [ ] Middleware blocks unauthorized route access
- [ ] Session persists across page refreshes

### Design System
- [ ] Dark theme loads by default
- [ ] Light theme toggle works and persists in localStorage
- [ ] All colors match CSS variable spec
- [ ] Fonts load correctly (Syne, DM Sans, JetBrains Mono)

### UI Shell
- [ ] Sidebar shows correct nav items per role
- [ ] Sidebar collapse animation works smoothly
- [ ] Topbar shows breadcrumbs, theme toggle, user menu
- [ ] Page transitions animate on route change

### Dashboards
- [ ] Employee dashboard shows 4 stat cards with real data
- [ ] Manager dashboard shows team stats and pending approvals
- [ ] Admin dashboard shows org stats

### Admin Screens
- [ ] Users page: CRUD operations, table/tree toggle
- [ ] Cycles page: timeline strip displays correctly
- [ ] Thrust Areas page: colored chips with CRUD
- [ ] Audit Log page: empty paginated table displays

### Polish
- [ ] Cmd+K opens command palette (stub)
- [ ] Notifications dropdown works
- [ ] All buttons have hover/active states
- [ ] Forms show validation errors properly