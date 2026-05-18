# AtomQuest Goal Portal — Detailed Implementation Prompts
## All 5 Phases — Full Stack + Premium UI

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 1 — Foundation, Auth, Roles & Design System
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Overview
Build the foundational layer of the AtomQuest Goal Setting & Tracking Portal:
authentication, role-based routing, org structure, admin controls, and — critically —
the complete visual design system and UI shell that every subsequent phase will build on.

---

## 1. TECH STACK

```
Frontend : Next.js 14 (App Router) + TypeScript + Tailwind CSS
UI Lib   : shadcn/ui (headless primitives only — do NOT use default shadcn theming)
Icons    : Lucide React
Fonts    : [See Design System section below — do not use Inter/Roboto/Arial]
Animations: Framer Motion
Backend  : Next.js API Routes (or separate Express/Fastify if preferred)
Database : PostgreSQL via Prisma ORM
Auth     : NextAuth.js with credentials provider + optional Azure AD MSAL provider
Emails   : Resend (or Nodemailer as fallback)
Hosting  : Vercel / Railway / Render (document your choice)
```

---

## 2. DATABASE SCHEMA

Create Prisma models (or equivalent):

```prisma
model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(EMPLOYEE)
  department   String?
  managerId    String?
  manager      User?    @relation("Reports", fields: [managerId], references: [id])
  reports      User[]   @relation("Reports")
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum Role {
  EMPLOYEE
  MANAGER
  ADMIN
}

model Cycle {
  id              String      @id @default(cuid())
  name            String      // e.g. "FY 2026"
  year            Int
  currentPhase    CyclePhase  @default(GOAL_SETTING)
  goalSettingOpen DateTime    // May 1
  q1Open          DateTime    // July 1
  q2Open          DateTime    // October 1
  q3Open          DateTime    // January 1
  q4Open          DateTime    // March 1
  isActive        Boolean     @default(false)
  createdAt       DateTime    @default(now())
}

enum CyclePhase {
  GOAL_SETTING
  Q1_CHECKIN
  Q2_CHECKIN
  Q3_CHECKIN
  Q4_ANNUAL
  CLOSED
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

model ThrustArea {
  id    String @id @default(cuid())
  name  String @unique
  color String // hex for UI badge coloring
}
```

Seed script must create:
- 1 Admin: admin@atomquest.in / Admin@1234
- 1 Manager: manager@atomquest.in / Manager@1234
- 3 Employees (all reporting to the manager): emp1@atomquest.in, emp2@atomquest.in, emp3@atomquest.in / Employee@1234
- 1 Active Cycle: FY 2026, currentPhase = GOAL_SETTING
- 6 default Thrust Areas: Customer Excellence, Revenue Growth, Operational Efficiency, People & Culture, Innovation, Compliance & Risk

---

## 3. AUTH SYSTEM

### API Routes:
```
POST /api/auth/[...nextauth]   — NextAuth handler
GET  /api/auth/me              — current user profile + role + manager info
POST /api/auth/azure           — Azure AD token exchange (bonus feature stub)
```

### Session Strategy:
- JWT strategy (not database sessions) for stateless API compatibility
- Token payload: `{ id, name, email, role, managerId, department }`
- Access token expiry: 8 hours; refresh silently via NextAuth

### Azure AD Stub (wire UI even if credentials not configured):
```typescript
// In auth config, add AzureAD provider:
AzureADProvider({
  clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
  clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
  tenantId: process.env.AZURE_AD_TENANT_ID ?? "",
})
// In callbacks.signIn: map Azure AD groups to roles via env var:
// AZURE_ROLE_MAP='{"Group-Managers":"MANAGER","Group-HR":"ADMIN"}'
// Sync manager from Azure AD profile.manager field
```

### Role Guards:
```typescript
// Middleware: src/middleware.ts
// Protect /employee/* for EMPLOYEE+
// Protect /manager/* for MANAGER+  
// Protect /admin/* for ADMIN only
// Redirect mismatched roles to their own dashboard
```

---

## 4. API ROUTES — PHASE 1 SCOPE

```
GET    /api/users              — Admin: list all users with role + manager
POST   /api/users              — Admin: create user
PATCH  /api/users/:id          — Admin: update user (role, manager, department)
DELETE /api/users/:id          — Admin: soft-delete user

GET    /api/cycles             — Get all cycles
POST   /api/cycles             — Admin: create cycle
PATCH  /api/cycles/:id         — Admin: update cycle (change active phase, dates)
POST   /api/cycles/:id/activate — Admin: set as the one active cycle

GET    /api/thrust-areas       — List all thrust areas
POST   /api/thrust-areas       — Admin: create thrust area
PATCH  /api/thrust-areas/:id   — Admin: update
DELETE /api/thrust-areas/:id   — Admin: delete

GET    /api/audit-logs         — Admin: paginated audit log with filters
```

---

## 5. DESIGN SYSTEM & VISUAL LANGUAGE

### Inspiration Sources:
Take visual and UX cues from:
- **Linear.app** — razor-sharp spacing, dark-first, minimal but information-dense, keyboard-friendly
- **Vercel Dashboard** — professional dark UI with clean data tables, subtle borders, confident typography
- **Notion** — structured information architecture, clean sidebar, content-first
- **Stripe Dashboard** — chart quality, data clarity, trust signals, status badges
- **Lark / Feishu** — enterprise-grade layout with a modern edge that feels non-stuffy

### Aesthetic Direction: "Precision Dark"
```
Character : Calm authority. This is a tool for professionals — not flashy, 
            but unmistakably premium. Every pixel earns its place.

Theme     : Dark-first (default). Clean light mode available.
            Dark: near-black backgrounds with layered elevation.
            Light: cool off-white, not pure white.

Feel      : Like the inside of a well-designed fintech dashboard. 
            Structured. Trustworthy. Dense but breathable.
```

### Color Palette (CSS Variables):
```css
:root {
  /* Backgrounds — layered elevation system */
  --bg-base:      #0A0A0F;   /* page background */
  --bg-surface:   #111118;   /* cards, panels */
  --bg-elevated:  #1A1A24;   /* modals, dropdowns, hover states */
  --bg-overlay:   #22222E;   /* tooltips, popovers */

  /* Borders */
  --border-subtle:  rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.10);
  --border-strong:  rgba(255,255,255,0.18);

  /* Text */
  --text-primary:   #F0F0F5;
  --text-secondary: #8B8B9E;
  --text-muted:     #4A4A5E;
  --text-inverse:   #0A0A0F;

  /* Brand Accent — Electric Indigo */
  --accent:         #6366F1;   /* indigo-500 */
  --accent-hover:   #4F52D9;
  --accent-subtle:  rgba(99,102,241,0.12);
  --accent-glow:    rgba(99,102,241,0.25);

  /* Semantic Colors */
  --success:        #22C55E;
  --success-subtle: rgba(34,197,94,0.12);
  --warning:        #F59E0B;
  --warning-subtle: rgba(245,158,11,0.12);
  --danger:         #EF4444;
  --danger-subtle:  rgba(239,68,68,0.12);
  --info:           #38BDF8;
  --info-subtle:    rgba(56,189,248,0.12);

  /* Elevation Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07);

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  /* Transitions */
  --ease-default: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 120ms;
  --duration-default: 200ms;
  --duration-slow: 350ms;
}

/* Light Mode Override */
[data-theme="light"] {
  --bg-base:       #F4F4F8;
  --bg-surface:    #FFFFFF;
  --bg-elevated:   #F0F0F5;
  --bg-overlay:    #E8E8F0;
  --border-subtle:  rgba(0,0,0,0.05);
  --border-default: rgba(0,0,0,0.09);
  --border-strong:  rgba(0,0,0,0.15);
  --text-primary:   #0F0F1A;
  --text-secondary: #5A5A72;
  --text-muted:     #9898B0;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05);
}
```

### Typography:
```css
/* Import in layout.tsx */
import { Syne, DM_Sans } from 'next/font/google'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700', '800'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
})

/* Usage:
   Headings, page titles, nav brand:   font-family: var(--font-display)
   Body text, labels, table data:      font-family: var(--font-body)
   Monospace (scores, IDs, numbers):   font-family: 'JetBrains Mono', monospace (CDN)
*/

/* Type Scale */
--text-xs:   11px / 1.5  — metadata, table captions
--text-sm:   13px / 1.5  — labels, secondary text
--text-base: 14px / 1.6  — body, table cells
--text-md:   16px / 1.5  — card titles, form labels
--text-lg:   18px / 1.4  — section headers
--text-xl:   22px / 1.3  — page titles
--text-2xl:  28px / 1.2  — dashboard hero numbers
--text-3xl:  36px / 1.1  — large stat displays
```

### Component Specs:

**Buttons:**
```
Primary   : bg-accent, text-white, 8px 16px padding, radius-md, 
            hover: bg-accent-hover + slight scale(1.01),
            active: scale(0.98)
            
Secondary : bg-bg-elevated, border-border-default, 
            hover: bg-bg-overlay, border-border-strong

Ghost     : transparent, text-secondary, hover: bg-bg-elevated, text-primary

Danger    : bg-danger-subtle, text-danger, border-danger/30,
            hover: bg-danger/20

All buttons: height 36px (sm), 40px (default), 44px (lg)
             font-weight 500, letter-spacing 0.01em
             transition: all var(--duration-fast) var(--ease-default)
```

**Cards:**
```
background: var(--bg-surface)
border: 1px solid var(--border-subtle)
border-radius: var(--radius-lg)
box-shadow: var(--shadow-sm)
padding: 24px

Card hover (interactive cards):
  border-color: var(--border-default)
  box-shadow: var(--shadow-md)
  transition: 200ms ease
```

**Form Inputs:**
```
background: var(--bg-elevated)
border: 1px solid var(--border-default)
border-radius: var(--radius-md)
padding: 10px 14px
color: var(--text-primary)
placeholder: var(--text-muted)
font-size: 14px

focus:
  border-color: var(--accent)
  box-shadow: 0 0 0 3px var(--accent-glow)
  outline: none

error:
  border-color: var(--danger)
  box-shadow: 0 0 0 3px rgba(239,68,68,0.15)

Label: 12px, font-weight 500, text-secondary, uppercase, letter-spacing 0.08em
       displayed above input, margin-bottom 6px
```

**Status Badges:**
```
Structure: inline-flex, gap 6px, align-center
           padding: 3px 10px, border-radius: 99px
           font-size: 12px, font-weight: 500

DRAFT      : bg-bg-elevated,     text-text-muted,     border-border-default
SUBMITTED  : bg-info-subtle,     text-info,           border-info/30
APPROVED   : bg-success-subtle,  text-success,        border-success/30
LOCKED     : bg-warning-subtle,  text-warning,        border-warning/30
RETURNED   : bg-danger-subtle,   text-danger,         border-danger/30
COMPLETED  : bg-success-subtle,  text-success,        filled dot before text
ON_TRACK   : bg-info-subtle,     text-info,           pulsing dot before text
NOT_STARTED: bg-bg-elevated,     text-text-secondary, empty dot before text
```

**Data Tables:**
```
Header row: bg-bg-elevated, text-text-secondary, 11px uppercase, letter-spacing 0.08em
            border-bottom: 1px solid var(--border-subtle)
            
Data rows: text-text-primary, 14px
           border-bottom: 1px solid var(--border-subtle)
           hover: bg-bg-elevated (transition 120ms)
           
Cell padding: 14px 16px
Sticky first column for wide tables
Sortable columns: show sort icon on hover, active sort highlighted in accent color

Empty state: centered illustration + heading + subtext + CTA button
             (use a subtle SVG illustration, not a generic icon)
```

