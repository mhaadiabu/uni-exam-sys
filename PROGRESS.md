# Progress

## Goal
Refactor the dashboard from a single mega-`page.tsx` (3422 lines) with
client-side section switching into proper Next.js App Router routes —
one real route per feature, shared layout for the sidebar, and zero
duplicated UI between pages.

## Current state (found during exploration)
- `apps/web/src/app/dashboard/page.tsx` is 3422 lines and holds
  virtually all state, queries, mutations, handlers, and rendering.
- The 35 files in `_sections/` are 22–29 line stubs that render a
  "coming soon" placeholder.
- The previous refactor's `SectionContent` switch in
  `_sections/index.tsx` points to those stubs, so the sidebar in the
  current app shows stubs for every section.
- The original rich UI (programs/courses/rooms tables, schedules,
  invigilator assignments, seating generation, etc.) still lives in
  an unused `RoleOperations` function inside `page.tsx`. **It is
  defined but never called** — the data it needs is fetched but the
  UI is dead code.
- `ClerkUserPicker` is a self-contained component near the end of
  `page.tsx` and is used by the user creation forms.
- `Kpi`, `QuickMetric`, `MiniStat`, `ReportPane` are also defined at
  the bottom of `page.tsx`. The new `_components/kpi.tsx` duplicates
  these — the new version is the one we'll keep.

## Architecture (target)
```
app/
  page.tsx                      landing / sign-in
  layout.tsx                    root: Clerk + Providers
  dashboard/
    layout.tsx                  sidebar + auth gate + me
    page.tsx                    overview / home
    profile/page.tsx            account details + sign out
    # super admin
    universities/page.tsx       tenants CRUD
    audit/page.tsx              system-wide activity
    # university admin (exam council)
    people/page.tsx             students / lecturers / invigilators / finance
    setup/page.tsx              programs / courses / rooms
    timetable/page.tsx          exam schedules
    seating/page.tsx            generate + view seating
    attendance/page.tsx         review finalized registers
    id-cards/page.tsx           bulk ID generation
    results/page.tsx            publish / GPA / transcripts
    messages/page.tsx           broadcasts / DMs
    complaints/page.tsx         complaint queue
    security/page.tsx           2FA / sessions
    reports/page.tsx            PDF/CSV exports
    settings/page.tsx           branding / policies
    # student
    my-timetable/page.tsx
    my-seating/page.tsx
    my-results/page.tsx
    my-id-card/page.tsx
    register-courses/page.tsx
    my-payments/page.tsx
    evaluate-lecturers/page.tsx
    # invigilator
    my-assignments/page.tsx
    mark-attendance/page.tsx
    verify-students/page.tsx
    my-payments-inv/page.tsx
    # finance
    fee-payments/page.tsx
    course-reg-payments/page.tsx
    invigilator-payments/page.tsx
    # lecturer
    my-courses/page.tsx
    upload-results/page.tsx
    my-evaluations/page.tsx
    lecturer-evals/page.tsx
```

## Rules
- No client-side section switching — each feature is a real route.
- Sidebar lives in `app/dashboard/layout.tsx`, uses Next.js `<Link>`
  and `usePathname()` for active highlighting.
- Shared data (`me`, tenant selector) fetched in layout; each route
  fetches what it needs (no passing 200+ props through).
- No duplicate UI between pages. The big "Quick Create" panel that
  used to live on the home page belongs in `setup`, not duplicated
  on every page.
- Each route page is a focused, single-purpose client component.
- Commit after each meaningful step.

## Migration order
1. ✅ WIP commit (stub scaffold + this file)
2. Create `dashboard/layout.tsx` with sidebar + auth + me
3. Replace `dashboard/page.tsx` with thin home/overview
4. Create `profile/page.tsx`
5. Create super admin routes (`universities`, `audit`)
6. Create admin routes (`people`, `setup`, `timetable`, `seating`,
   `attendance`, `id-cards`, `results`, `messages`, `complaints`,
   `security`, `reports`, `settings`, `lecturer-evals`)
7. Create student routes (`my-timetable`, `my-seating`, `my-results`,
   `my-id-card`, `register-courses`, `my-payments`,
   `evaluate-lecturers`)
8. Create invigilator routes (`my-assignments`, `mark-attendance`,
   `verify-students`, `my-payments-inv`)
9. Create finance routes (`fee-payments`, `course-reg-payments`,
   `invigilator-payments`)
10. Create lecturer routes (`my-courses`, `upload-results`,
    `my-evaluations`)
11. Delete `_components/` and `_sections/` directories
12. Final typecheck + smoke test

## Status

### Done
- [x] Recognized the shell pattern is wrong, pivoted to real routes
- [x] Confirmed web app typechecks clean
- [x] Mapped the current page.tsx structure (state, queries, helpers,
      the orphan `RoleOperations` function)
- [x] New dashboard layout (`app/dashboard/layout.tsx`) with auth
      gate, Clerk sync, sidebar, and `useMe()` context
- [x] New sidebar (`components/dashboard/sidebar.tsx`) using Next.js
      `<Link>` and `usePathname()` for active highlighting
