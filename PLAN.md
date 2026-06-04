# PLAN.md

# University Examination Seating Arrangement and Management System
Implementation Plan for Agent Execution

## 1. Purpose

This document translates the product requirements into an actionable implementation
plan for an engineering agent. It defines scope, delivery phases, modules,
dependencies, acceptance criteria, and execution priorities for building a
multi-tenant university examination seating and management system.

In short: fewer exam-day surprises, more order, less chaos.

---

## 2. Product Summary

The system supports multiple universities and provides role-based access for:

- Super Admin
- University Admin / Examination Council
- Students
- Invigilators
- Lecturers (course-results management: assigned-course grading, draft → submit → admin review)
- Finance Office

Core capabilities include:

- Multi-tenant university management
- Student, invigilator, finance, and admin account management
- Exam timetable management
- Room and capacity management
- Seating arrangement generation
- Student ID card generation and verification
- Attendance marking and reporting
- Complaints and messaging
- Payment/clearance integration
- Push notifications and calendar reminders
- Security, audit logs, and reporting
- Offline attendance support for invigilators

---

## 3. Delivery Strategy

Implement in phases to reduce risk and unlock usable value early.

### Phase Order

1. Foundation and multi-tenant setup
2. Authentication, RBAC, and user management
3. Student, room, and exam schedule management
4. Seating generation engine
5. Invigilator assignments and timetable views
6. Attendance marking system
7. ID card and verification system
8. Reports, exports, and PDF generation
9. Messaging, notifications, and complaints
10. Finance integration
11. Analytics dashboard and AI assistant
12. Offline mode, hardening, and production readiness

---

## 4. Guiding Principles

- Multi-tenant by design, not as an afterthought
- Secure defaults for every role
- Audit everything important
- Optimize for exam-day workflows
- Mobile-first for invigilators
- Print-friendly reporting
- Finalized attendance must be immutable
- Offline attendance sync must be conflict-aware
- Keep admin workflows fast for bulk operations

---

## 5. Scope Breakdown by Workstream

## 5.1 Multi-Tenant Foundation

### Objectives
- Support multiple universities with isolated data and branding
- Allow super-admin oversight across tenants

### Deliverables
- Tenant model and university registry
- Tenant-aware authentication and routing
- Tenant branding configuration:
  - logo
  - colors
  - ID card template
  - attendance report template
- Database partitioning or strict row-level tenant isolation
- Super-admin dashboard

### Acceptance Criteria
- Data from one university cannot be accessed by another university
- Branding changes apply only within the selected university
- Super-admin can view all tenants without cross-tenant leakage

---

## 5.2 Authentication, Authorization, and Security

### Objectives
- Implement secure login and role-based access control

### Deliverables
- Login flows for:
  - Admin
  - Student
  - Invigilator
  - Finance Office
  - Super Admin
- Password reset
- Optional 2FA
- Session timeout
- Account lockout on repeated failed logins
- Audit logs:
  - login attempts
  - profile changes
  - seating generation
  - attendance actions
  - ID verification actions
- Anti-bot protection for login
- Secure password hashing with Argon2 or bcrypt
- HTTPS-only deployment
- Server-side validation for all inputs

### Acceptance Criteria
- Each role only sees authorized screens and APIs
- Failed login thresholds trigger lockout
- Sensitive actions are logged with actor, time, tenant, and context

---

## 5.3 User and Profile Management

### Objectives
- Allow admin to manage all institution users

### Deliverables
- CRUD for:
  - students
  - invigilators
  - finance users
  - internal university users
- Bulk import via CSV
- Profile pages
- Photo upload support
- Password reset by admin
- Student profile edit restrictions:
  - ID not editable by student

### Acceptance Criteria
- Admin can create/edit/delete users
- CSV import validates format and reports row-level errors
- Students and invigilators can update allowed profile fields only

---

## 5.4 Student Management and Clearance

### Objectives
- Maintain student registry and payment clearance state

### Deliverables
- Student list management
- Late-registration student flow
- Finance sync for:
  - cleared students
  - outstanding fees
