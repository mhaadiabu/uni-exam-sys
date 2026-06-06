export type AppRole =
  | "super_admin"
  | "university_admin"
  | "lecturer"
  | "student"
  | "invigilator"
  | "finance";

export type SectionId =
  | "home"
  | "profile"
  // Super Admin
  | "universities"
  | "audit"
  // Shared Admin / Exam Council
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
  // Student
  | "my-id-card"
  | "my-timetable"
  | "my-seating"
  | "my-results"
  | "register-courses"
  | "my-payments"
  | "evaluate-lecturers"
  // Invigilator
  | "my-assignments"
  | "mark-attendance"
  | "verify-students"
  | "my-payments-inv"
  // Finance
  | "fee-payments"
  | "course-reg-payments"
  | "invigilator-payments"
  // Lecturer
  | "my-courses"
  | "upload-results"
  | "my-evaluations";

export type SectionDef = {
  id: SectionId;
  label: string;
  description?: string;
  roles: AppRole[];
  group: "overview" | "manage" | "operate" | "personal";
};

export const SECTIONS: SectionDef[] = [
  // ── Overview (everyone) ──────────────────────────────────────────
  { id: "home", label: "Home", roles: ["super_admin", "university_admin", "lecturer", "student", "invigilator", "finance"], group: "overview" },
  { id: "profile", label: "Profile", description: "Account details", roles: ["super_admin", "university_admin", "lecturer", "student", "invigilator", "finance"], group: "overview" },

  // ── Super Admin ──────────────────────────────────────────────────
  { id: "universities", label: "Universities", description: "Tenants, codes, email domains", roles: ["super_admin"], group: "manage" },
  { id: "audit", label: "Audit Log", description: "System-wide activity", roles: ["super_admin"], group: "manage" },

  // ── University Admin (Exam Council) ─────────────────────────────
  { id: "people", label: "People", description: "Students, lecturers, invigilators, finance", roles: ["super_admin", "university_admin"], group: "manage" },
  { id: "setup", label: "Setup", description: "Programs, courses, rooms", roles: ["university_admin"], group: "manage" },
  { id: "timetable", label: "Timetable", description: "Course → exam schedules", roles: ["university_admin"], group: "operate" },
  { id: "seating", label: "Seating", description: "Generate arrangements + registers", roles: ["university_admin"], group: "operate" },
  { id: "attendance", label: "Attendance", description: "Review finalized registers", roles: ["university_admin"], group: "operate" },
  { id: "id-cards", label: "ID Cards", description: "Generate and print", roles: ["university_admin"], group: "operate" },
  { id: "results", label: "Results", description: "Publish, GPA, transcripts", roles: ["university_admin"], group: "operate" },
  { id: "lecturer-evals", label: "Lecturer Evaluations", description: "Aggregated reports", roles: ["university_admin"], group: "operate" },
  { id: "messages", label: "Messages", description: "Broadcasts, DMs, notifications", roles: ["university_admin"], group: "operate" },
  { id: "complaints", label: "Complaints", description: "Resolve student/invigilator issues", roles: ["university_admin"], group: "operate" },
  { id: "security", label: "Security", description: "2FA, sessions, activity logs", roles: ["university_admin"], group: "manage" },
  { id: "reports", label: "Reports", description: "PDFs and exports", roles: ["university_admin", "finance"], group: "operate" },
  { id: "settings", label: "Settings", description: "Branding, policies", roles: ["university_admin"], group: "manage" },

  // ── Student ─────────────────────────────────────────────────────
  { id: "my-timetable", label: "My Timetable", description: "Exam dates and rooms", roles: ["student"], group: "personal" },
  { id: "my-seating", label: "My Seating", description: "Seat per exam, download PDF", roles: ["student"], group: "personal" },
  { id: "my-results", label: "My Results", description: "Grades, GPA, transcript", roles: ["student"], group: "personal" },
  { id: "my-id-card", label: "My ID Card", description: "Digital ID, reprint request", roles: ["student"], group: "personal" },
  { id: "register-courses", label: "Register Courses", description: "Course registration", roles: ["student"], group: "personal" },
  { id: "my-payments", label: "My Payments", description: "Fees, receipts", roles: ["student"], group: "personal" },
  { id: "evaluate-lecturers", label: "Evaluate Lecturers", description: "Anonymous feedback", roles: ["student"], group: "personal" },

  // ── Invigilator ─────────────────────────────────────────────────
  { id: "my-assignments", label: "My Assignments", description: "Rooms and dates", roles: ["invigilator"], group: "operate" },
  { id: "mark-attendance", label: "Mark Attendance", description: "Register + sync", roles: ["invigilator"], group: "operate" },
  { id: "verify-students", label: "Verify Students", description: "ID checks + penalties", roles: ["invigilator"], group: "operate" },
  { id: "my-payments-inv", label: "My Payments", description: "Invigilation pay", roles: ["invigilator"], group: "personal" },

  // ── Finance ─────────────────────────────────────────────────────
  { id: "fee-payments", label: "Fee Payments", description: "Student fees, clearance", roles: ["finance"], group: "operate" },
  { id: "course-reg-payments", label: "Course Reg Payments", description: "Process registrations", roles: ["finance"], group: "operate" },
  { id: "invigilator-payments", label: "Invigilator Payments", description: "Rates, approve, process", roles: ["finance"], group: "operate" },

  // ── Lecturer ────────────────────────────────────────────────────
  { id: "my-courses", label: "My Courses", description: "Assigned courses", roles: ["lecturer"], group: "operate" },
  { id: "upload-results", label: "Upload Results", description: "Scores, grades, GPA", roles: ["lecturer"], group: "operate" },
  { id: "my-evaluations", label: "My Evaluations", description: "Anonymous feedback", roles: ["lecturer"], group: "personal" },
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