- [x] New section definitions (`components/dashboard/sections.ts`)
      with explicit `href` per route
- [x] New home page (`app/dashboard/page.tsx`) with role-aware KPIs
      and quick links
- [x] Profile (`app/dashboard/profile/page.tsx`)
- [x] Universities — super admin: list, create, edit email domains
      (`app/dashboard/universities/page.tsx`)
- [x] Audit log — super admin: searchable, university filter
      (`app/dashboard/audit/page.tsx`)
- [x] Setup — admin: programs / courses / rooms CRUD
      (`app/dashboard/setup/page.tsx`)
- [x] Timetable — admin: schedules + invigilator assignments
      (`app/dashboard/timetable/page.tsx`)
- [x] Seating — admin: generate (sequential/shuffled), view, freeze,
      download PDF (`app/dashboard/seating/page.tsx`)
- [x] Attendance (admin review) + mark-attendance (invigilator)
      with finalize & signature
- [x] People (students CRUD + CSV import, users + Clerk picker)
- [x] ID cards (admin bulk + reprint) + my-id-card (student)
- [x] Results (admin review) + upload-results (lecturer) + my-results
      (student, with GPA)
- [x] Messages (DM, broadcast, notifications) + complaints
      (queue + comment thread)
- [x] Finance trio: fee-payments, course-reg-payments,
      invigilator-payments
- [x] Lecturer: my-courses (real); evaluate-lecturers,
      lecturer-evals, my-evaluations = "coming soon" stubs
      (no backend)
- [x] Student: my-timetable, my-seating, register-courses, my-payments
- [x] Invigilator: my-assignments (today/upcoming/history tabs + PDF
      export), verify-students (search + log + penalty + history),
      my-payments-inv (read-only pay view)
- [x] Admin: reports (timetable, attendance, students, rooms,
      schedules, finance payments, defaulter attendance as PDF/CSV),
      settings (workspace identity + editable branding), security
      (Clerk note + filtered audit log)
- [x] Deleted old `_components/` and `_sections/` directories
- [x] `npx tsc --noEmit` passes

### Backend additions made along the way
- `convex/dashboard.ts` → `listAuditLogs` (super-admin-scoped,
  actor-joined)
- `convex/attendance.ts` → `attendanceSummary.rows[]` extended with
  `examScheduleId`, `roomId`, `invigilatorId`, `examDate`,
  `startTime`, `endTime` (so admin page can drill into a register)
- `convex/students.ts` → `listMyResults`, `listMyPayments`
  (student-scoped)
- `convex/lecturers.ts` → `listAllResults` (admin cross-course view)
- `convex/assignments.ts` → `listMyInvigilatorPay` (invigilator-scoped)
- `convex/finance.ts` → `createCourseRegPayment` mutation
- `convex/seating.ts` → `listMySeating` (student-scoped)
- `convex/courseRegistrations.ts` (new file) →
  `listAvailableCourses`, `listMyRegistrations`, `registerForCourse`,
  `dropCourse` (with fee-status / late-registration guard,
  audit-logged)
- `convex/schema.ts` → added `"course_reg_payment"` to the
  `paymentRecords.type` union, added optional `description` field,
  added the new `courseRegistrations` table with three indexes

### Routes still to build
- _none — all sidebar routes ship as real pages_

### /people rework (Clerk picker + role reassignment + PLATFORM-tenant fix)
- `packages/backend/convex/clerkUsers.ts`: `listClerkUsers` now
  enriches each Clerk user with their existing `users` row (role,
  full name, email, isActive, universityId/name/code, PLATFORM flag)
  via two new internal queries
  (`lookupUsersByExternalIds`, `lookupUniversityNames`). The hoisted
  return type keeps Convex's type inference intact.
- `packages/backend/convex/users.ts`:
  - `listUsers` accepts a new optional `includeAllTenants` arg. A
    super admin calling it without `universityId` now falls through
    to a "list every real-tenant user" path so the PLATFORM-tenant
    isolation that hid university admins is gone.
  - `updateUserRole` gains a `universityId` arg (super admin only)
    for cross-tenant transfer, auto-activates inactive users on
    role change, blocks demoting the last active university admin
    per tenant, deactivates finance linked records on demotion,
    and writes the previous/new university ids + reactivation
    flag into the audit log.
  - `deactivateUser` blocks deactivating the last active university
    admin and refuses to deactivate self / other super admins
    (unless actor is super admin).
  - New `reactivateUser` mutation for re-enabling inactive users
    without a role change.
- `apps/web/src/app/dashboard/people/_components/people-types.ts`:
  shared `Role`, `ClerkUser`, `UserStatus`, status helpers
  (`describeStatus`, `canActOn`, `actionLabel`).
- `apps/web/src/app/dashboard/people/_components/clerk-user-picker.tsx`:
  full Dialog replacement for the old popover. 300ms debounced
  search, error/loading/empty states, groups results by status
  (Available / In this university / Inactive / In another
  university / You), shows cross-tenant or self-edit gates inline.