**Progress Bars (for scores/weightage):**
```
Track: height 6px, bg-bg-overlay, radius 99px
Fill: linear-gradient(90deg, var(--accent), #818CF8)
      transition: width 600ms var(--ease-default) (animate on mount)
      
For weightage totals:
  < 100%: fill color = warning
  = 100%: fill color = success  
  > 100%: fill color = danger
  
Number label alongside: monospace, 13px, text-secondary
```

---

## 6. UI SHELL LAYOUT

### App Layout Structure:
```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed, collapsible to 64px)             │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Logo: "AQ" mark + "AtomQuest" wordmark (Syne font) │ │
│  │ Collapse toggle (arrow icon)                        │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ Active Cycle Badge:                                 │ │
│  │ ● Q1 Check-in Open  [pulsing green dot]            │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ NAV ITEMS (role-filtered):                         │ │
│  │   Dashboard                                         │ │
│  │   My Goals          [EMPLOYEE]                      │ │
│  │   My Check-ins      [EMPLOYEE]                      │ │
│  │   Team Goals        [MANAGER]                       │ │
│  │   Team Check-ins    [MANAGER]                       │ │
│  │   Reports           [MANAGER, ADMIN]                │ │
│  │   Analytics         [MANAGER, ADMIN]                │ │
│  │   ── Admin ──                                       │ │
│  │   Users & Org       [ADMIN]                         │ │
│  │   Cycles            [ADMIN]                         │ │
│  │   Thrust Areas      [ADMIN]                         │ │
│  │   Audit Log         [ADMIN]                         │ │
│  │   Escalations       [ADMIN]                         │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ Bottom: Avatar + Name + Role chip + Settings gear  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  MAIN AREA                                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │ TOPBAR:                                             │ │
│  │  Breadcrumb | Search (Cmd+K) | Notifications | Theme│ │
│  ├────────────────────────────────────────────────────┤ │
│  │ PAGE CONTENT                                        │ │
│  │ (max-width: 1280px, centered, padding: 32px)        │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Sidebar Details:
- Gradient brand mark: "AQ" in Syne Bold, gradient text from `#6366F1` to `#818CF8`
- Nav items: 40px tall, 12px left padding, rounded-lg hover/active
- Active item: `bg-accent-subtle`, left border `2px solid var(--accent)`, text-accent
- Inactive item hover: `bg-bg-elevated`, text-primary
- Collapsed state: show only icons with Framer Motion width animation (240→64px, 200ms ease)
- Bottom section: avatar with initials fallback, name in 13px medium, role badge chip

### Top Bar Details:
- Height: 56px, `border-bottom: 1px solid var(--border-subtle)`
- Breadcrumb: `Dashboard / My Goals` — separator is `/` in text-muted
- Global search: Cmd+K opens a floating command palette (shadcn cmdk) with:
  - Search users, goals, reports
  - Quick actions: "Submit Goals", "View My Check-in"
- Notification bell: badge count, dropdown with recent events
- Theme toggle: animated sun/moon icon, smooth 300ms transition
- Right: avatar dropdown (Profile, Settings, Sign Out)

### Dashboard Page (per role):

**Employee Dashboard:**
```
Row 1: 4 stat cards (animated count-up on load)
  [My Goals This Cycle] [Weightage Total] [Current Phase] [Days Until Deadline]

Row 2: Goal Sheet Summary card (progress bar per goal)
  + Quick Action: "Submit Goals" / "View Check-in" depending on phase

Row 3: Recent Activity feed (timeline style)
```

**Manager Dashboard:**
```
Row 1: 4 stat cards
  [Team Size] [Goals Pending Approval] [Check-ins Pending] [Team Completion %]

Row 2: Pending Approvals list (compact card, most urgent first)

Row 3: Team status table (employee | goals | status | last activity)
```

**Admin Dashboard:**
```
Row 1: 4 stat cards
  [Total Employees] [Goals Submitted] [Approval Rate] [Check-in Completion]

Row 2: Org health gauge + Active cycle timeline strip

Row 3: Recent audit events + Escalation alerts
```

---

## 7. LOGIN / AUTH PAGES

### Login Page Design:
```
Layout: Split-screen (60/40)

Left Panel (60%):
  - Pure dark bg-base
  - Centered: "AQ" logo mark (large, 80px, gradient)
  - Tagline: "Set goals. Track progress. Drive outcomes."
    (Syne Bold, 32px, text-primary)
  - Subtle background: very faint grid lines (1px, rgba(255,255,255,0.03))
    OR a slow-moving gradient mesh (CSS animation, 20s loop)
  - Floating stat cards positioned at angles — show fake preview data
    (e.g., a mini goal completion card tilted 3°, adds depth)

Right Panel (40%):
  - bg-surface, border-left: 1px solid var(--border-subtle)
  - Centered login form:
    - "Welcome back" (Syne, 24px)
    - Subtitle: "Sign in to AtomQuest" (text-secondary, 14px)
    - Email input + Password input
    - "Forgot password?" link (text-accent, right-aligned)
    - Sign In button (full width, primary)
    - Divider: "or"
    - "Continue with Microsoft" button (ghost style, Microsoft logo SVG)
  - Bottom: Version number + "© 2026 AtomQuest"
  - On form submit: button shows spinner + disabled state

Animations:
  - Left panel stats fade+slide in with stagger (Framer Motion)
  - Form fields slide up from 20px with opacity (150ms stagger)
  - Error shake animation on wrong credentials
```

---

## 8. ADMIN SCREENS (Phase 1 scope)

### User Management (`/admin/users`):
```
Page Header: "Team & Org" | Subtitle: "Manage users, roles, and reporting lines"
Actions bar: [Search input] [Filter by Role ▾] [Filter by Dept ▾] [+ Add User]

Table columns:
  Avatar+Name | Email | Role (badge) | Department | Manager | Last Login | Actions (⋯)

Row actions (⋯ dropdown):
  Edit User | Change Role | Reassign Manager | Deactivate

Add/Edit User: side drawer (not modal) slides in from the right
  Fields: Full Name, Email, Password (create only), Role (segmented control),
          Department (text), Reports To (searchable user select)
  
Org Hierarchy View: Toggle between Table view and Tree view
  Tree view: collapsible org chart using SVG lines, each node = user card
```

### Cycle Management (`/admin/cycles`):
```
Current Active Cycle: hero card at top, large and prominent
  Shows: Cycle name, year, current phase with timeline strip
  
Timeline Strip:
  [Goal Setting ✓] ──── [Q1 ●] ──── [Q2] ──── [Q3] ──── [Q4]
  Each phase shows: open date, status (done/active/upcoming)
  Admin can click a phase to edit its dates or activate it

Create Cycle: form with year picker and phase date pickers (date inputs)
```

### Thrust Areas (`/admin/thrust-areas`):
```
Grid of editable chips — each thrust area shown as a colored pill
  Name, color swatch, edit/delete icons
Add new: inline form at the bottom of the grid
Color picker: simple preset swatches (10 colors from the design palette)
```

---

## 9. MICRO-INTERACTIONS & ANIMATIONS

Implement these throughout using Framer Motion:

```typescript
// Page transition: fade + 8px slide up
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16,1,0.3,1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } }
}

// Staggered list items
const listVariants = {
  animate: { transition: { staggerChildren: 0.06 } }
}
const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16,1,0.3,1] } }
}

// Stat card count-up on mount (use react-countup or custom useEffect)
// Number animates from 0 → value over 800ms

// Skeleton loading: animated shimmer using CSS gradient animation
// (bg: linear-gradient(90deg, bg-elevated, bg-overlay, bg-elevated) 200% moving)

// Notification badge: scale pop on new notification
// Sidebar collapse: spring physics (stiffness: 300, damping: 30)
```

---

## 10. ACCESSIBILITY & RESPONSIVENESS

- Full keyboard navigation (Tab, Enter, Escape, Arrow keys in dropdowns)
- ARIA labels on all interactive elements
- Focus rings: `outline: 2px solid var(--accent); outline-offset: 2px`
- Color contrast: all text must meet WCAG AA minimum
- Responsive breakpoints:
  - `< 768px`: Sidebar becomes bottom nav (4 icons max)
  - `768–1024px`: Sidebar auto-collapses to icon-only
  - `> 1024px`: Full sidebar

---

## 11. DELIVERABLES FOR PHASE 1

- [ ] Working login + role-based redirect
- [ ] "Continue with Microsoft" button (visible, MSAL wired, graceful fallback if env vars missing)
- [ ] Sidebar + topbar shell with all nav items (role-filtered)
- [ ] Role-specific dashboards with real stat cards (live data from DB)
- [ ] Admin: User management (CRUD + org tree view)
- [ ] Admin: Cycle management with timeline strip
- [ ] Admin: Thrust Areas CRUD
- [ ] Audit log table (visible but empty — populated in later phases)
- [ ] Light/dark mode toggle persisted in localStorage
- [ ] Cmd+K command palette (stub — add real actions in later phases)
- [ ] Database migrations + full seed script
- [ ] README with local setup, env vars, and demo credentials



---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 2 — Goal Creation, Approval & Shared Goals
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Overview
Build the complete goal lifecycle: employee creates goals, manager reviews and approves,
admin manages exceptions. Every interaction must feel fast, safe (validated), and premium.

---

## 1. NEW DATABASE MODELS

```prisma
model Goal {
  id                String      @id @default(cuid())
  employeeId        String
  employee          User        @relation("EmployeeGoals", fields: [employeeId], references: [id])
  cycleId           String
  cycle             Cycle       @relation(fields: [cycleId], references: [id])
  title             String
  description       String?
  thrustAreaId      String
  thrustArea        ThrustArea  @relation(fields: [thrustAreaId], references: [id])
  uomType           UomType
  targetValue       Float?      // for NUMERIC, PERCENT
  targetDate        DateTime?   // for TIMELINE
  weightage         Float       // 10–100, sum across goals must = 100
  status            GoalStatus  @default(DRAFT)
  isSharedGoal      Boolean     @default(false)
  sharedFromGoalId  String?
  sharedFromGoal    Goal?       @relation("SharedGoals", fields: [sharedFromGoalId], references: [id])
  sharedInstances   Goal[]      @relation("SharedGoals")
  lockedAt          DateTime?
  lockedBy          String?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  approvals         GoalApproval[]
  achievements      Achievement[]
}

enum UomType {
  MIN_NUMERIC   // Higher is better: Achievement ÷ Target
  MAX_NUMERIC   // Lower is better: Target ÷ Achievement
  MIN_PERCENT
  MAX_PERCENT
  TIMELINE      // Completion date vs. Deadline
  ZERO          // If 0 → 100%, else 0%
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

model SharedGoalAssignment {
  id               String @id @default(cuid())
  sourceGoalId     String
  recipientId      String
  recipient        User   @relation(fields: [recipientId], references: [id])
  customWeightage  Float
  assignedById     String
  assignedAt       DateTime @default(now())
}
```

---

## 2. API ROUTES — PHASE 2 SCOPE

