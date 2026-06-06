# Progress

## Goal
Refactor the dashboard from a single mega-`page.tsx` with client-side section
switching into proper Next.js App Router routes — one real route per feature,
shared layout for the sidebar, and zero duplicated UI between pages.

## Architecture (target)
```
app/
  page.tsx                      landing / sign-in
  layout.tsx                    root: Clerk + Providers
  dashboard/
    layout.tsx                  sidebar + auth + me (client)
    page.tsx                    overview / home
    universities/page.tsx       super admin: tenants
    audit/page.tsx              super admin: audit log
    people/page.tsx             admin: students/lecturers/invigilators/finance
    setup/page.tsx              admin: programs / courses / rooms
    timetable/page.tsx          admin: exam schedules
    seating/page.tsx            admin: generate + view seating
    attendance/page.tsx         admin: review finalized registers
    id-cards/page.tsx           admin: bulk ID generation
    results/page.tsx            admin: publish / GPA / transcripts
    messages/page.tsx           admin: broadcasts / DMs
    complaints/page.tsx         admin: complaint queue
    security/page.tsx           admin: 2FA / sessions
    reports/page.tsx            admin + finance: PDF/CSV
    settings/page.tsx           admin: branding / policies
    my-timetable/page.tsx       student
    my-seating/page.tsx         student
    my-results/page.tsx         student
    my-id-card/page.tsx         student
    register-courses/page.tsx   student
    my-payments/page.tsx        student
    evaluate-lecturers/page.tsx student
    my-assignments/page.tsx     invigilator
    mark-attendance/page.tsx    invigilator
    verify-students/page.tsx    invigilator
    my-payments-inv/page.tsx    invigilator
    fee-payments/page.tsx       finance
    course-reg-payments/page.tsx finance
    invigilator-payments/page.tsx finance
    my-courses/page.tsx         lecturer
    upload-results/page.tsx     lecturer
    my-evaluations/page.tsx     lecturer
    lecturer-evals/page.tsx     admin
```

## Rules
- No client-side section switching — each feature is a real route
- Sidebar lives in `app/dashboard/layout.tsx`, links via `<Link>`
- Shared data (`me`, tenant selector) fetched in layout, passed via context
  only when actually shared; otherwise each page fetches what it needs
- No duplicate UI between pages
- Commit after each meaningful step

## Status

### Done
- [x] Recognized the shell pattern is wrong, pivoted to real routes
- [x] Confirmed web app typechecks clean (`npx tsc --noEmit`, exit 0)

### Next up
- [ ] Checkpoint commit of in-progress section stubs
- [ ] Create `app/dashboard/layout.tsx` (sidebar + auth + me)
- [ ] Convert `app/dashboard/page.tsx` to home/overview
- [ ] Extract each feature into its own route file
- [ ] Delete `_components/` and `_sections/` when done
- [ ] Final typecheck + smoke test
