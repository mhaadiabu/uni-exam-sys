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
  Bell,
} from "lucide-react";
import { useQuery } from "convex/react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@uni-exam-sys/ui/components/card";
import { Badge } from "@uni-exam-sys/ui/components/badge";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import { Separator } from "@uni-exam-sys/ui/components/separator";

import { Kpi } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";
import { formatDateTime, roleLabel } from "@/lib/utils";

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
      ? { universityId: me.universityId, todayDate: new Date().toISOString().slice(0, 10) }
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{me.fullName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {roleLabel(me.role)}
          {me.university ? ` · ${me.university.name}` : ""}
        </p>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="size-4 text-muted-foreground" />
            Notifications
          </CardTitle>
          <Badge variant="secondary">{notifications.length}</Badge>
        </CardHeader>
        <Separator />
        <ScrollArea className="h-72">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Bell className="size-8 opacity-20" />
              <p className="text-xs">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 8).map((n) => (
                <div key={n._id} className="px-6 py-3">
                  <p className="text-xs font-medium">{n.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[10px] tabular-nums text-muted-foreground/60">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi title="Universities" value={superAdmin.totalUniversities} icon={GraduationCap} />
        <Kpi title="Users" value={superAdmin.totalUsers} icon={Users} />
        <Kpi title="Recent audit" value={superAdmin.latestAudit.length} icon={FileText} />
      </div>
    );
  }
  if (role === "university_admin" && admin) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi title="Students" value={admin.metrics.totalStudents} icon={Users} />
        <Kpi title="Invigilators" value={admin.metrics.totalInvigilators} icon={CheckCheck} />
        <Kpi title="Rooms" value={admin.metrics.totalRooms} icon={LayoutGrid} />
      </div>
    );
  }
  if (role === "student" && student) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi title="Upcoming exams" value={student.timetable.length} icon={CalendarClock} />
        <Kpi title="Outstanding balance" value={student.feeStatus.outstandingBalance} icon={CreditCard} />
        <Kpi title="Open complaints" value={student.complaints.length} icon={AlertCircle} />
      </div>
    );
  }
  if (role === "invigilator" && invigilator) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi title="Today" value={invigilator.todayAssignments.length} icon={CalendarClock} />
        <Kpi title="Upcoming" value={invigilator.upcomingAssignments.length} icon={LayoutGrid} />
        <Kpi title="History" value={invigilator.history.length} icon={FileText} />
      </div>
    );
  }
  if (role === "finance" && finance) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi title="Total students" value={finance.clearance.totalStudents} icon={Users} />
        <Kpi title="Cleared" value={finance.clearance.cleared} icon={CheckCheck} />
        <Kpi title="Outstanding" value={finance.clearance.outstanding} icon={AlertCircle} />
      </div>
    );
  }
  if (role === "lecturer" && lecturer) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
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
    <div className="grid gap-4 sm:grid-cols-3">
      <Kpi title="Notifications" value={0} icon={FileText} />
      <Kpi title="Tasks" value={0} icon={Wallet} />
      <Kpi title="Updates" value={0} icon={CheckCheck} />
    </div>
  );
}