```
# Employee: Goal CRUD
GET    /api/goals                  — my goals for active cycle
POST   /api/goals                  — create new goal (DRAFT)
PATCH  /api/goals/:id              — update goal (only if DRAFT or RETURNED)
DELETE /api/goals/:id              — delete goal (only if DRAFT)
POST   /api/goals/submit           — submit all DRAFT goals for approval
                                     (validates: count ≤ 8, each ≥ 10%, total = 100%)

# Manager: Approval
GET    /api/manager/pending        — list direct reports with SUBMITTED goals
GET    /api/manager/goals/:userId  — get a specific employee's goals
POST   /api/manager/approve/:userId    — approve all submitted goals for employee
POST   /api/manager/return/:userId     — return for rework (requires comment)
PATCH  /api/manager/goals/:goalId      — inline edit target/weightage during review

# Shared Goals
POST   /api/goals/shared           — Admin/Manager: push shared goal to employees
PATCH  /api/goals/shared/:id       — Recipient adjusts their weightage only

# Admin
POST   /api/admin/goals/:goalId/unlock  — unlock a locked goal (requires reason)
GET    /api/admin/goals            — all goals across org (filterable)
```

---

## 3. EMPLOYEE: GOAL SHEET PAGE (`/employee/goals`)

### Page Header:
```
Title: "My Goals — FY 2026"
Subtitle: "Goal Setting Window Open · Closes June 30"
                              [green pulsing dot] [date]

Right side: Phase badge + [Submit Goals] button (disabled if not valid)
```

### Goal Sheet Layout:
```
SHARED GOALS SECTION (shown only if any exist):
┌─ Shared Goals ─────────────────────────────────────────────────────┐
│ "These goals were assigned by your manager. You can only adjust    │
│  the weightage. Achievements are synced from the primary owner."   │
│                                                                     │
│  [Shared Goal Card × N]  (read-only except weightage)             │
└────────────────────────────────────────────────────────────────────┘

MY GOALS SECTION:
┌─ My Goals ─────────────────────────── [+ Add Goal] ───────────────┐
│  [Goal Card 1]                                                      │
│  [Goal Card 2]                                                      │
│  ...                                                                │
└────────────────────────────────────────────────────────────────────┘

WEIGHTAGE SUMMARY BAR (sticky at bottom or pinned below goals):
┌────────────────────────────────────────────────────────────────────┐
│  Total Weightage  [████████████████████░░░░] 85%  · 15% remaining  │
│  (bar color: warning if ≠ 100%, success if = 100%)                 │
│  [Submit for Approval]  ← disabled with tooltip if not at 100%    │
└────────────────────────────────────────────────────────────────────┘
```

### Goal Card (DRAFT state — editable):
```
┌────────────────────────────────────────────────────────────────────┐
│ ≡ [drag handle]   [Thrust Area Badge]             [⋯ actions menu]│
│                                                                     │
│ Goal Title* ────────────────────────────────────────────────────── │
│ [_________________________________________________________]        │
│                                                                     │
│ Description (optional) ────────────────────────────────────────── │
│ [_________________________________________________________]        │
│                                                                     │
│ Unit of Measurement        Target Value           Weightage (%)    │
│ [Min Numeric ▾]            [_____________]        [____]  %        │
│                                                                     │
│ UoM Helper: "Higher is better — e.g., Sales Revenue"              │
│             (auto-updates based on UoM selection, shown in muted)  │
│                                                                     │
│ ── For TIMELINE UoM: show date picker instead of number ──         │
│ ── For ZERO UoM: hide target input, show "Zero = Success" note ── │
└────────────────────────────────────────────────────────────────────┘
```

