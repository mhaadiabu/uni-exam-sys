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
  Info,
  LayoutGrid,
  Users,
  Wallet,
  Bell,
  MailOpen,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@uni-exam-sys/ui/components/card";
import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@uni-exam-sys/ui/components/dialog";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import { Separator } from "@uni-exam-sys/ui/components/separator";

import { Kpi } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";
import { formatDateTime, roleLabel } from "@/lib/utils";

/**
 * Render the dashboard home UI for the current user, including role-specific KPI metrics and a notifications panel with read-state updates.
 *
 * Displays role-scoped KPI tiles, lists recent notifications (up to 8), and provides a detail dialog for each notification.
 * Opening a notification shows its full content and will mark it as read if it was unread.
 *
 * @returns The dashboard home page React element
 */
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
  const markRead = useMutation(api.communications.markNotificationRead);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications],
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const openNotification = openId
    ? notifications.find((n) => n._id === openId) ?? null
    : null;

  async function openNotificationById(id: string) {
    setOpenId(id);
    const target = notifications.find((n) => n._id === id);
    if (target && !target.readAt) {
      try {
        await markRead({ notificationId: id as never });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not mark notification as read",
        );
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{me.fullName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {roleLabel(me.role)}
          {me.university ? ` · ${me.university.name}` : ""}
        </p>
      </div>

      {me.role === "student" && studentDashboard?.isAutoEnrolled ? (
        <div className="flex items-start gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">Your profile was created automatically.</p>
            <p className="mt-0.5 text-muted-foreground">
              You&apos;re enrolled as a placeholder until your university admin sets your program,
              semester, and fee status. You won&apos;t be able to register for courses until your
              fees are cleared or late registration is approved.
            </p>
          </div>
        </div>
      ) : null}

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
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <Badge variant="default" className="text-[10px]">
                {unreadCount} new
              </Badge>
            ) : null}
            <Badge variant="secondary">{notifications.length}</Badge>
          </div>
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
              {notifications.slice(0, 8).map((n) => {
                const isUnread = !n.readAt;
                return (
                  <button
                    key={n._id}
                    type="button"
                    onClick={() => void openNotificationById(n._id)}
                    className={
                      "flex w-full items-start gap-2 px-6 py-3 text-left transition-colors hover:bg-muted/50 " +
                      (isUnread ? "bg-primary/5" : "")
                    }
                  >
                    {isUnread ? (
                      <span
                        className="mt-1 size-1.5 shrink-0 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    ) : (
                      <MailOpen className="mt-0.5 size-3 shrink-0 text-muted-foreground/50" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          "truncate text-xs " + (isUnread ? "font-semibold" : "font-medium")
                        }
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[10px] tabular-nums text-muted-foreground/60">
                        {formatDateTime(n.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      <Dialog open={openNotification !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-lg">
          {openNotification ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{openNotification.title}</DialogTitle>
                <DialogDescription className="text-[11px]">
                  {formatDateTime(openNotification.createdAt)} ·{" "}
                  {openNotification.roleScope === "all"
                    ? "Everyone"
                    : roleLabel(openNotification.roleScope)}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 px-3 py-2 text-xs leading-relaxed">
                {openNotification.body}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setOpenId(null)}
                >
                  <X className="mr-1 size-3" /> Close
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Render a 3-tile KPI grid tailored to the given user role using the provided dashboard data.
 *
 * @param role - The active user role (e.g., `"super_admin"`, `"university_admin"`, `"student"`, `"invigilator"`, `"finance"`, `"lecturer"`).
 * @param superAdmin - Super admin dashboard metrics (total universities, total users, recent audits).
 * @param admin - University admin dashboard metrics (total students, invigilators, rooms).
 * @param student - Student dashboard data (timetable, fee status, complaints, auto-enrollment flag).
 * @param invigilator - Invigilator dashboard data (today's assignments, upcoming assignments, history).
 * @param finance - Finance dashboard data (clearance totals and payments).
 * @param lecturer - Lecturer dashboard data (courses count, upcoming exams, result counts).
 * @returns A React element containing three KPI tiles for the specified role; if the role-specific data is not available, renders a default three-tile grid with zeroed values.
 */
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
  student: { timetable: unknown[]; feeStatus: { outstandingBalance: number }; complaints: unknown[]; isAutoEnrolled: boolean } | null | undefined;
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