- Complaint review
- Student dashboard:
  - welcome section
  - timetable
  - seating
  - fee status
  - digital ID card
  - messages
  - complaints
  - theme switcher

### Acceptance Criteria
- Admin can identify fee-cleared vs non-cleared students
- Students can view their own fee balance and exam clearance state
- Late-registered students can be assigned seating after creation

---

## 5.5 Room and Capacity Management

### Objectives
- Manage examination venues and capacities

### Deliverables
- CRUD for rooms
- Room metadata:
  - hall
  - lab
  - small class
  - special-needs room
- Capacity management
- Room-specific exam schedule
- Room-specific invigilator assignment
- Total seating capacity dashboard metrics

### Acceptance Criteria
- Admin can add/update/delete rooms
- Capacity constraints are enforced during seating generation
- Rooms can be scheduled by date and time without overlap conflicts

---

## 5.6 Exam Schedule and Timetable Management

### Objectives
- Build program-specific and university-wide exam timetables

### Deliverables
- Course entry by program
- Exam schedule management:
  - course
  - date
  - time
  - room
  - invigilator
- Timetable generation:
  - by program
  - by university
- PDF export

### Acceptance Criteria
- Admin can generate a timetable with rooms and invigilators
- Students see only relevant timetable entries
- Invigilators see only assigned exams

---

## 5.7 Seating Arrangement Engine

### Objectives
- Generate exam seating arrangements accurately and flexibly

### Deliverables
- Two generation modes:
  - Sequential by index number within program
  - Shuffled/random within program
- Inputs:
  - student list
  - room list
  - room capacities
  - exam schedule
  - invigilator assignments
- Seat numbering
- Seating charts with:
  - student name
  - ID number
  - seat number
- Overcrowding prevention
- Seating conflict detection
- Re-generation with audit trail
- Freeze seating option when exams start

### Acceptance Criteria
- No room exceeds capacity
- Each seated student gets exactly one seat for an exam
- Generated charts are printable and visible to admin, student, and assigned invigilator
- Regeneration logs who changed what and when

### Implementation Notes
- Build engine as a service module, not directly inside UI
- Keep deterministic mode for sequential seating
- Use a seeded random option for reproducible shuffled seating

---

## 5.8 Invigilator Assignment and Daily Operations

### Objectives
- Help invigilators manage assigned rooms and exam-day tasks

### Deliverables
- Invigilator dashboard:
  - today's rooms
  - upcoming assignments
  - attendance status
  - schedule download
- Assignment history
- Room seating chart view
- Notifications for room changes

### Acceptance Criteria
- Invigilator can see current-day assignments immediately after login
- Invigilator can download assignment schedule as PDF
- Assigned room seating charts show names and seat numbers

---

## 5.9 Attendance Marking System

### Objectives
- Provide robust attendance capture before, during, and after exams

### Deliverables
- Attendance register creation per room and exam
- Marking methods:
  - seat grid click
  - list checkbox
  - search and mark
  - bulk mark all present
- Attendance statuses:
  - present
  - absent
  - late
  - excused
- Notes/comments per student
- Live counters:
  - present
  - absent
  - late
  - excused
  - completion %
- Undo/redo
- Auto-save every 30 seconds
- Finalization flow with lock
- Invigilator digital/typed signature
- Post-finalization submission to admin
- Attendance modification log
- Emergency override by admin

### Acceptance Criteria
- Invigilator can mark attendance from mobile and desktop
- Auto-save preserves work during unstable connection
- Finalized attendance cannot be changed by invigilator
- Admin override is logged with reason
- Summary stats update in real time

### Offline Support Requirements
- Local cache of assigned room student list and seating map
- Queue attendance actions offline
- Sync when online
- Detect conflicts if the same record changed on server
- Prefer last valid invigilator action before finalization, with conflict logs

---

## 5.10 ID Card Management

### Objectives
- Generate digital and printable ID cards

### Deliverables
- Student ID card generation with:
  - student photo
  - student ID number
  - name
  - program
  - validity period
  - university logo
- Bulk print flow
- Individual print flow
- Student digital card view
- Reprint request flow
- ID card status tracking
- Notification when card is ready