Goal card specs:
- Cards are draggable to reorder (react-beautiful-dnd or @dnd-kit/core)
- Each card has a subtle left border colored by thrust area color
- "⋯ actions": Duplicate Goal, Delete Goal
- Deleting: confirmation inline (don't use a modal for destructive actions this small)
- Max 8 goals enforced: "+ Add Goal" button becomes disabled + tooltip "Maximum 8 goals reached"
- Smooth mount animation: new card slides in from top with opacity (Framer Motion layout animation)

### Validation States (real-time, no page reload):
```
Weightage per goal < 10%:
  → red border on that card's weightage input
  → inline error: "Minimum 10% required"

Total ≠ 100%:
  → bottom bar shows warning color + exact difference
  → "Submit" button disabled + tooltip "Adjust goals to total exactly 100%"

Goal count > 8:
  → "+ Add Goal" button disabled

Empty required fields:
  → validated on blur (not on keypress — avoid annoyance)
  → red border + inline message below field

On submit attempt with errors:
  → scroll to first invalid card
  → shake animation on the summary bar
```

### Submission Confirmation:
```
After successful submit:
  NOT a toast — use a full-width success banner at top of page:
  ┌─────────────────────────────────────────────────────────────────┐
  │ ✓  Goals submitted successfully · Your manager has been notified│
  │    You can view your goals below but cannot edit until reviewed. │
  └─────────────────────────────────────────────────────────────────┘
  Goals transition to read-only view (inputs become text)
  Status changes to SUBMITTED badge
```

### LOCKED / APPROVED Goal Card (read-only):
```
Same card layout but:
- All inputs replaced with styled text values
- Left border becomes amber (LOCKED) or green (APPROVED)
- Lock icon in top-right corner
- Status badge shown prominently
- RETURNED: shows rework comment from manager in a highlighted callout box
  (amber left border, "Manager comment: [text]")
```

---

## 4. MANAGER: APPROVAL QUEUE (`/manager/team-goals`)

### Pending Approvals List:
```
Page Header: "Team Goals — Pending Review"
Subtitle: "3 submissions awaiting your approval"

Filter bar: [All Statuses ▾] [All Employees ▾] [Submitted Date ▾]

Each row:
┌────────────────────────────────────────────────────────────────────┐
│ [Avatar] Riya Sharma          Submitted 2 hours ago                │
│          Senior Engineer · 6 goals · Total 100%                    │
│                                                                     │
│  [████████░░] 6/8 goals   [100% ✓]   [SUBMITTED badge]            │
│                                    [Review Goals →]                │
└────────────────────────────────────────────────────────────────────┘
```

### Goal Review Page (`/manager/team-goals/[employeeId]`):
```
Top: Employee profile strip
  [Large avatar] Riya Sharma | Senior Engineer | Submitted 2h ago
  
Below: Inline editable goal table

Columns: #  | Thrust Area | Goal Title + Description | UoM | Target | Weightage | Score Indicator

Table behavior:
  - Manager can click Target cell or Weightage cell → becomes inline input
  - Inline edit: cell highlights with accent border, save on blur
  - Inline edits are tracked and shown as a yellow "edited" indicator dot
  - Weightage total recalculates live as manager edits

Approval Action Bar (sticky at bottom of table):
┌────────────────────────────────────────────────────────────────────┐
│  [Weightage Total: 100% ✓]                                         │
│  [Return for Rework]                     [✓ Approve All Goals]    │
└────────────────────────────────────────────────────────────────────┘

"Return for Rework" flow:
  → Slide-up panel (not modal) from bottom with text area:
    "Add rework instructions for Riya"
    [_______________________________________________]
    [Cancel]  [Send Return Request →]

"Approve All" flow:
  → No modal needed — single confirmation inline:
    Button changes to: "Confirm Approval?" with [Yes, Approve] [Cancel]
    On confirm: goals lock, success banner, row disappears from pending list
```

---

## 5. SHARED GOALS — PUSH INTERFACE

Accessible from Manager nav and Admin nav:

```
"Push Shared Goal" — accessible via:
  - Manager: [Push Shared Goal] button on Team Goals page
  - Admin: button in Admin panel

Side Drawer (slides in from right, 520px wide):

Step 1: Define the Goal
  Goal Title *         [_________________________________]
  Description          [_________________________________]
  Thrust Area *        [Customer Excellence ▾]
  Unit of Measurement  [Min Numeric ▾]
  Target Value *       [_________________________________]
  
Step 2: Select Recipients (shown below step 1, same drawer)
  "Select employees to receive this goal:"
  Search: [🔍 Search employees...]
  
  Scrollable employee list with checkboxes:
  [✓] Riya Sharma — Frontend Engineer
  [✓] Arun Kumar  — Backend Engineer
  [ ] Priya Nair  — QA Engineer
  
  Selected: 2 employees
  
  Note: "Recipients can adjust weightage. Title and Target are read-only."
  
  [Cancel]  [Push to 2 employees →]

On push:
  → Creates parent Goal record + SharedGoalAssignment for each recipient
  → Recipients see the goal in their "Shared Goals" section
  → Recipient notification sent (email + Teams stub)
  → Achievement by primary owner auto-syncs to all instances
```

---

## 6. ADMIN: GOAL UNLOCK WORKFLOW

```
Access via: Audit Log → any LOCKED goal row → "Unlock" action
            OR Admin → Goals overview → filter by LOCKED → Unlock

Unlock Panel (side drawer):
  Employee: Riya Sharma
  Goal: "Increase quarterly sales revenue by 20%"
  Locked on: May 15, 2026 by Manager: Amit Verma

  Reason for Unlock *  (required)
  [_______________________________________________]
  
  ⚠️ "Unlocking this goal will allow the employee to edit it.
       This action is logged in the audit trail."
  
  [Cancel]  [Confirm Unlock]

After unlock:
  → Goal status → APPROVED (editable again)
  → AuditLog entry created: who unlocked, when, reason
  → Employee notified by email
```

---

## 7. VALIDATION RULES (Server-side — enforce strictly)

```typescript
// POST /api/goals/submit validation:
async function validateGoalSubmission(employeeId: string, cycleId: string) {
  const goals = await prisma.goal.findMany({
    where: { employeeId, cycleId, status: { in: ["DRAFT", "RETURNED"] } }
  })

  const errors = []

  // Rule 1: At least 1 goal
  if (goals.length === 0) errors.push("You must have at least one goal")

  // Rule 2: Max 8 goals
  if (goals.length > 8) errors.push("Maximum 8 goals allowed per cycle")

  // Rule 3: Min 10% weightage each
  const underweight = goals.filter(g => g.weightage < 10)
  if (underweight.length > 0)
    errors.push(`${underweight.length} goal(s) have weightage below the minimum 10%`)

  // Rule 4: Total weightage = 100%
  const total = goals.reduce((sum, g) => sum + g.weightage, 0)
  if (Math.round(total) !== 100)
    errors.push(`Total weightage is ${total}%. Must equal exactly 100%.`)

  // Rule 5: Active cycle must be in GOAL_SETTING phase
  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } })
  if (cycle?.currentPhase !== "GOAL_SETTING")
    errors.push("Goal submission window is closed for this cycle")

  if (errors.length > 0) throw new ValidationError(errors)
}
```

---

## 8. DELIVERABLES FOR PHASE 2

- [ ] Employee goal sheet with draggable goal cards
- [ ] Live weightage calculator with color-coded summary bar
- [ ] All 6 UoM types handled correctly (TIMELINE date picker, ZERO note, etc.)
- [ ] Full client + server-side validation with clear error states
- [ ] Submit flow with success banner and read-only locked view
- [ ] Manager approval queue with sortable/filterable list
- [ ] Inline edit table with live weightage recalculation
- [ ] Approve flow with inline confirmation
- [ ] Return for rework with slide-up comment panel
- [ ] Shared goals push interface (side drawer)
- [ ] Recipient view of shared goals (read-only except weightage)
- [ ] Admin goal unlock with audit logging
- [ ] All post-lock edits automatically written to AuditLog



---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 3 — Achievement Tracking & Check-ins
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Overview
Build the quarterly achievement entry system for employees and the check-in module
for managers. Enforce the check-in schedule windows. Compute progress scores automatically
using the correct formulas for each UoM type.

---

## 1. NEW DATABASE MODELS

```prisma
model Achievement {
  id            String   @id @default(cuid())
  goalId        String
  goal          Goal     @relation(fields: [goalId], references: [id])
  cycleId       String
  quarter       Quarter
  actualValue   Float?   // for NUMERIC, PERCENT
  actualDate    DateTime? // for TIMELINE
  status        GoalProgressStatus @default(NOT_STARTED)
  computedScore Float?   // 0.0 to 1.0+ (stored as decimal, displayed as %)
  notes         String?  // employee self-notes
  loggedBy      String   // employeeId
  loggedAt      DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([goalId, quarter]) // one achievement record per goal per quarter
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
  quarter     Quarter
  comment     String   // structured manager comment (required to mark complete)
  completedAt DateTime @default(now())

  @@unique([managerId, employeeId, cycleId, quarter])
}
```

---

## 2. SCORING ENGINE

Implement as a pure function (used both server-side on save and client-side for preview):

```typescript
type UomType = 'MIN_NUMERIC' | 'MAX_NUMERIC' | 'MIN_PERCENT' | 'MAX_PERCENT' | 'TIMELINE' | 'ZERO'

interface ScoreInput {
  uomType: UomType
  targetValue?: number
  targetDate?: Date
  actualValue?: number
  actualDate?: Date
  goalCreatedAt?: Date // used as timeline start
}

function computeScore(input: ScoreInput): number | null {
  const { uomType, targetValue, targetDate, actualValue, actualDate } = input

  switch (uomType) {
    case 'MIN_NUMERIC':
    case 'MIN_PERCENT':
      // Higher actual = better; Achievement ÷ Target
      if (!targetValue || !actualValue || targetValue === 0) return null
      return Math.min(actualValue / targetValue, 2) // cap at 200% to prevent outliers
      
    case 'MAX_NUMERIC':
    case 'MAX_PERCENT':
      // Lower actual = better; Target ÷ Achievement
      if (!targetValue || !actualValue || actualValue === 0) return null
      return Math.min(targetValue / actualValue, 2)
      
    case 'TIMELINE':
      // On or before deadline = 100%
      // Past deadline = partial score based on overshoot
      if (!targetDate || !actualDate) return null
      if (actualDate <= targetDate) return 1.0
      // Penalty: score decreases by 10% per week past deadline
      const daysLate = (actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)
      return Math.max(0, 1 - (daysLate / 7) * 0.1)
      
    case 'ZERO':
      if (actualValue === undefined || actualValue === null) return null
      return actualValue === 0 ? 1.0 : 0.0
      
    default:
      return null
  }
}

// Display helper: score → percentage string with color
function formatScore(score: number | null): { label: string; color: string } {
  if (score === null) return { label: '—', color: 'text-muted' }
  const pct = Math.round(score * 100)
  if (pct >= 100) return { label: `${pct}%`, color: 'text-success' }
  if (pct >= 75)  return { label: `${pct}%`, color: 'text-info' }
  if (pct >= 50)  return { label: `${pct}%`, color: 'text-warning' }
  return { label: `${pct}%`, color: 'text-danger' }
}
```

---

## 3. API ROUTES — PHASE 3 SCOPE

```
# Employee: Achievement Entry
GET  /api/achievements                      — my achievements for active cycle
POST /api/achievements                      — create/update achievement for a quarter
                                              (upsert by goalId + quarter)
                                              → auto-computes score server-side
                                              → auto-syncs to shared goal instances

# Window Enforcement (used by frontend + backend)
GET  /api/cycles/active/window              — returns current quarter + window open/close dates
                                              { phase: 'Q1_CHECKIN', opens: Date, closes: Date, isOpen: boolean }

# Manager: Check-in
GET  /api/manager/checkin-status            — list team members + their check-in status per quarter
GET  /api/manager/checkin/:employeeId       — employee's goal achievement data for current quarter
POST /api/manager/checkin/:employeeId       — submit check-in comment (marks session complete)
GET  /api/manager/checkin/:employeeId/history — all past check-in comments

# Shared Goal Sync (internal, triggered on achievement save)
POST /api/internal/sync-shared-achievement  — copies actualValue from parent → all linked instances
```

---

## 4. EMPLOYEE: ACHIEVEMENT PAGE (`/employee/check-ins`)

### Page Header:
```
Title: "Q1 Check-in · July 2026"
Subtitle: "Log your actual achievements against your planned targets"

Phase banner (if window is OPEN):
┌─────────────────────────────────────────────────────────────────────┐
│  ● Q1 Check-in Window Open  ·  Closes July 31, 2026               │
│  Submit your progress for all goals before the window closes.      │
└─────────────────────────────────────────────────────────────────────┘

Phase banner (if window is CLOSED):
┌─────────────────────────────────────────────────────────────────────┐
│  ⏸  Q1 Check-in Window Closed  ·  Next window: Q2 (October 2026)  │
│  Achievement updates are not available outside check-in windows.   │
└─────────────────────────────────────────────────────────────────────┘
```

### Quarter Tabs:
```
[Goal Setting ✓]  [Q1 ●]  [Q2 —]  [Q3 —]  [Q4 —]

Each tab shows:
  ✓ = complete (all goals have achievement logged)
  ● = current/active window
  — = upcoming or locked
```

### Achievement Entry Cards (per goal, window OPEN):
```
┌───────────────────────────────────────────────────────────────────────┐
│ [Thrust Area Badge: Customer Excellence]         [ON TRACK ●]        │
│                                                                        │
│ Increase quarterly sales revenue by 20%                               │
│ Min Numeric · Target: 120 Units                                        │
│                                                                        │
│ ── Actual Achievement ────────────────────────────────────────────── │
│ Actual Value *              Status                                     │
│ [_________] Units           [On Track ▾]                              │
│                                                                        │
│ Notes (optional)                                                       │
│ [______________________________________________]                       │
│                                                                        │
│ ── Score Preview ─────────────────────────────────────────────────── │
│ [████████████░░░] 87%  ·  "Achievement ÷ Target = 104 ÷ 120 = 87%"  │
│ (score updates live as user types actual value)                        │
│                                                                        │
│ Shared Goal: Achievement entered here will sync to 2 other employees  │
│ [👁 ⚠️ note shown only for shared goal primary owners]               │
└───────────────────────────────────────────────────────────────────────┘
```

**Goal-specific input variations:**
```
TIMELINE goals:
  Show: "Target Deadline: June 30, 2026"
  Input: Date picker "Actual Completion Date"
  Score preview: "Completed 3 days early → 100%"  OR  "5 days late → 93%"

ZERO goals:
  Show: "Target: Zero incidents"
  Input: Number input "Actual count"  
  Score: Green "✓ 0 incidents — Goal achieved (100%)" if = 0
         Red "✗ [N] incidents recorded — Goal not achieved (0%)" if > 0

MIN/MAX PERCENT goals:
  Input: Show % symbol suffix in the input field
  Score formula label updated accordingly
```

**Window CLOSED state:**
- All inputs are `disabled` (visually grayed, not just pointer-events-none)
- Score still shows from previously saved data
- "Saved on July 28" timestamp shown below each card
- No save button visible

### Save Behavior:
```
Auto-save on blur (each field, 500ms debounce):
  - Show "Saving..." spinner in card header
  - "Saved" with checkmark on success
  - "Failed to save" with retry button on error

Manual "Save All" button at bottom of page:
  - Saves all unsaved changes at once
  - Shows count: "3 goals saved"
  - Only visible if there are unsaved changes
```

### Achievement Summary (bottom of page):
```
┌────────────────────────────────────────────────────────────────────┐
│  Q1 Summary · 6 goals                                              │
│                                                                     │
│  Completed: 2    On Track: 3    Not Started: 1                     │
│                                                                     │
│  Overall Weighted Score:  [████████████░░░░] 78%                   │
│  (weighted by each goal's weightage %)                              │
│                                                                     │
│  "This is a progress indicator, not a performance rating."         │
│  (shown in muted text, smaller — important disclaimer per BRD)     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 5. MANAGER: CHECK-IN MODULE (`/manager/team-check-ins`)

### Check-in Dashboard:
```
Page Header: "Team Check-ins · Q1 · July 2026"
Subtitle: "Review your team's progress and log structured feedback"

Stats row:
  [6 Team Members]  [4 Check-ins Due]  [2 Completed]  [Window Closes July 31]

Filter bar: [All Statuses ▾] [Sort by Name / Urgency ▾]

Team Member Cards:
┌────────────────────────────────────────────────────────────────────┐
│  [Avatar] Riya Sharma · Senior Engineer                            │
│           6 goals · Avg Score: 82% · Last updated: 2 days ago     │
│                                                                     │
│  [██████████████░░] 82%  — On Track                               │
│                                                                     │
│  Check-in Status: [PENDING]            [Start Check-in →]         │
└────────────────────────────────────────────────────────────────────┘

Completed check-in (same card):
  Check-in Status: [DONE ✓]              [View / Edit →]
  "Commented July 15 by you"
```

### Check-in Detail Page (`/manager/team-check-ins/[employeeId]`):

**Layout: Two-column**
```
LEFT COLUMN (55%): Goal Achievement Table
RIGHT COLUMN (45%): Check-in Comment + History
```

**Left — Achievement Table:**
```
Columns: Goal Title | UoM | Target | Actual | Score | Status

Each row:
  - Score shown as colored percentage + mini bar
  - Status badge (Not Started / On Track / Completed)
  - Manager is READ-ONLY here (cannot change actuals)
  - Expand row to see employee notes

Table footer:
  Overall Weighted Score: 78%  (recalculated from table data)
```

**Right — Check-in Comment Panel:**
```
"Q1 Check-in Feedback"

If no comment yet:
  ┌──────────────────────────────────────────────────────────────┐
  │  Write your structured feedback for Riya:                    │
  │                                                              │
  │  [______________________________________________________]   │
  │  [______________________________________________________]   │
  │  [______________________________________________________]   │
  │                                                              │
  │  Suggested structure (collapsible helper):                   │
  │  • Progress highlights                                       │
  │  • Areas needing attention                                   │
  │  • Actions / support needed from you                        │
  │                                                              │
  │  [Save Draft]                [Mark Check-in Complete ✓]    │
  └──────────────────────────────────────────────────────────────┘

"Mark Check-in Complete" is a deliberate action:
  → Requires comment to be non-empty (server validates)
  → Shows confirmation: "Mark Q1 check-in as complete for Riya?"
  → On confirm: CheckinSession created, card marked DONE, 
    employee notified, disappears from pending list

Past Check-in History (below comment):
  "Previous Check-ins"
  ┌────────────────────────────────────────────────────┐
  │ Q4 2025 · Commented Dec 20                         │
  │ "Riya delivered strong results on the..."          │
  │ [Read more]                                        │
  └────────────────────────────────────────────────────┘
```

---

## 6. WINDOW ENFORCEMENT LOGIC

Implement as a shared utility used on all achievement/check-in pages:

```typescript
interface CycleWindow {
  phase: CyclePhase
  isOpen: boolean
  opensAt: Date
  closesAt: Date    // calculated as next phase open date - 1 day
  quarterLabel: string  // "Q1", "Q2", etc.
  daysRemaining: number | null
}

function getCycleWindow(cycle: Cycle): CycleWindow {
  const now = new Date()
  
  const phases = [
    { phase: 'GOAL_SETTING', opens: cycle.goalSettingOpen, label: 'Goal Setting' },
    { phase: 'Q1_CHECKIN',   opens: cycle.q1Open, label: 'Q1' },
    { phase: 'Q2_CHECKIN',   opens: cycle.q2Open, label: 'Q2' },
    { phase: 'Q3_CHECKIN',   opens: cycle.q3Open, label: 'Q3' },
    { phase: 'Q4_ANNUAL',    opens: cycle.q4Open, label: 'Q4' },
  ]
  
  // Find current phase (latest phase whose opens date has passed)
  // Calculate closes = next phase opens - 1 day
  // Return full window object
}
```

Frontend usage:
```tsx
// In any achievement component:
const { isOpen, daysRemaining, closesAt } = useCycleWindow()

// Show countdown if window is open and closing within 7 days:
if (isOpen && daysRemaining <= 7) {
  return <WarningBanner>
    ⚠️ Window closes in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
  </WarningBanner>
}
```

---

## 7. SHARED GOAL ACHIEVEMENT SYNC

On every achievement save where `goal.isSharedGoal && goal.sharedFromGoalId === null`:
(i.e., this is the PRIMARY owner saving)

```typescript
async function syncSharedAchievements(parentGoalId: string, quarter: Quarter, actualValue: number | null, actualDate: Date | null) {
  // Find all linked shared instances
  const linkedGoals = await prisma.goal.findMany({
    where: { sharedFromGoalId: parentGoalId }
  })

  // Upsert achievement for each linked goal with the same actual value
  await Promise.all(linkedGoals.map(goal =>
    prisma.achievement.upsert({
      where: { goalId_quarter: { goalId: goal.id, quarter } },
      update: { actualValue, actualDate, loggedAt: new Date() },
      create: {
        goalId: goal.id,
        cycleId: goal.cycleId,
        quarter,
        actualValue,
        actualDate,
        loggedBy: 'SYSTEM_SYNC',
        status: 'ON_TRACK',
      }
    })
  ))
}
```

Recipient employees see a subtle "Synced" chip on shared goal achievement:
```
[Synced from Riya Sharma ·  Primary Owner]
(italics, text-muted, with a sync icon — makes it clear they didn't enter this)
```

---

## 8. COMPLETE ACHIEVEMENT PAGE STATES

Handle all 6 possible page states gracefully:

```
State 1: GOAL_SETTING phase
  → "Achievements will be available from July 2026 (Q1 Check-in)"
  → Show goal list (read-only) for reference

State 2: Q1 window OPEN, no entries yet
  → Show all goal cards with empty inputs, ready to fill
  → "Get started — log your Q1 progress" prompt

State 3: Q1 window OPEN, partial entries
  → Show saved data in inputs (pre-filled)
  → "X goals remaining" reminder banner

State 4: Q1 window OPEN, all entries saved
  → Green success banner "All goals updated"
  → Show summary block

State 5: Q1 window CLOSED, entries exist
  → Read-only view with all saved data and scores
  → "Submitted on [date]" timestamp

State 6: Q1 window CLOSED, no entries made (missed window)
  → Amber warning: "Q1 Check-in window closed. No achievements were logged."
  → "Contact your manager if you need to update entries"
```

---

## 9. ADMIN: COMPLETION DASHBOARD

Build `/admin/completion` (used in Phase 4 reporting but start the data model here):

```
Real-time grid:

Rows: employees
Columns: Goal Setting | Q1 | Q2 | Q3 | Q4

Each cell:
  ✓  green    = complete (achievement saved + manager check-in done)
  ◑  yellow   = partial (achievement saved, no manager comment yet)
  ●  blue     = window open (in progress)
  ✕  red      = missed (window closed, no entry)
  —  gray     = upcoming
```

---

## 10. DELIVERABLES FOR PHASE 3

- [ ] Achievement entry page with all 6 UoM input variations
- [ ] Live score preview (updates as user types actual value)
- [ ] Auto-save on blur with "Saving..." / "Saved" / "Failed" states
- [ ] Shared goal achievement sync (primary owner → all recipients)
- [ ] "Synced" indicator on recipient achievement cards
- [ ] Window enforcement: open vs. closed states handled correctly
- [ ] Countdown warning when window closes within 7 days
- [ ] Q1–Q4 quarter tabs with completion indicators
- [ ] Overall weighted score summary card (with disclaimer)
- [ ] Manager check-in dashboard with team status grid
- [ ] Check-in detail: two-column layout (achievements + comment)
- [ ] "Mark Complete" action with comment required validation
- [ ] Past check-in history thread
- [ ] All 6 page states handled (see section 8)
- [ ] Admin completion dashboard grid (cells with ✓/◑/●/✕/—)
```


---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 4 — Reporting, Exports, Audit Trail & Governance
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Overview
Build the reporting, data export, governance, and audit infrastructure on top of Phases 1–3.
This phase is about giving managers and admins clarity and control — rich filterable tables,
one-click exports, a real-time completion grid, and a tamper-proof audit trail.
Every screen must feel as polished as the rest of the app.

---

## 1. NO NEW DATABASE MODELS REQUIRED
All data lives in existing tables (Goals, Achievements, CheckinSession, AuditLog).
Phase 4 is purely read-heavy with one new write operation: the admin exception (bulk exempt).

Add one field to AuditLog if not already present:
```prisma
model AuditLog {
  // ... existing fields ...
  reason    String?   // required for UNLOCK actions
  isPostLock Boolean  @default(false)  // flag for changes after goal.lockedAt
}
```

Add one new model:
```prisma
model ExemptionRecord {
  id          String   @id @default(cuid())
  employeeId  String
  employee    User     @relation(fields: [employeeId], references: [id])
  cycleId     String
  quarter     Quarter?   // null = exempt for entire cycle
  reason      String
  grantedById String
  grantedBy   User     @relation("ExemptionGranter", fields: [grantedById], references: [id])
  grantedAt   DateTime @default(now())
}
```

---

## 2. API ROUTES — PHASE 4 SCOPE

```
# Reports
GET  /api/reports/achievement          — Filterable achievement report
     ?departmentId=&managerId=&quarter=&cycleId=&status=&page=&limit=
GET  /api/reports/achievement/export   — Same filters → returns CSV or XLSX
     ?format=csv|xlsx

GET  /api/reports/completion           — Completion grid data
     ?cycleId=&departmentId=&managerId=
GET  /api/reports/completion/export    — Export as XLSX

# Audit
GET  /api/audit                        — Paginated audit log
     ?userId=&entityType=&dateFrom=&dateTo=&postLockOnly=true&page=&limit=
GET  /api/audit/export                 — Export filtered audit log as CSV

# Admin Exception
POST /api/admin/exempt                 — Mark employee(s) exempt from escalation
     body: { employeeIds[], cycleId, quarter?, reason }
GET  /api/admin/exempt                 — List all exemptions

# Admin Unlock (from Phase 2, extended here with reason enforcement)
POST /api/admin/goals/:goalId/unlock   — already exists; enforce reason field non-null
```

---

## 3. ACHIEVEMENT REPORT PAGE (`/reports/achievement`)

### Page Header:
```
Title: "Achievement Report"
Subtitle: "FY 2026 · All Goals · All Quarters"

Export bar (top-right):
  [↓ Export CSV]  [↓ Export Excel]
  (both buttons trigger download immediately with current filters applied)
```

### Filter Bar:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔍 Search employee or goal...   [Department ▾]  [Manager ▾]           │
│  [Quarter ▾]  [Status ▾]  [Thrust Area ▾]  [UoM Type ▾]  [Reset all] │
└─────────────────────────────────────────────────────────────────────────┘

Filter chips: active filters shown as removable chips below the bar
  e.g., [Q1 ×]  [Customer Excellence ×]  [On Track ×]
```

### Report Table:
```
Columns:
  Employee          — Avatar + Name + Department (two lines)
  Goal Title        — with description on expand
  Thrust Area       — colored badge
  UoM               — chip
  Target            — formatted (number or date)
  Actual            — formatted; red if blank
  Score             — colored percentage + mini bar (see scoring colors from Phase 3)
  Status            — badge (Not Started / On Track / Completed)
  Quarter           — Q1 / Q2 / Q3 / Q4
  Manager           — name

Table features:
  - Sortable by clicking any column header
    Active sort: underlined header + ↑↓ icon in accent color
  - Row expand: click row → accordion below shows goal description + employee notes + manager check-in comment
  - Sticky header row (scrolls with content, header stays fixed)
  - Virtual scrolling for large datasets (react-window or tanstack virtual)
  - Pagination: 25 / 50 / 100 rows per page selector + prev/next
  - Row hover: bg-bg-elevated transition 120ms
  - Zebra striping: optional toggle in top-right (off by default)

Empty state (no results match filters):
  Centered SVG illustration of an empty folder
  "No results match your filters"
  [Clear all filters] button
```

### Export Behavior:
```typescript
// GET /api/reports/achievement/export?format=xlsx
// Server generates the file using ExcelJS:

const workbook = new ExcelJS.Workbook()
const sheet = workbook.addWorksheet('Achievement Report')

// Header row styling:
sheet.getRow(1).values = ['Employee', 'Department', 'Goal Title', 'Thrust Area', 'UoM', 'Target', 'Actual', 'Score (%)', 'Status', 'Quarter', 'Manager']
sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } }

// Column widths auto-fitted
// Freeze top row (sheet.views = [{ state: 'frozen', ySplit: 1 }])
// Score column: conditional formatting — red < 50%, yellow 50–75%, green ≥ 100%
// Return as application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// Content-Disposition: attachment; filename="AtomQuest_Achievement_Report_Q1_2026.xlsx"
```

Manager scope enforcement (server-side):
```typescript
// If requester is MANAGER, inject a where clause:
where: { goal: { employee: { managerId: session.user.id } } }
// ADMIN sees all org data
```

---

## 4. COMPLETION DASHBOARD (`/reports/completion`)

This is the most visually dense screen in the app. Design it carefully.

### Page Header:
```
Title: "Completion Dashboard"
Subtitle: "Real-time check-in status across your team · FY 2026"

Controls (top-right):
  [Department ▾]  [Manager ▾]  [↓ Export Excel]
```

### Summary Stats Row:
```
┌──────────────┐ ┌────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  28           │ │  19 / 28       │ │  6 / 28          │ │  Q1 · Active     │
│  Total        │ │  Goal Setting  │ │  Q1 Check-in     │ │  Closes Jul 31   │
│  Employees    │ │  Complete      │ │  Complete        │ │                  │
└──────────────┘ └────────────────┘ └──────────────────┘ └──────────────────┘
```

### Completion Grid:
```
Columns: Employee | Goal Setting | Q1 | Q2 | Q3 | Q4 | Manager Check-in Q1

Row per employee:
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Av] Riya Sharma      │  ✓ green  │  ◑ yellow │  ─ gray │  ─ gray │  ✓ green │
│      Sr. Engineer     │           │           │         │         │          │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Av] Arun Kumar       │  ✓ green  │  ✕ red    │  ─ gray │  ─ gray │  ─ gray  │
│      Backend Eng      │           │           │         │         │          │
└──────────────────────────────────────────────────────────────────────────────┘

Cell legend (shown as a small legend at top-right of grid):
  ✓  Complete       (bg-success-subtle, text-success)
  ◑  In Progress    (bg-warning-subtle, text-warning)
  ●  Window Open    (bg-info-subtle, text-info, pulsing dot)
  ✕  Missed         (bg-danger-subtle, text-danger)
  ─  Upcoming       (bg-bg-elevated, text-muted)
  ~  Exempt         (bg-bg-overlay, text-muted, italic)

Cell tooltip (hover):
  ✓  "Goals submitted May 10. Manager approved May 12."
  ◑  "3/6 goals have achievements logged."
  ✕  "Q1 window closed July 31 — no entry made."
  ~  "Exempt — granted by Admin on May 5. Reason: Parental Leave"

