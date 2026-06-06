export type AppRole =
  | "super_admin"
  | "university_admin"
  | "lecturer"
  | "student"
  | "invigilator"
  | "finance";

export type SectionId =
  // overview
  | "home"
  | "profile"
  // super admin
  | "universities"
  | "audit"
  // shared admin
  | "people"
  | "setup"
  | "timetable"
  | "seating"
  | "attendance"
  | "id-cards"
  | "results"
  | "lecturer-evals"
  | "messages"
  | "complaints"
  | "security"
  | "reports"
  | "settings"
  // student
  | "my-timetable"
  | "my-seating"
  | "my-results"
  | "my-id-card"
  | "register-courses"
  | "my-payments"
  | "evaluate-lecturers"
  // invigilator
  | "my-assignments"
  | "mark-attendance"
  | "verify-students"
  | "my-payments-inv"
  // finance
  | "fee-payments"
  | "course-reg-payments"
  | "invigilator-payments"
  // lecturer
  | "my-courses"
  | "upload-results"
  | "my-evaluations";

export type SectionDef = {
  id: SectionId;
  label: string;
  href: string;
  description?: string;
  roles: AppRole[];
  group: "overview" | "manage" | "operate" | "personal";
};

export const SECTIONS: SectionDef[] = [
  // ── Overview (everyone) ──────────────────────────────────────────
  { id: "home", label: "Home", href: "/dashboard", roles: ["super_admin", "university_admin", "lecturer", "student", "invigilator", "finance"], group: "overview" },
  { id: "profile", label: "Profile", href: "/dashboard/profile", description: "Account details", roles: ["super_admin", "university_admin", "lecturer", "student", "invigilator", "finance"], group: "overview" },

  // ── Super Admin ──────────────────────────────────────────────────
  { id: "universities", label: "Universities", href: "/dashboard/universities", description: "Tenants, codes, email domains", roles: ["super_admin"], group: "manage" },
  { id: "audit", label: "Audit Log", href: "/dashboard/audit", description: "System-wide activity", roles: ["super_admin"], group: "manage" },

  // ── University Admin (Exam Council) ─────────────────────────────
  { id: "people", label: "People", href: "/dashboard/people", description: "Students, lecturers, invigilators, finance", roles: ["super_admin", "university_admin"], group: "manage" },
  { id: "setup", label: "Setup", href: "/dashboard/setup", description: "Programs, courses, rooms", roles: ["university_admin"], group: "manage" },
  { id: "timetable", label: "Timetable", href: "/dashboard/timetable", description: "Course → exam schedules", roles: ["university_admin"], group: "operate" },
  { id: "seating", label: "Seating", href: "/dashboard/seating", description: "Generate arrangements", roles: ["university_admin"], group: "operate" },
  { id: "attendance", label: "Attendance", href: "/dashboard/attendance", description: "Review finalized registers", roles: ["university_admin"], group: "operate" },
  { id: "id-cards", label: "ID Cards", href: "/dashboard/id-cards", description: "Generate and print", roles: ["university_admin"], group: "operate" },
  { id: "results", label: "Results", href: "/dashboard/results", description: "Publish, GPA, transcripts", roles: ["university_admin"], group: "operate" },
  { id: "lecturer-evals", label: "Lecturer Evaluations", href: "/dashboard/lecturer-evals", description: "Aggregated reports", roles: ["university_admin"], group: "operate" },
  { id: "messages", label: "Messages", href: "/dashboard/messages", description: "Broadcasts, DMs, notifications", roles: ["university_admin"], group: "operate" },
  { id: "complaints", label: "Complaints", href: "/dashboard/complaints", description: "Resolve student/invigilator issues", roles: ["university_admin"], group: "operate" },
  { id: "security", label: "Security", href: "/dashboard/security", description: "2FA, sessions, activity logs", roles: ["university_admin"], group: "manage" },
  { id: "reports", label: "Reports", href: "/dashboard/reports", description: "PDFs and exports", roles: ["university_admin", "finance"], group: "operate" },
  { id: "settings", label: "Settings", href: "/dashboard/settings", description: "Branding, policies", roles: ["university_admin"], group: "manage" },

  // ── Student ─────────────────────────────────────────────────────
  { id: "my-timetable", label: "My Timetable", href: "/dashboard/my-timetable", description: "Exam dates and rooms", roles: ["student"], group: "personal" },
  { id: "my-seating", label: "My Seating", href: "/dashboard/my-seating", description: "Seat per exam, download PDF", roles: ["student"], group: "personal" },
  { id: "my-results", label: "My Results", href: "/dashboard/my-results", description: "Grades, GPA, transcript", roles: ["student"], group: "personal" },
  { id: "my-id-card", label: "My ID Card", href: "/dashboard/my-id-card", description: "Digital ID, reprint request", roles: ["student"], group: "personal" },
  { id: "register-courses", label: "Register Courses", href: "/dashboard/register-courses", description: "Course registration", roles: ["student"], group: "personal" },
  { id: "my-payments", label: "My Payments", href: "/dashboard/my-payments", description: "Fees, receipts", roles: ["student"], group: "personal" },
  { id: "evaluate-lecturers", label: "Evaluate Lecturers", href: "/dashboard/evaluate-lecturers", description: "Anonymous feedback", roles: ["student"], group: "personal" },

  // ── Invigilator ─────────────────────────────────────────────────
  { id: "my-assignments", label: "My Assignments", href: "/dashboard/my-assignments", description: "Rooms and dates", roles: ["invigilator"], group: "operate" },
  { id: "mark-attendance", label: "Mark Attendance", href: "/dashboard/mark-attendance", description: "Register + sync", roles: ["invigilator"], group: "operate" },
  { id: "verify-students", label: "Verify Students", href: "/dashboard/verify-students", description: "ID checks + penalties", roles: ["invigilator"], group: "operate" },
  { id: "my-payments-inv", label: "My Payments", href: "/dashboard/my-payments-inv", description: "Invigilation pay", roles: ["invigilator"], group: "personal" },

  // ── Finance ─────────────────────────────────────────────────────
  { id: "fee-payments", label: "Fee Payments", href: "/dashboard/fee-payments", description: "Student fees, clearance", roles: ["finance"], group: "operate" },
  { id: "course-reg-payments", label: "Course Reg Payments", href: "/dashboard/course-reg-payments", description: "Process registrations", roles: ["finance"], group: "operate" },
  { id: "invigilator-payments", label: "Invigilator Payments", href: "/dashboard/invigilator-payments", description: "Rates, approve, process", roles: ["finance"], group: "operate" },

  // ── Lecturer ────────────────────────────────────────────────────
  { id: "my-courses", label: "My Courses", href: "/dashboard/my-courses", description: "Assigned courses", roles: ["lecturer"], group: "operate" },
  { id: "upload-results", label: "Upload Results", href: "/dashboard/upload-results", description: "Scores, grades, GPA", roles: ["lecturer"], group: "operate" },
  { id: "my-evaluations", label: "My Evaluations", href: "/dashboard/my-evaluations", description: "Anonymous feedback", roles: ["lecturer"], group: "personal" },
];

export const SECTIONS_BY_ROLE: Record<AppRole, SectionDef[]> = (() => {
  const map: Record<AppRole, SectionDef[]> = {
    super_admin: [],
    university_admin: [],
    lecturer: [],
    student: [],
    invigilator: [],
    finance: [],
  };
  for (const section of SECTIONS) {
    for (const role of section.roles) {
      map[role].push(section);
    }
  }
  return map;
})();

export const GROUP_LABELS: Record<SectionDef["group"], string> = {
  overview: "Overview",
  manage: "Manage",
  operate: "Operate",
  personal: "Personal",
};