### Acceptance Criteria
- Admin can generate and print single or bulk ID cards
- Students can view their digital ID card
- Reprint requests are trackable

---

## 5.11 ID Verification and Penalty System

### Objectives
- Let invigilators verify students at exam entry and log verification events

### Deliverables
- Search by:
  - student ID
  - name
  - index number
- Real-time autocomplete
- Verification result details:
  - photo
  - full name
  - student ID
  - program
  - semester
  - fee status
- Verification log:
  - timestamp
  - invigilator
  - search term
  - reason
  - penalty applied
  - penalty points
- Penalty point accumulator per semester
- Threshold actions:
  - 3+: warning notification
  - 5+: admin review
  - 10+: disciplinary flag
- Admin reset and override controls
- Invigilator daily verification report
- Admin full verification history view

### Acceptance Criteria
- Every verification creates a log entry
- Penalty totals update correctly by semester and academic year
- Threshold notifications are triggered automatically
- Admin can override/reset with audit trail

### Important Clarification Needed
The requirement says each verification search costs the student 1 penalty point.
This should be confirmed as institutional policy because false positives and casual
lookups could become unfair very quickly. A good system should not become a
penalty speedrun.

Recommended safeguard:
- Require invigilator confirmation before penalty is applied
- Store reason and justification
- Allow "search only, no penalty" option where policy permits

---

## 5.12 Complaints and Messaging

### Objectives
- Support communication and issue resolution

### Deliverables
- Complaint submission for:
  - wrong seat
  - wrong timetable
  - wrong details
  - payment issue
  - ID verification issue
  - attendance system issue
  - schedule conflict
  - room issue
- Complaint tracking and status updates
- Admin complaint categorization
- Direct messaging
- Broadcast messages
- Group messaging
- Notification log and audit trail

### Acceptance Criteria
- Students and invigilators can submit complaints
- Admin can reply, resolve, approve, or reject
- Broadcast messages reach target audience and appear in logs

---

## 5.13 Notifications and Calendar

### Objectives
- Deliver timely alerts and reminders

### Deliverables
- In-app notifications
- Browser push notifications
- Notification bell for all users
- Calendar integration for:
  - exam dates
  - room changes
  - payment deadlines
  - attendance submission deadlines
- Reminder automation:
  - upcoming exams
  - attendance reminders
  - ID card ready
  - room changes
  - threshold penalty warnings

### Acceptance Criteria
- Users receive relevant notifications based on role and event
- Calendar items appear with reminder text
- Notification history is queryable for audit

---

## 5.14 Finance Integration

### Objectives
- Support fee clearance and invigilator payment workflows

### Deliverables
- Upload/update cleared student list
- Payment status sync to admin and student views
- Reports for:
  - fee clearance
  - outstanding balances
  - fee-defaulters who attended
- Invigilator rate management
- Invigilator payment approval
- Attendance marking bonus support
- Penalty fee management if institution uses fines

### Acceptance Criteria
- Finance office can update student clearance state
- Students see current fee status
- Admin can identify students who attended despite non-clearance
- Invigilator payment calculations include configured bonuses

---

## 5.15 Reporting, PDFs, and Export

### Objectives
- Produce operational and audit-friendly outputs

### Deliverables
- PDF generation for:
  - seating arrangement
  - full timetable
  - invigilator assignments
  - payment reports
  - attendance registers
  - absentee lists
  - attendance summary by room
  - ID cards
- Export options:
  - PDF
  - Excel
  - CSV
- Print-optimized layouts
- University logo and branding in reports

### Attendance Register Output Must Include
- Room name/number
- Date and time
- Course name and code
- Invigilator name
- Total registered
- Total present
- Total absent
- Present list with signature space
- Absent list
- Report generation time

### Acceptance Criteria
- Reports match required fields and branding
- PDFs render correctly on desktop and print cleanly
- Exports open correctly in spreadsheet tools

---

## 5.16 Admin Real-Time Dashboard and Analytics

### Objectives
- Give admins a live operational picture during exams

### Deliverables
- Dashboard cards:
  - total students
  - total invigilators
  - total rooms
  - pending complaints
  - seating status
  - notifications
  - attendance statistics