Row hover: highlight entire row bg-bg-elevated

Click any non-complete cell → side drawer opens with:
  Employee details + that phase's status + quick action (e.g. "Send Reminder")
```

### Manager Check-in Column (rightmost):
```
Separate column per quarter: "Mgr Q1", "Mgr Q2" etc.
  ✓ green  = manager has submitted check-in comment
  ✕ red    = window closed, no comment
  ● blue   = window open, comment pending
```

### Export (XLSX):
```
Same grid exported to Excel with color-coded cells using ExcelJS conditional formatting.
Each cell: text value (Complete / In Progress / Missed / Upcoming / Exempt) + background fill.
Sheet tab per quarter if desired.
```

---

## 5. AUDIT TRAIL PAGE (`/admin/audit`)

### Page Header:
```
Title: "Audit Trail"
Subtitle: "All system changes, post-lock edits, and admin actions"

⚠️ Info banner:
  "Post-lock changes are automatically flagged. All entries are immutable."
  
Controls (top-right):
  [↓ Export CSV]
```

### Filter Bar:
```
[🔍 Search by user or entity...]  [Action Type ▾]  [Entity Type ▾]
[Date From]  [Date To]  [Post-Lock Only toggle]
```

### Audit Table:
```
Columns:
  Timestamp      — full date + time, monospace font
  User           — Avatar + name (who made the change)
  Action         — badge: UNLOCK / EDIT_POST_LOCK / APPROVE / RETURN / CREATE / DELETE
  Entity         — type + linked name (e.g., "Goal: Increase Sales Revenue Q1")
  Changed Field  — e.g., "targetValue"  (shown only for EDIT actions)
  Old Value      — monospace, text-danger if changed
  New Value      — monospace, text-success if changed
  Reason         — shown for UNLOCK actions
  Post-Lock?     — red ⚠️ flag icon if isPostLock = true

Row details (expand):
  Full JSON diff of old vs. new values
  Side-by-side: OLD (red background cells) | NEW (green background cells)
  Like a git diff view — visually clear what changed

Post-lock entries highlighted:
  Entire row: faint red-tinted background (danger-subtle at 40% opacity)
  "POST-LOCK" chip in the action cell

Pagination: 50 rows per page, with total count shown
```

### Export (CSV):
```
Headers: Timestamp, User Email, User Name, Action, Entity Type, Entity ID,
         Entity Name, Changed Field, Old Value, New Value, Reason, Post-Lock
All timestamps in ISO 8601 format
All values as plain text (JSON stringified if objects)
```

---

## 6. ADMIN EXCEPTION MANAGEMENT

### Exception Panel (`/admin/exceptions`):

```
Title: "Goal Exceptions"
Subtitle: "Exempt employees from escalation rules or unlock goals"

Two tabs:
  [Exemptions]  [Goal Unlocks]

── EXEMPTIONS TAB ──────────────────────────────────────────────────────

Description: "Exempted employees are excluded from automated escalation notifications
              and overdue flags in the completion dashboard."

[+ Grant Exemption] button → opens side drawer:

  Side Drawer: "Grant Exemption"
  ┌────────────────────────────────────────────────────────────────────┐
  │  Select Employees *   (multi-select searchable)                    │
  │  [🔍 Search employees...]                                          │
  │  [✓] Riya Sharma   [✓] Priya Nair                                 │
  │                                                                    │
  │  Applies to *                                                      │
  │  (●) Entire Cycle    ( ) Specific Quarter [Q1 ▾]                  │
  │                                                                    │
  │  Reason *  (required, min 10 chars)                               │
  │  [________________________________________________]               │
  │                                                                    │
  │  ⚠️ "This action is logged. Exempt employees will show '~' in     │
  │     the completion dashboard and be skipped by escalations."       │
  │                                                                    │
  │  [Cancel]           [Grant Exemption for 2 employees →]           │
  └────────────────────────────────────────────────────────────────────┘

Exemptions table:
  Columns: Employee | Cycle | Quarter | Reason | Granted By | Date | [Revoke]

Revoke: inline confirmation → removes ExemptionRecord, re-enables escalation

── GOAL UNLOCKS TAB ────────────────────────────────────────────────────

Shows all LOCKED goals with a search + filter.
Each row: Employee | Goal Title | Locked On | Locked By | [Unlock]

Unlock flow: same side drawer as described in Phase 2, with reason field.
Logged to AuditLog with isPostLock = true.
```

---

## 7. UI DESIGN SPECIFICS FOR PHASE 4

### Report Table Design:
```
The achievement report table is information-dense — treat it like Notion's database view
or Linear's issue list: ultra-compact rows but every detail accessible on demand.

Row height: 48px (comfortable but not wasteful)
Font: DM Sans 13px for data, 11px for metadata
Column header: 11px uppercase, letter-spacing 0.08em, text-muted

Score column:
  Mini bar: width 60px, height 4px, inside the cell to the left of the percentage
  Color: matches scoring level (see Phase 3 formatting)

Expand row (accordion):
  Slides open below the row (not a modal)
  Shows: Goal Description | Employee Notes | Manager Check-in Comment
  Background: bg-bg-elevated
  Transition: 200ms height animation (Framer Motion AnimatePresence)
```

### Completion Grid Design:
```
This is the most complex UI in Phase 4. Treat it like a heatmap calendar.

Grid cell: 80px × 48px
Cell content: centered icon + short label (two lines)

Sticky behavior:
  Employee name column: sticky left (position: sticky, left: 0, z-index: 10)
  Column headers: sticky top
  Both sticky simultaneously for large tables

Row grouping (optional, recommended for admin view):
  Group rows by department with a collapsible section header
  "Engineering (12)"  [collapse ▾]

Color scale for the grid:
  Use subtle, non-garish versions of success/warning/danger colors
  Avoid pure green/red — use the semantic tokens from the design system
  The grid should read as a status overview, not a traffic light factory
```

### Audit Trail Design:
```
The audit trail must feel authoritative and tamper-proof — like a ledger.

Use a slightly different typographic treatment here vs. other tables:
  Monospace font (JetBrains Mono) for: Timestamp, Old Value, New Value
  This signals "this is system-recorded data, not human-authored content"

Post-lock row:
  Left border: 3px solid var(--danger)
  Background: rgba(239,68,68,0.04)  — barely visible, just enough to signal attention

JSON diff view (row expand):
  Two-column layout:
  Left: OLD VALUE  — red text on very dark red bg (#1A0A0A)
  Right: NEW VALUE — green text on very dark green bg (#0A1A0A)
  Monospace, 12px
  Rounded corners, border on each diff block
  If value is a JSON object, pretty-print it (JSON.stringify with indent:2)
```

---

## 8. MIDDLEWARE: AUTO AUDIT LOGGING

Implement as Prisma middleware — every write to Goal after lock triggers AuditLog:

```typescript
// prisma/middleware/auditMiddleware.ts
export function auditMiddleware(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    // Only intercept Goal updates
    if (params.model === 'Goal' && params.action === 'update') {
      const before = await prisma.goal.findUnique({
        where: params.args.where
      })

      const result = await next(params)

      const after = await prisma.goal.findUnique({
        where: params.args.where
      })

      const isPostLock = !!before?.lockedAt

      // Log every changed field individually for granular audit trail
      if (before && after) {
        const changedFields = Object.keys(params.args.data)
        await Promise.all(
          changedFields.map(field =>
            prisma.auditLog.create({
              data: {
                userId: getCurrentUserId(), // from AsyncLocalStorage context
                entityType: 'Goal',
                entityId: after.id,
                action: isPostLock ? 'EDIT_POST_LOCK' : 'EDIT',
                oldValue: { [field]: (before as any)[field] },
                newValue: { [field]: (after as any)[field] },
                isPostLock,
              }
            })
          )
        )
      }

      return result
    }

    return next(params)
  })
}
```

Pass userId via AsyncLocalStorage (set in API middleware before any DB call):
```typescript
// src/lib/context.ts
import { AsyncLocalStorage } from 'async_hooks'
export const requestContext = new AsyncLocalStorage<{ userId: string }>()

// In API route handler:
requestContext.run({ userId: session.user.id }, async () => {
  await prisma.goal.update(...)
})
```

---

## 9. DELIVERABLES FOR PHASE 4

- [ ] Achievement report page with all filter combinations working
- [ ] Sortable, expandable table rows with manager-scope enforcement
- [ ] CSV and XLSX export (with styled headers + conditional score formatting)
- [ ] Completion grid with ✓ / ◑ / ● / ✕ / ─ / ~ cells and hover tooltips
- [ ] Sticky employee column + sticky header in completion grid
- [ ] Manager check-in columns in the completion grid
- [ ] Audit trail table with monospace values + post-lock row highlighting
- [ ] Audit JSON diff view (row expand with two-column old/new)
- [ ] CSV export of audit trail
- [ ] ExemptionRecord model + grant/revoke exemption UI
- [ ] Goal Unlock tab with full search/filter + side drawer
- [ ] Prisma middleware auto-logging for post-lock edits
- [ ] AsyncLocalStorage userId propagation for server-side audit attribution



---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 5 — Escalations, Notifications, Analytics (Bonus)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Overview
Implement the three bonus modules from Section 5 of the BRD:
(5.1) Rule-based escalation engine with admin visibility
(5.2) Email + Microsoft Teams notification service
(5.3) Analytics dashboard with 4 chart types

All features must be feature-flag-gated via env vars so the app runs cleanly
without external credentials configured. The UI must degrade gracefully when
features are disabled — show a tasteful "Not configured" empty state, not a crash.

---

## 1. DATABASE MODELS

```prisma
model EscalationRule {
  id               String   @id @default(cuid())
  name             String   // "Goal Submission Overdue" etc.
  ruleType         EscalationType
  thresholdDays    Int      // N days before first escalation fires
  repeatDays       Int      @default(3)  // escalate again every N days
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  logs             EscalationLog[]
}

enum EscalationType {
  GOAL_SUBMISSION_OVERDUE    // employee hasn't submitted goals
  MANAGER_APPROVAL_OVERDUE   // manager hasn't approved submitted goals
  CHECKIN_MISSING            // employee hasn't logged achievements
  MANAGER_CHECKIN_MISSING    // manager hasn't submitted check-in comment
}

model EscalationLog {
  id              String           @id @default(cuid())
  ruleId          String
  rule            EscalationRule   @relation(fields: [ruleId], references: [id])
  targetUserId    String           // who the escalation is about
  targetUser      User             @relation("EscalationTarget", fields: [targetUserId], references: [id])
  notifiedChain   Json             // [{ userId, role, notifiedAt, channel }]
  level           Int              // 1 = first notify, 2 = skip-level, 3 = HR
  resolvedAt      DateTime?
  resolvedBy      String?
  triggeredAt     DateTime         @default(now())
}

model NotificationLog {
  id          String   @id @default(cuid())
  recipientId String
  channel     NotificationChannel
  template    String
  subject     String?
  body        String
  status      NotificationStatus @default(PENDING)
  sentAt      DateTime?
  error       String?
  createdAt   DateTime @default(now())
}

enum NotificationChannel {
  EMAIL
  TEAMS
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
}
```

---

## 2. ESCALATION ENGINE

### Architecture:
```
Cron job runs daily at 8:00 AM IST (use node-cron or Vercel Cron)
On each run:
  1. Load all active EscalationRules
  2. For each rule, find all "at-risk" users (business logic below)
  3. For each at-risk user, check if already escalated at this level
  4. If not escalated yet → fire notification chain → create EscalationLog
  5. If already escalated and repeatDays elapsed → fire next level
  6. If goal/check-in now complete → mark EscalationLog.resolvedAt
