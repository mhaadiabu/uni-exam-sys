"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import {
  AlertCircle,
  BookOpen,
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutGrid,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import { Separator } from "@uni-exam-sys/ui/components/separator";

import { Kpi, QuickMetric } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";
import {
  type SectionDef,
  SECTIONS_BY_ROLE,
} from "@/components/dashboard/sections";
import { formatDateTime, roleLabel } from "@/lib/utils";
import type { Route } from "next";

export default function DashboardHomePage() {
  const me = useMe();
  const isSuperAdmin = me.role === "super_admin";
  const isAdmin = me.role === "super_admin" || me.role === "university_admin";

  const superAdminDashboard = useQuery(
    api.dashboard.superAdminDashboard,
    isSuperAdmin ? {} : "skip",
  );
  const adminDashboard = useQuery(
    api.dashboard.adminDashboard,
    isAdmin && me.universityId ? { universityId: me.universityId } : "skip",
  );
  const studentDashboard = useQuery(
    api.dashboard.studentDashboard,
    me.role === "student" && me.universityId ? { universityId: me.universityId } : "skip",
  );
  const invigilatorDashboard = useQuery(
    api.dashboard.invigilatorDashboard,
    me.role === "invigilator" && me.universityId
      ? {
          universityId: me.universityId,
          todayDate: new Date().toISOString().slice(0, 10),
        }
      : "skip",
  );
  const financeDashboard = useQuery(
    api.dashboard.financeDashboard,
    me.role === "finance" && me.universityId ? { universityId: me.universityId } : "skip",
  );
  const lecturerDashboard = useQuery(
    api.lecturers.lecturerDashboard,
    me.role === "lecturer" && me.universityId ? { universityId: me.universityId } : "skip",
  );

  const notifications = useQuery(api.communications.listNotifications, me._id ? {} : "skip") ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Welcome back
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
              {me.fullName}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Signed in as <span className="font-medium">{roleLabel(me.role)}</span>
              {me.university ? (
                <>
                  {" · "}
                  <span className="font-medium">{me.university.name}</span>
                </>
              ) : null}
            </p>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {me.university ? "Active tenant" : "Cross-university"}
          </Badge>
        </div>
      </div>

      <RoleMetrics
        role={me.role}
        superAdmin={superAdminDashboard}
        admin={adminDashboard}
        student={studentDashboard}
        invigilator={invigilatorDashboard}
        finance={financeDashboard}
        lecturer={lecturerDashboard}
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-md border bg-background/60 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Jump to a workspace</h2>
            <Badge variant="outline" className="text-[10px]">
              {roleLabel(me.role)}
            </Badge>
          </div>
          <Separator className="mb-3" />
          <QuickLinks role={me.role} />
        </section>

        <section className="rounded-md border bg-background/60 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Recent notifications</h2>
            <Badge variant="secondary" className="text-[10px]">
              {notifications.length}
            </Badge>
          </div>
          <Separator className="mb-3" />
          <ScrollArea className="h-60">
            {notifications.length === 0 ? (
              <p className="px-2 text-xs text-muted-foreground">No notifications yet.</p>
            ) : (
              <div className="space-y-2 p-1">
                {notifications.slice(0, 8).map((n) => (
                  <div
                    key={n._id}
                    className="rounded-md border bg-background/60 p-2 text-xs"
                  >
                    <p className="font-medium">{n.title}</p>
                    <p className="text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </section>
      </div>
    </div>
  );
}

function RoleMetrics({
  role,
  superAdmin,
  admin,
  student,
  invigilator,
  finance,
  lecturer,
}: {
  role: string;
  superAdmin: { totalUniversities: number; totalUsers: number; latestAudit: unknown[] } | null | undefined;
  admin: { metrics: { totalStudents: number; totalInvigilators: number; totalRooms: number } } | null | undefined;
  student: { timetable: unknown[]; feeStatus: { outstandingBalance: number }; complaints: unknown[] } | null | undefined;
  invigilator: { todayAssignments: unknown[]; upcomingAssignments: unknown[]; history: unknown[] } | null | undefined;
  finance: { clearance: { cleared: number; outstanding: number; totalStudents: number }; payments: unknown[] } | null | undefined;
  lecturer: { coursesCount: number; upcomingExams: unknown[]; resultCounts: { draft: number; submitted: number } } | null | undefined;
}) {
  if (role === "super_admin" && superAdmin) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi title="Universities" value={superAdmin.totalUniversities} icon={GraduationCap} />
        <Kpi title="Users" value={superAdmin.totalUsers} icon={Users} />
        <Kpi title="Recent audit" value={superAdmin.latestAudit.length} icon={FileText} />
      </div>
    );
  }
  if (role === "university_admin" && admin) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi title="Students" value={admin.metrics.totalStudents} icon={Users} />
        <Kpi title="Invigilators" value={admin.metrics.totalInvigilators} icon={CheckCheck} />
        <Kpi title="Rooms" value={admin.metrics.totalRooms} icon={LayoutGrid} />
      </div>
    );
  }
  if (role === "student" && student) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi title="Upcoming exams" value={student.timetable.length} icon={CalendarClock} />
        <Kpi title="Outstanding balance" value={student.feeStatus.outstandingBalance} icon={CreditCard} />
        <Kpi title="Open complaints" value={student.complaints.length} icon={AlertCircle} />
      </div>
    );
  }
  if (role === "invigilator" && invigilator) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi title="Today" value={invigilator.todayAssignments.length} icon={CalendarClock} />
        <Kpi title="Upcoming" value={invigilator.upcomingAssignments.length} icon={LayoutGrid} />
        <Kpi title="History" value={invigilator.history.length} icon={FileText} />
      </div>
    );
  }
  if (role === "finance" && finance) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi title="Total students" value={finance.clearance.totalStudents} icon={Users} />
        <Kpi title="Cleared" value={finance.clearance.cleared} icon={CheckCheck} />
        <Kpi title="Outstanding" value={finance.clearance.outstanding} icon={AlertCircle} />
      </div>
    );
  }
  if (role === "lecturer" && lecturer) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi title="My courses" value={lecturer.coursesCount} icon={BookOpen} />
        <Kpi title="Upcoming exams" value={lecturer.upcomingExams.length} icon={CalendarClock} />
        <Kpi
          title="Pending results"
          value={(lecturer.resultCounts.draft ?? 0) + (lecturer.resultCounts.submitted ?? 0)}
          icon={ClipboardCheck}
        />
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <QuickMetric title="Notifications" value={0} icon={FileText} />
      <QuickMetric title="Tasks" value={0} icon={Wallet} />
      <QuickMetric title="Updates" value={0} icon={CheckCheck} />
    </div>
  );
}

function QuickLinks({ role }: { role: string }) {
  const sections: SectionDef[] = SECTIONS_BY_ROLE[role as keyof typeof SECTIONS_BY_ROLE] ?? [];
  const links = sections.filter((s) => s.id !== "home" && s.id !== "profile");
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {links.map((section) => (
        <Button
          key={section.id}
          variant="outline"
          className="h-auto justify-between gap-2 px-3 py-2 text-left text-xs"
          nativeButton={false}
          render={<Link href={section.href as Route} />}
        >
          <span className="flex flex-col items-start text-left">
            <span className="font-medium">{section.label}</span>
            {section.description ? (
              <span className="text-[10px] font-normal text-muted-foreground">
                {section.description}
              </span>
            ) : null}
          </span>
          <span aria-hidden>→</span>
        </Button>
      ))}
    </div>
  );
}