- Attendance analytics:
  - rates across rooms
  - low-attendance rooms
  - absent students
  - trend charts
  - absentee rates by program
  - comparison with previous exams
- Consolidated exports

### Acceptance Criteria
- Admin can monitor attendance in near real time
- Charts update based on submitted attendance
- Admin can drill into room-level attendance detail

---

## 5.17 AI Assistant Features

### Objectives
- Add assistant-driven recommendations for admins

### Deliverables
- Recommendations for:
  - room allocation
  - invigilator fairness
  - overcrowding prevention
  - seating conflict detection
  - likely absentees
  - invigilator-to-room ratio suggestions
- Report generation prompts
- Explainable recommendations with confidence notes

### Acceptance Criteria
- AI suggestions are advisory, not silently enforced
- Admin can accept or ignore suggestions
- Inputs used for recommendations are visible/auditable

### Deferred if Needed
If time or complexity becomes a problem, AI recommendations should be shipped
after core seating, attendance, and reporting are stable.

---

## 6. Data Model Plan

## 6.1 Core Entities
- universities
- users
- roles
- students
- invigilators
- finance_users
- rooms
- programs
- courses
- exam_schedules
- seating_arrangements
- seating_assignments
- complaints
- notifications
- payment_records
- activity_logs

## 6.2 New or Extended Entities
- student_id_cards
- id_verification_logs
- student_penalties
- exam_attendance
- attendance_registers
- attendance_bulk_actions

## 6.3 Recommended Additional Tables
To fully support the requirements, add:

- `tenants` or `universities`
- `user_sessions`
- `password_reset_tokens`
- `push_subscriptions`
- `notification_logs`
- `messages`
- `message_groups`
- `complaint_comments`
- `attendance_action_logs`
- `attendance_sync_queue`
- `branding_settings`
- `report_templates`
- `invigilator_assignments`
- `exam_room_allocations`
- `seat_maps`
- `emergency_announcements`
- `audit_logs`

## 6.4 Data Integrity Rules
- Every tenant-owned row must include tenant/university reference
- Student penalties must be unique by:
  - student
  - semester
  - academic year
- One attendance record per:
  - exam schedule
  - student
  - room
- One seat assignment per student per exam
- Finalized attendance rows become immutable except admin emergency override

---

## 7. API / Service Layer Plan

## 7.1 Service Modules
- Auth Service
- Tenant Service
- User Management Service
- Student Service
- Room Service
- Exam Schedule Service
- Seating Engine Service
- Attendance Service
- ID Card Service
- Verification Service
- Penalty Service
- Messaging Service
- Notification Service
- Finance Service
- Report Service
- Analytics Service
- Audit Service

## 7.2 Event-Driven Triggers
Use internal events for:
- attendance finalized
- penalty threshold reached
- room changed
- ID card printed
- complaint submitted
- exam reminder due
- seating generated
- student marked absent
- finance clearance updated

This reduces spaghetti logic. Because the only thing worse than exam stress is
event handling tied directly to button clicks everywhere.

---

## 8. Frontend Plan

## 8.1 Shared UI Requirements
- Responsive layout
- Blue primary theme
- Horizontal feature cards on dashboard
- Dark/light theme toggle
- Print-friendly report pages
- Accessible forms and tables
- Global notification bell
- Calendar widget

## 8.2 Role Dashboards

### Admin
- metrics
- complaints queue
- reminders
- seating status
- attendance stats
- quick actions

### Student
- upcoming exams
- seat assignments
- timetable
- fee clearance
- digital ID card
- complaint status

### Invigilator
- today’s rooms
- attendance progress
- verification search
- assigned timetable
- messages

### Finance
- student clearance updates
- invigilator payment tools
- reports

### Super Admin
- university list
- tenant usage
- tenant configuration
- audit overview

---

## 9. Execution Phases and Task Breakdown

## Phase 1: Platform Foundation
Priority: P0

### Tasks
- Set up project architecture
- Configure multi-tenant strategy
- Implement authentication and RBAC
- Set up audit logging
- Establish CI/CD baseline
- Create base UI shell and role dashboards

### Exit Criteria
- Users can log in by role
- Tenant data is isolated
- Base dashboards render securely