```

### Business Logic per Rule Type:
```typescript
async function getAtRiskUsers(rule: EscalationRule, cycle: Cycle): Promise<EscalationTarget[]> {
  const now = new Date()
  const threshold = rule.thresholdDays

  switch (rule.ruleType) {

    case 'GOAL_SUBMISSION_OVERDUE': {
      // Employee has not submitted goals within N days of cycle opening
      const cycleOpenDate = cycle.goalSettingOpen
      const daysOpen = daysBetween(cycleOpenDate, now)
      if (daysOpen < threshold) return []  // not overdue yet

      // Find employees with no goals in SUBMITTED/APPROVED/LOCKED status
      return prisma.user.findMany({
        where: {
          role: 'EMPLOYEE',
          goals: {
            none: {
              cycleId: cycle.id,
              status: { in: ['SUBMITTED', 'APPROVED', 'LOCKED'] }
            }
          },
          // Not exempt
          exemptions: { none: { cycleId: cycle.id, quarter: null } }
        }
      })
    }

    case 'MANAGER_APPROVAL_OVERDUE': {
      // Manager has pending submissions older than N days
      const cutoff = subDays(now, threshold)
      return prisma.user.findMany({
        where: {
          role: 'MANAGER',
          reports: {
            some: {
              goals: {
                some: {
                  cycleId: cycle.id,
                  status: 'SUBMITTED',
                  updatedAt: { lt: cutoff }
                }
              }
            }
          }
        }
      })
    }

    case 'CHECKIN_MISSING': {
      // Employee has not logged any achievements for current quarter
      // Only relevant if check-in window is currently open
      if (cycle.currentPhase === 'GOAL_SETTING' || cycle.currentPhase === 'CLOSED') return []
      const currentQuarter = phaseToQuarter(cycle.currentPhase)
      const windowOpen = getWindowOpenDate(cycle, currentQuarter)
      const daysOpen = daysBetween(windowOpen, now)
      if (daysOpen < threshold) return []

      return prisma.user.findMany({
        where: {
          role: 'EMPLOYEE',
          goals: {
            some: {
              cycleId: cycle.id,
              status: 'LOCKED',
              achievements: { none: { quarter: currentQuarter } }
            }
          },
          exemptions: {
            none: { cycleId: cycle.id, quarter: currentQuarter }
          }
        }
      })
    }

    case 'MANAGER_CHECKIN_MISSING': {
      // Same logic but for CheckinSession
      if (cycle.currentPhase === 'GOAL_SETTING') return []
      const currentQuarter = phaseToQuarter(cycle.currentPhase)
      const windowOpen = getWindowOpenDate(cycle, currentQuarter)
      const daysOpen = daysBetween(windowOpen, now)
      if (daysOpen < threshold) return []

      return prisma.user.findMany({
        where: {
          role: 'MANAGER',
          reports: {
            some: {
              goals: { some: { cycleId: cycle.id, status: 'LOCKED' } },
              checkinSessions: { none: { cycleId: cycle.id, quarter: currentQuarter } }
            }
          }
        }
      })
    }
  }
}
```

### Notification Chain (Level 1 → 2 → 3):
```typescript
const ESCALATION_CHAIN = {
  GOAL_SUBMISSION_OVERDUE: [
    { level: 1, notifyRole: 'self',       delayDays: 0 },
    { level: 2, notifyRole: 'manager',    delayDays: 3 },
    { level: 3, notifyRole: 'hr_admin',   delayDays: 7 },
  ],
  MANAGER_APPROVAL_OVERDUE: [
    { level: 1, notifyRole: 'self',         delayDays: 0 },
    { level: 2, notifyRole: 'skip_level',   delayDays: 3 },
    { level: 3, notifyRole: 'hr_admin',     delayDays: 5 },
  ],
  CHECKIN_MISSING: [
    { level: 1, notifyRole: 'self',       delayDays: 0 },
    { level: 2, notifyRole: 'manager',    delayDays: 3 },
  ],
  MANAGER_CHECKIN_MISSING: [
    { level: 1, notifyRole: 'self',       delayDays: 0 },
    { level: 2, notifyRole: 'skip_level', delayDays: 3 },
    { level: 3, notifyRole: 'hr_admin',   delayDays: 5 },
  ],
}
```

---

## 3. NOTIFICATION SERVICE (5.2)

### Architecture:
```typescript
// src/lib/notifications/notificationService.ts

interface NotificationPayload {
  channel: 'EMAIL' | 'TEAMS'
  recipientId: string
  template: NotificationTemplate
  data: Record<string, string | number>
}

type NotificationTemplate =
  | 'goal_submitted'
  | 'goal_approved'
  | 'goal_returned'
  | 'checkin_reminder'
  | 'window_opening'
  | 'escalation_level1'
  | 'escalation_level2'
  | 'escalation_level3'
  | 'goal_unlocked'
  | 'shared_goal_received'

class NotificationService {
  async send(payload: NotificationPayload): Promise<void> {
    const log = await this.createLog(payload)

    try {
      if (payload.channel === 'EMAIL' && process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true') {
        await this.sendEmail(payload)
      } else if (payload.channel === 'TEAMS' && process.env.NOTIFICATIONS_TEAMS_ENABLED === 'true') {
        await this.sendTeams(payload)
      }
      await this.markSent(log.id)
    } catch (err) {
      await this.markFailed(log.id, err.message)
    }
  }
}

export const notificationService = new NotificationService()
```

### Email Templates (HTML):
Build responsive HTML email templates for each of the 9 templates above.

Design principles for emails:
```
- Match the app's dark/indigo aesthetic where possible, but default to light
  (most email clients handle light better)
- Header: AtomQuest logo + gradient "AQ" mark, indigo header band (#6366F1)
- Body: white background, DM Sans imported from Google Fonts
- CTA button: indigo bg, white text, rounded, centered
- Footer: muted gray, "© 2026 AtomQuest · Unsubscribe"

Template: goal_submitted (to manager)
  Subject: "[AtomQuest] {employeeName} has submitted their goals for review"
  Body:
    Header: "Action Required"
    "Hi {managerName},"
    "{employeeName} has submitted {goalCount} goals for FY {year} — {cyclePhase}."
    "Please review and approve before {deadline}."
    [Review Goals →] button → deep link to /manager/team-goals/{employeeId}
    Goal summary table: Goal title | Weightage (first 3 goals shown, "and N more...")

Template: goal_returned (to employee)
  Subject: "[AtomQuest] Your goals have been returned for revision"
  Body:
    Header: "Goals Returned for Rework"
    "Hi {employeeName},"
    "Your manager {managerName} has returned your goals with the following feedback:"
    ┌─────────────────────────────────┐
    │ {reworkComment}                 │   ← amber left-border callout
    └─────────────────────────────────┘
    "Please update your goals and resubmit before {deadline}."
    [Update My Goals →] button

Template: escalation_level1 (to self)
  Subject: "[AtomQuest] Reminder: Action required before {deadline}"
  Body:
    Header: "Friendly Reminder"
    Context-specific message based on escalation type
    Clear CTA with deadline

Template: escalation_level2 (to manager/skip-level)
  Subject: "[AtomQuest] Escalation: {employeeName} has not {action} — {daysLate} days overdue"
  Body:
    Header: "Escalation Notice" (amber header band)
    "{targetName} has not {action} for {daysLate} days past the deadline."
    "Please follow up with them directly."
    [View Status →] button

Template: escalation_level3 (to HR/Admin)
  Subject: "[AtomQuest] HR Notice: {count} employees require attention"
  Body:
    Header: "HR Escalation" (red header band)
    Table listing all affected employees + overdue days
    [View Completion Dashboard →] button
```

### Microsoft Teams Adaptive Cards:
```typescript
// src/lib/notifications/teamsService.ts

async function sendTeamsCard(webhookUrl: string, template: string, data: Record<string, string>): Promise<void> {
  const card = buildAdaptiveCard(template, data)
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: card
      }]
    })
  })
}

// Adaptive Card: goal_submitted (posted to manager's Teams channel)
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "ColumnSet",
      "columns": [
        {
          "type": "Column", "width": "auto",
          "items": [{ "type": "Image", "url": "{avatarUrl}", "size": "Small", "style": "Person" }]
        },
        {
          "type": "Column", "width": "stretch",
          "items": [
            { "type": "TextBlock", "text": "{employeeName}", "weight": "Bolder", "size": "Medium" },
            { "type": "TextBlock", "text": "submitted their goals for review", "isSubtle": true, "spacing": "None" }
          ]
        }
      ]
    },
    { "type": "FactSet", "facts": [
        { "title": "Cycle", "value": "{cycleName}" },
        { "title": "Goals", "value": "{goalCount}" },
        { "title": "Total Weightage", "value": "100%" },
        { "title": "Submitted", "value": "{submittedAt}" }
    ]},
    { "type": "TextBlock", "text": "Review and approve before {deadline}", "wrap": true, "color": "Warning" }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Review Goals →",
      "url": "{deepLink}",
      "style": "positive"
    }
  ]
}

// deepLink format: https://app.atomquest.in/manager/team-goals/{employeeId}?quarter={quarter}

// Additional card templates:
// - checkin_reminder: simpler card, reminder with window close date
// - window_opening: sent to entire team, shows what's due this window
// - escalation: amber/red accent color, shows days overdue
```

### Teams Webhook Configuration (Admin):
```
Admin screen: Settings → Integrations → Microsoft Teams

Per department/team row:
  [Department Name]  [Webhook URL input]  [Test →]  [Save]

"Test" sends a sample card to verify the webhook works.
Webhooks stored in DB (new TeamsWebhook model) or env vars for single-team setups.
```

---

## 4. ANALYTICS DASHBOARD (5.3)

### Page Header:
```
Title: "Analytics"
Subtitle: "Trends, distributions, and manager effectiveness"

Controls (top-right):
  [Cycle: FY 2026 ▾]  [Department: All ▾]  [↓ Export PDF]
```

### Layout: 2-Column Grid with Full-Width Sections
```
┌────────────────────────────────────┬────────────────────────────────────┐
│  A. QoQ Trend Chart (full width)                                        │
├────────────────────────────────────┬────────────────────────────────────┤
│  B. Completion Heatmap (full width)                                     │
├────────────────────────────────────┬────────────────────────────────────┤
│  C1. Goals by Thrust Area (donut)  │  C2. Goals by UoM (bar)           │
├────────────────────────────────────┬────────────────────────────────────┤
│  C3. Goals by Status (stacked bar)                                      │
├────────────────────────────────────┴────────────────────────────────────┤
│  D. Manager Effectiveness Table (full width)                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Chart A: Quarter-over-Quarter Trend (Recharts LineChart)
```
Type: Multi-line chart with area fill
X-axis: Q1 · Q2 · Q3 · Q4
Y-axis: Average weighted achievement score (%)
Lines:
  - Overall org average (thick indigo line)
  - Selected department (thin sky blue line)
  - Selected individual (thin amber line, shown when drill-down active)

Features:
  - Animated line drawing on mount (Recharts animationDuration: 800ms)
  - Hover tooltip: shows all three line values at that quarter
    "Q1: Org 78% · Dept 82% · Riya 91%"
  - Click on a data point → drill-down: bottom section shows individual employees for that quarter
  - Reference line at 100% (dashed, text-muted): "Target"
  - Smooth curve (type="monotone")

Chart styling:
  - Grid lines: rgba(255,255,255,0.05) — barely visible
  - Area fill: gradient from accent/30 at line down to transparent
  - Line stroke-width: 2.5px (org), 1.5px (dept/individual)
  - Dot on hover only (activeDot: radius 5, filled accent)
  - Legend: horizontal, below chart, 13px DM Sans
```

