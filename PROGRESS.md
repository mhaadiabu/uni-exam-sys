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
- [x] New profile page (`app/dashboard/profile/page.tsx`)
- [x] Deleted old `_components/` and `_sections/` directories
- [x] `npx tsc --noEmit` passes

### Working app behaviour right now
- `/dashboard` → new home with role KPIs
- `/dashboard/profile` → profile
- Any other sidebar link → 404 (not built yet)

### Next up
- [ ] Build the super admin routes: `universities`, `audit`
- [ ] Then admin routes: `people`, `setup`, `timetable`, `seating`,
      `attendance`, `id-cards`, `results`, `messages`, `complaints`,
      `security`, `reports`, `settings`, `lecturer-evals`
- [ ] Then student / invigilator / finance / lecturer routes
- [ ] Final smoke test of full nav