- `apps/web/src/app/dashboard/people/_components/manage-user-dialog.tsx`:
  single dialog that adapts to the picked Clerk user's status
  (create / changeRole / transfer / reactivate). Handles lecturer
  meta, target-university dropdown (super admin), self-edit
  guard, and surfaces server errors.
- `apps/web/src/app/dashboard/people/page.tsx`: `UsersTab` no
  longer builds a Popover+form. It uses the new picker as the
  primary entry, adds a tenant filter (super admin only) backed
  by the new `includeAllTenants` arg, keeps the inline table
  "Change role" for quick edits, gains a "Reactivate" button for
  inactive rows, and shows university names on the manage
  dialog's user header.
- `npx tsc --noEmit` is clean for the web app.

### Known gaps (deliberate, not blockers)
- Lecturer evaluations (`evaluate-lecturers`, `lecturer-evals`,
  `my-evaluations`) have no backend yet. Pages render a "coming
  soon" card so the sidebar links work and a real implementation
  can drop in later without re-wiring nav.
- Backend `npx tsc` fails on a pre-existing missing
  `@types/node` config error in `packages/backend/tsconfig.json`
  — unrelated to this work. Web `npx tsc --noEmit` is clean.

## 2025-06-09 — Auto-register students on signup

### Why
The student registry was fed manually: admins typed an email and a
name into the `/people` "Add student" form (or CSV-imported
historical records), and the row sat with `userId: null` until the
student happened to sign up with that same email — at which point
`bootstrap.attachUserToRoleProfile` patched in the link. That broke
the moment we had any meaningful volume: a 10k-student intake would
have meant 10k manual rows. It also produced a broken "I signed in
but my dashboard says 'Student profile not found'" state for any
student who self-registered with a valid university email before
the admin got around to creating their row.

### What changed
- **Auto-create on signup.** `bootstrap.syncCurrentUser` and
  `bootstrap.syncUserFromWebhook` now call a new server-side helper
  `ensureStudentProfile` immediately after the `users` row is
  created for a `role === "student"`. The helper is idempotent:
  if a row already exists for the user, it returns it. Otherwise
  it derives a `studentId`/`indexNumber` from the email local-part
  (+ university prefix) and inserts a placeholder row with
  `feeStatus: "outstanding"`, `lateRegistration: false`,
  `semester: 1`, and the first program in the university. The same
  logic is exposed as a public mutation
  `students.ensureStudentProfileForCurrentUser` for retry paths.
- **Dedicated status mutations.** New mutations
  `students.setStudentFeeStatus` and
  `students.setStudentLateRegistration` replace the "open the edit
  row, change a select, save" flow. They short-circuit on no-op
  transitions and write audit logs that record the previous value
  (`student.fee_status_changed` and
  `student.late_registration_changed`).
- **Soft-fail student queries.** `students.getStudentDashboard`
  no longer throws on a missing profile; it returns
  `{ student: null, … }`. The student-dashboard home page was
  already null-safe.
- **`/people` UI rewrite.** The "Add student" card is gone. The
  Students tab is now: an info banner explaining the auto-register
  flow, the existing CSV import (with a "Download template" button),
  and a list with quick-action buttons per row:
  - **Mark cleared** / **Mark outstanding** (fee toggle)
  - **Approve late reg** / **Revoke late reg** (visible only for
    students with outstanding fees)
  - **Delete** (kept; only really for orphaned/test rows)
  A confirm dialog stands in for the previous "click pencil, edit,
  save" loop. A fee-status filter pill is added to the search row
  alongside the program filter, and two summary badges
  ("X outstanding", "X late-reg") sit next to the count.
- **Auto-enrolled banner on the student dashboard.** The home
  page now reads the new `isAutoEnrolled: boolean` on
  `dashboard.studentDashboard` (true when `createdAt === updatedAt`
  — i.e. the row was just auto-created and an admin has not yet
  touched it) and shows a soft info card explaining that the
  profile is a placeholder.

### Files touched
- `packages/backend/convex/bootstrap.ts` — call
  `ensureStudentProfile` from both `syncCurrentUser` and
  `syncUserFromWebhook`; add the helper.
- `packages/backend/convex/students.ts` — add
  `setStudentFeeStatus`, `setStudentLateRegistration`,
  `ensureStudentProfileForCurrentUser`; soften
  `getStudentDashboard`.
- `packages/backend/convex/dashboard.ts` — `studentDashboard`
  returns `isAutoEnrolled`.
- `apps/web/src/app/dashboard/people/page.tsx` — rewrite
  `StudentsTab` and `CsvImportCard`; add fee-filter and per-row
  status action buttons; remove the manual add-student card.
- `apps/web/src/app/dashboard/page.tsx` — show the auto-enrolled
  banner when applicable.

### Verification
- `npx tsc --noEmit` is clean for both `apps/web` and
  `packages/backend/convex`. (The workspace-wide `bun run
  check-types` still fails on a pre-existing
  `@uni-exam-sys/ui` `@types/node` config issue — unrelated.)