### Chart B: Completion Heatmap (D3.js or custom React SVG)
```
Type: Grid heatmap
Rows: employees (sorted by department, then name)
Columns: Q1 · Q2 · Q3 · Q4

Cell value: completion % for that employee × quarter
Color scale: sequential, 5 steps
  0%    → #1A1A24 (bg-elevated — empty)
  1–25% → rgba(239,68,68,0.3)     — danger tint
  26–50%→ rgba(245,158,11,0.4)    — warning tint
  51–75%→ rgba(56,189,248,0.4)    — info tint
  76–99%→ rgba(99,102,241,0.4)    — accent tint
  100%  → rgba(34,197,94,0.5)     — success tint

Cell: 48px × 36px, 2px gap, rounded-sm
Hover: tooltip showing "{name} · {quarter}: {score}% · {status}"

Employee names: left column, 130px wide, 13px, truncated with ellipsis
Quarter headers: above grid, centered, 11px uppercase

On click cell → side drawer showing that employee's goal breakdown for that quarter

Grouping toggle: "Group by Department" — shows department label rows between groups

Y-axis scroll: if > 20 employees, grid scrolls vertically (fixed header)
```

### Chart C1: Goals by Thrust Area (Donut — Recharts PieChart)
```
Type: Donut (hole ratio: 70%)
Data: count of goals per thrust area
Colors: use the thrust area colors configured by admin (from ThrustArea.color)

Center label (inside donut): total goal count
  "142 Goals"

Legend: right-aligned list with colored squares + name + count + %
  ● Customer Excellence  38  (27%)
  ● Revenue Growth       31  (22%)
  ...

Hover: slice expands slightly (outerRadius +6px, transition 150ms)
Click: filter achievement report table below (cross-chart filtering)
Animation: pie draws from 0° on mount (animationDuration: 600ms)
```

### Chart C2: Goals by UoM Type (Horizontal Bar — Recharts BarChart)
```
Type: Horizontal bar chart
Y-axis: UoM labels (Min Numeric, Max Numeric, Min %, Max %, Timeline, Zero)
X-axis: count
Bars: solid accent color with 40% opacity on non-hovered bars

Bar labels: count shown at end of each bar
Hover: bar highlights to full opacity
Tooltip: "{uomType}: {count} goals ({percent}% of total)"
Sorted: descending by count
```

### Chart C3: Goals by Status (Stacked Bar — Recharts BarChart)
```
Type: Stacked vertical bar chart
X-axis: Q1 · Q2 · Q3 · Q4
Y-axis: count of goals
Stack layers:
  - Completed   (success color)
  - On Track    (info color)
  - Not Started (muted color)

Legend: horizontal, top of chart
Tooltip: shows all three values for that quarter
Hover: individual stack segment highlights
```

### Chart D: Manager Effectiveness Table
```
Type: Sortable data table — looks like a leaderboard

Columns:
  Manager        — Avatar + name
  Team Size      — integer
  Submission %   — % of team who submitted goals on time
                   Progress bar + number (e.g. [████████░░] 80%)
  Approval SLA   — % of submissions approved within 3 days
                   Progress bar + number
  Check-in Rate  — % of quarterly check-ins completed
                   Progress bar + number
  Trend          — sparkline (4 bars for Q1–Q4 completion %)
                   Use a tiny inline Recharts BarChart (width 80px)

Row hover: highlight
Click row: drill-down panel below showing that manager's team member breakdown

Sorting: click any column header → sorts descending first, then ascending
Default sort: Submission % descending (best managers first)

Color coding for progress bars:
  ≥ 90%: success color
  70–89%: info color
  50–69%: warning color
  < 50%: danger color
```

### Analytics API Endpoints:
```
GET /api/analytics/qoq-trend?cycleId=&departmentId=&userId=
  → { quarters: ['Q1','Q2','Q3','Q4'], org: [78,82,85,90], dept: [...], individual: [...] }

GET /api/analytics/heatmap?cycleId=&departmentId=
  → { employees: [{ id, name, dept, scores: { Q1: 0.82, Q2: 0.91, ... } }] }

GET /api/analytics/goal-distribution?cycleId=
  → { byThrustArea: [...], byUom: [...], byStatus: { Q1: {...}, Q2: {...}, ... } }

GET /api/analytics/manager-effectiveness?cycleId=
  → { managers: [{ id, name, teamSize, submissionPct, approvalSla, checkinRate, trend: [...] }] }

All endpoints:
  - Require MANAGER or ADMIN role
  - MANAGER: scoped to their org subtree (all transitively reporting employees)
  - ADMIN: org-wide
  - Results cached for 5 minutes (Redis or in-memory LRU cache) to avoid heavy query load
```

---

## 5. ADMIN: ESCALATION MANAGEMENT UI (`/admin/escalations`)

### Two sub-pages:

**Rules (`/admin/escalations/rules`):**
```
Title: "Escalation Rules"
Subtitle: "Configure automated reminders and escalation chains"

Feature flag banner (shown if ESCALATION_ENABLED !== 'true'):
┌────────────────────────────────────────────────────────────────────┐
│  ⚙️  Escalations are disabled.                                     │
│  Set ESCALATION_ENABLED=true in your environment to activate.     │
│  The rules below will be applied once enabled.    [Docs ↗]        │
└────────────────────────────────────────────────────────────────────┘

Rules table:
  Rule Name | Type | Threshold Days | Repeat Days | Active toggle | [Edit]

Edit rule: side drawer with:
  Name (text)
  Threshold: number input "First notify after ___ days"
  Repeat: number input "Re-escalate every ___ days"
  Active toggle
  [Save]

[+ Add Custom Rule] — for future extension (stub for now, show "Coming soon" tooltip)
```

**Log (`/admin/escalations/log`):**
```
Title: "Escalation Log"
Subtitle: "All triggered escalations, their chains, and resolution status"

Filter bar: [Rule Type ▾] [Status ▾] [Date Range] [Employee search]

Table:
  Triggered At | Employee | Rule | Level | Notified | Resolved? | Actions

"Level" column:
  Level 1: muted badge "Reminder"
  Level 2: warning badge "Skip-level"
  Level 3: danger badge "HR Escalation"

"Notified" column: avatar stack of up to 3 notified users + "+N more"

Row expand: full notification chain
  Timestamp | Notified Person | Channel | Status (sent/failed)

Actions:
  [Mark Resolved] — adds resolvedAt timestamp, removes from active list
  [View Employee] → links to completion dashboard filtered to that employee

Active vs. Resolved tabs at top of table.
```

---

## 6. NOTIFICATION LOG PAGE (`/admin/notifications`)

```
Title: "Notification Log"
Subtitle: "All emails and Teams messages sent by the system"

Stats row:
  [Total Sent]  [Emails]  [Teams]  [Failed]

Table:
  Sent At | Recipient | Channel | Template | Subject | Status | [Resend]

Status badges:
  SENT: success
  PENDING: info (pulsing)
  FAILED: danger

[Resend] on FAILED rows: re-attempts delivery, updates status

Filter: [Channel ▾]  [Status ▾]  [Template ▾]  [Date range]
Export: CSV of all notification logs
```

---

## 7. ANALYTICS PAGE UI DESIGN

```
The analytics page has the highest information density in the entire app.
Design philosophy: "Bloomberg Terminal meets Stripe Dashboard"
— data-rich, but never overwhelming because the charts use breathing room.

Chart cards:
  Same card component as everywhere else: bg-surface, border-subtle, radius-lg
  Card header: Chart title (14px, medium) + subtitle (12px, text-muted) + optional filter chip
  Chart area: padding 24px, min-height 280px

Chart empty states:
  "Not enough data for Q2 yet — check back after the check-in window opens"
  (shown when < 3 data points exist for a chart — avoid misleading single-data charts)

Loading states:
  Skeleton shimmer the entire chart area (same shimmer animation as everywhere)
  Pulse animation: 1.5s ease-in-out infinite

Chart tooltips:
  Custom tooltips (not default Recharts tooltips) using a styled div:
    bg-bg-overlay, border-border-default, rounded-md, shadow-md
    Syne Bold for the main value, DM Sans for labels
    Subtle drop shadow: var(--shadow-md)

Responsive behavior:
  On tablet (768–1024px): two-column layout collapses to single column
  On mobile: charts replaced with a data table fallback
  (Charts require enough width to be readable — don't render a 300px line chart)

PDF Export:
  Use html2canvas + jsPDF OR a server-side render approach
  Capture each chart card as an image, layout onto A4 pages
  Cover page: "AtomQuest Analytics — FY 2026 — {Department} — Generated {date}"
```

---

## 8. FEATURE FLAGS & GRACEFUL DEGRADATION

All Phase 5 features gated by env vars. Handle cleanly:

```typescript
// src/lib/featureFlags.ts
export const featureFlags = {
  escalation: process.env.ESCALATION_ENABLED === 'true',
  email:      process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true',
  teams:      process.env.NOTIFICATIONS_TEAMS_ENABLED === 'true',
  analytics:  process.env.ANALYTICS_ENABLED !== 'false', // on by default
}

// In components:
if (!featureFlags.escalation) {
  return <FeatureDisabledBanner
    title="Escalations Not Configured"
    description="Set ESCALATION_ENABLED=true to activate automated reminders."
    docsUrl="/docs/escalations"
  />
}
```

The FeatureDisabledBanner component:
```tsx
// Consistent empty state for any disabled feature
// Shows: feature icon (large, muted), title, description, env var to set, docs link
// bg-bg-surface, dashed border in border-default, centered content
// NOT an error — neutral, informational tone
```

---

## 9. DELIVERABLES FOR PHASE 5

**Escalation Engine:**
- [ ] EscalationRule and EscalationLog models + seed with 4 default rules
- [ ] Daily cron job evaluating all 4 rule types
- [ ] Notification chain (Level 1 → 2 → 3) with correct delay logic
- [ ] Auto-resolution when underlying issue is fixed
- [ ] Admin escalation rules UI (view + edit threshold/repeat days)
- [ ] Escalation log table with level badges, chain expand, mark-resolved

**Notification Service:**
- [ ] NotificationService abstraction (EMAIL | TEAMS channels)
- [ ] NotificationLog model + admin log page with resend
- [ ] All 9 email templates (HTML, branded, mobile-responsive)
- [ ] Teams Adaptive Card for goal_submitted and checkin_reminder
- [ ] Admin Teams webhook configuration screen
- [ ] Feature-flag gating: EMAIL, TEAMS, ESCALATION env vars

**Analytics Dashboard:**
- [ ] Chart A: QoQ Trend (multi-line, animated, drill-down)
- [ ] Chart B: Completion Heatmap (D3, click-to-drawer, dept grouping)
- [ ] Chart C1: Thrust Area donut (cross-filters report table)
- [ ] Chart C2: UoM horizontal bar
- [ ] Chart C3: Status stacked bar (all 4 quarters)
- [ ] Chart D: Manager Effectiveness table with sparklines
- [ ] All 4 API endpoints with manager-scoped + admin-scoped queries
- [ ] 5-minute result cache
- [ ] PDF export of analytics page
- [ ] Analytics page graceful empty states (< 3 data points)
- [ ] Feature-flag banner when ANALYTICS_ENABLED=false