---

## Phase 2: Core Academic Operations
Priority: P0

### Tasks
- Student CRUD and CSV import
- Room management
- Program/course setup
- Exam schedule management
- Invigilator CRUD and assignment
- Finance clearance sync basics

### Exit Criteria
- Admin can manage students, rooms, schedules, and invigilators
- Student clearance can be viewed

---

## Phase 3: Seating Engine
Priority: P0

### Tasks
- Build seating generation service
- Add sequential and shuffled modes
- Generate seat numbers
- Create seating charts
- Add freeze seating and change logs
- Student and invigilator seating views

### Exit Criteria
- Seating can be generated, viewed, exported, and audited

---

## Phase 4: Attendance System
Priority: P0

### Tasks
- Build room attendance register flow
- Grid/list/search marking modes
- Bulk mark with confirmation
- Live counters
- Undo/redo
- Auto-save
- Finalization and signature
- Attendance summary dashboard

### Exit Criteria
- Invigilator can complete attendance end to end
- Admin can review finalized attendance

---

## Phase 5: ID Cards and Verification
Priority: P0

### Tasks
- Student ID card generation
- Bulk printing
- Student digital ID view
- Verification search UI
- Verification logs
- Penalty accumulation
- Threshold alerts and admin reset

### Exit Criteria
- Invigilators can verify students and create logs
- Students can view digital ID cards
- Penalty rules operate correctly

---

## Phase 6: Reporting and Exports
Priority: P0

### Tasks
- PDF templates
- Attendance register PDF
- Absentee PDF
- Timetable PDF
- Seating PDF
- CSV/Excel exports
- University branding integration

### Exit Criteria
- Required documents export correctly and match specifications

---

## Phase 7: Messaging, Complaints, Notifications
Priority: P1

### Tasks
- Complaint workflows
- Direct and broadcast messaging
- Push notifications
- Calendar reminders
- Notification logs

### Exit Criteria
- Admin can communicate at scale
- Users receive role-relevant alerts

---

## Phase 8: Finance and Payment Enhancements
Priority: P1

### Tasks
- Finance reports
- Invigilator payment calculations
- Attendance bonus support
- Fee-defaulter attendance visibility
- Penalty fee management if enabled

### Exit Criteria
- Finance can manage student clearance and invigilator payment data

---

## Phase 9: Analytics and AI Assistant
Priority: P2

### Tasks
- Real-time attendance analytics
- Trend charts
- absentee prediction
- workload fairness suggestions
- room usage recommendations

### Exit Criteria
- Admin gets actionable recommendations and historical insights

---

## Phase 10: Offline Support and Hardening
Priority: P1

### Tasks
- Offline attendance marking
- Sync queue
- Conflict handling
- PWA enhancements if web stack supports it
- Backup and recovery checks
- Security testing and load testing

### Exit Criteria
- Invigilator can mark attendance offline and sync successfully later

---

## 10. Priorities Matrix

## P0 - Must Have
- Multi-tenancy
- Auth and RBAC
- User management
- Student management
- Rooms and schedules
- Seating generation
- Invigilator assignments
- Attendance marking and finalization
- ID cards
- Verification logs and penalties
- Essential reports and PDF exports
- Audit logging
- Security controls

## P1 - Should Have
- Messaging
- Complaints workflow
- Push notifications
- Calendar reminders
- Finance enhancements
- Offline attendance
- Attendance analytics dashboard
- Emergency overrides and announcements

## P2 - Nice to Have
- AI recommendations
- absentee prediction
- advanced workload fairness suggestions
- advanced report customization per university

---

## 11. Testing Strategy

## 11.1 Unit Tests
- seating allocation logic
- penalty calculation logic
- attendance state transitions
- timetable conflict rules
- tenant isolation checks

## 11.2 Integration Tests
- login and role routing
- student clearance sync
- attendance finalization
- ID verification logging
- PDF generation pipeline
- notification dispatch

## 11.3 End-to-End Tests
- admin creates exam and seating
- student views seat and timetable
- invigilator marks attendance
- invigilator verifies student identity
- admin downloads report
- finance updates clearance

## 11.4 Non-Functional Tests
- performance during exam-day spikes
- offline sync reliability
- security tests:
  - SQL injection
  - broken access control
  - session fixation
  - tenant leakage
- print/PDF rendering tests
- mobile responsiveness tests

---

## 12. Operational and Security Requirements

### Required Controls
- HTTPS everywhere
- secure cookies
- CSRF protection where applicable
- input validation
- file upload validation for photos and CSVs
- rate limiting
- audit trail retention policy
- backup and restore validation
- encrypted secrets management

### Sensitive Actions Requiring Audit
- password resets
- seating generation/regeneration
- attendance edits
- attendance finalization
- admin overrides
- penalty resets
- ID verification lookups
- finance clearance updates

---

## 13. Risks and Open Questions

## Risks
- Penalty system may be controversial or misused
- Offline sync conflict handling can get messy fast
- PDF generation quality varies across browsers/tooling
- Multi-tenant data isolation mistakes would be critical
- Bulk imports may introduce poor-quality data
- Attendance finalization timing needs clear policy

## Open Questions
1. Should fee-uncleared students be prevented from seating generation or just flagged?
2. Can invigilators verify students from other rooms/exams, or only assigned sessions?
3. Is penalty application automatic or must it be confirmed by invigilator?
4. Should "late" and "excused" count as present in summary percentages?
5. What are the allowed formats for digital signature?
6. What is the exact tenant isolation strategy:
   - separate schema
   - separate database
   - shared DB with tenant keys
7. Can students print their own ID card or only view/download it?
8. What is the policy for re-opening finalized attendance?
9. Are notification channels required for email/SMS, or only web push + in-app?
10. Are finance systems external integrations or manual uploads only?

These should be resolved before Phase 4 and Phase 5 to avoid rework.

---

## 14. Recommended Agent Implementation Order

The engineering agent should work in this sequence:

1. Scaffold project and tenant-aware architecture
2. Implement auth, roles, and audit base
3. Build user/student/invigilator/room/program/course CRUD
4. Implement exam schedules and invigilator assignments
5. Build seating engine and seat chart UI
6. Build student and invigilator dashboard views for seating/timetable
7. Implement attendance register domain and UI
8. Add attendance finalization, signatures, and reports
9. Implement ID cards and digital card views
10. Implement verification search and penalty workflows
11. Add complaints, messages, and notifications
12. Add finance workflows and reports
13. Add analytics and AI recommendations
14. Add offline mode and production hardening

---

## 15. Definition of Done

A feature is done when:

- functional requirements are implemented
- RBAC is enforced
- audit logging is included where required
- tenant isolation is preserved
- validation and error states are handled
- responsive UI is usable on mobile and desktop
- exports/PDFs work as specified
- automated tests are added at appropriate levels
- documentation is updated
- acceptance criteria pass

---

## 16. Suggested Release Plan

## Release 1
- Multi-tenant setup
- Auth and RBAC
- User/student/invigilator management
- Rooms and exam schedule
- Basic dashboards

## Release 2
- Seating generation
- Seating chart exports
- Student timetable and seating views
- Invigilator assignment views

## Release 3
- Attendance marking
- Finalization
- Attendance reports
- Admin live attendance dashboard

## Release 4
- ID cards
- Verification search
- Penalty system
- Verification logs

## Release 5
- Complaints, messaging, notifications
- Finance reports
- Offline attendance
- Hardening and analytics

---

## 17. Success Metrics

Track these after deployment:

- seating generation success rate
- average time to generate seating for an exam
- attendance completion rate before exam start cutoff
- number of attendance corrections after submission
- number of ID verification events per exam
- number of false/appealed penalty actions
- complaint resolution time
- report generation success rate
- invigilator mobile usage rate
- system uptime during exam periods

---

## 18. Final Notes

The highest-value path is:

1. Get the core academic flow working
2. Make exam-day attendance reliable
3. Make reporting trustworthy
4. Then layer on AI and advanced analytics

If the implementation agent must choose between "smart" and "stable", choose
stable. Universities will forgive a missing prediction chart. They will not
forgive missing attendance on exam day.

---
