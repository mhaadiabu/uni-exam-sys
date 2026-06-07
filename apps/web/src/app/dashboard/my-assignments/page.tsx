"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Calendar, CalendarClock, ClipboardList, History, Loader2, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@uni-exam-sys/ui/components/card";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import { Separator } from "@uni-exam-sys/ui/components/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@uni-exam-sys/ui/components/tabs";

import { downloadPdf, type PdfTable } from "@/lib/reports";

type AssignmentRow = {
  assignment: {
    _id: string;
    assignmentDate: string;
    notes?: string | null;
  };
  schedule: {
    _id: string;
    examDate: string;
    startTime?: string | null;
    endTime?: string | null;
    courseId?: string;
  } | null;
  room: { _id: string; name: string; code: string } | null;
  attendanceStatus: string;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function statusBadge(status: string) {
  const variant = status === "finalized" ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="text-[10px] capitalize">
      {status === "draft" ? "not started" : status}
    </Badge>
  );
}

function AssignmentTable({ rows, empty }: { rows: AssignmentRow[]; empty: string }) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
        <ClipboardList className="size-3.5" /> {empty}
      </div>
    );
  }
  return (
    <ScrollArea className="max-h-[55vh]">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Time</th>
            <th className="px-3 py-2 text-left">Course</th>
            <th className="px-3 py-2 text-left">Room</th>
            <th className="px-3 py-2 text-left">Register</th>
            <th className="px-3 py-2 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.assignment._id} className="border-t">
              <td className="px-3 py-2 whitespace-nowrap">{r.assignment.assignmentDate}</td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {r.schedule?.startTime ?? "—"} – {r.schedule?.endTime ?? "—"}
              </td>
              <td className="px-3 py-2 font-medium">
                {r.schedule?.courseId ? `#${String(r.schedule.courseId).slice(-6)}` : "—"}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <MapPin className="size-3 text-muted-foreground" />
                  {r.room?.name ?? "—"}
                </div>
              </td>
              <td className="px-3 py-2">{statusBadge(r.attendanceStatus)}</td>
              <td className="px-3 py-2 text-[11px] text-muted-foreground">
                {r.assignment.notes ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

export default function MyAssignmentsPage() {
  const me = useMe();
  const [tab, setTab] = useState<"today" | "upcoming" | "history">("today");

  const invigilatorProfiles =
    useQuery(api.assignments.listInvigilatorProfiles, me.universityId ? { universityId: me.universityId } : "skip") ?? [];
  const myProfile = useMemo(
    () => invigilatorProfiles.find((p) => p.userId === me._id) ?? null,
    [invigilatorProfiles, me._id],
  );

  const today = todayIso();
  const dashboard = useQuery(
    api.dashboard.invigilatorDashboard,
    me.universityId && myProfile
      ? { universityId: me.universityId, todayDate: today, invigilatorId: myProfile._id }
      : me.universityId
        ? { universityId: me.universityId, todayDate: today }
        : "skip",
  );

  if (me.role !== "invigilator" && me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only invigilators can view their assignments.
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="space-y-4">
        <PageHeader title="My Assignments" description="Rooms and dates you are scheduled to invigilate." />
        <Card>
          <CardHeader>
            <CardTitle>No invigilator profile</CardTitle>
            <CardDescription>
              Your account is not yet linked to an invigilator profile. Ask your university admin to
              create one and assign you to a room.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    );
  }

  if (dashboard === undefined) {
    return (
      <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading assignments…
      </div>
    );
  }

  const todayRows = dashboard.todayAssignments;
  const upcomingRows = dashboard.upcomingAssignments;
  const historyRows = dashboard.history;

  function exportList(rows: AssignmentRow[], label: string) {
    const tables: PdfTable[] = [
      {
        title: `My Assignments — ${label}`,
        subtitle: `${me.fullName ?? ""} · ${myProfile?.staffId ?? ""}`,
        columns: [
          { header: "Date", width: 80 },
          { header: "Time", width: 90 },
          { header: "Course", width: 80 },
          { header: "Room", width: 80 },
          { header: "Register", width: 70 },
        ],
        rows: rows.map((r) => [
          r.assignment.assignmentDate,
          `${r.schedule?.startTime ?? "—"} – ${r.schedule?.endTime ?? "—"}`,
          r.schedule?.courseId ? `#${String(r.schedule.courseId).slice(-6)}` : "—",
          r.room?.name ?? "—",
          r.attendanceStatus,
        ]),
      },
    ];
    downloadPdf(`assignments-${label.toLowerCase()}.pdf`, tables);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Assignments"
        description="Rooms and dates you are scheduled to invigilate."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportList(todayRows, "Today")}
              disabled={todayRows.length === 0}
              className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-3 text-xs hover:bg-muted disabled:opacity-50"
            >
              <Calendar className="size-3" /> Export today
            </button>
            <button
              onClick={() => exportList(upcomingRows, "Upcoming")}
              disabled={upcomingRows.length === 0}
              className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-3 text-xs hover:bg-muted disabled:opacity-50"
            >
              <CalendarClock className="size-3" /> Export upcoming
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Today</p>
          <p className="mt-1 text-lg font-semibold text-primary">{todayRows.length}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Upcoming</p>
          <p className="mt-1 text-lg font-semibold">{upcomingRows.length}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Past</p>
          <p className="mt-1 text-lg font-semibold">{historyRows.length}</p>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <div className="p-3">
            <TabsList>
              <TabsTrigger value="today">
                <Calendar className="mr-1 size-3.5" /> Today
              </TabsTrigger>
              <TabsTrigger value="upcoming">
                <CalendarClock className="mr-1 size-3.5" /> Upcoming
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-1 size-3.5" /> History
              </TabsTrigger>
            </TabsList>
          </div>
          <Separator />
          <TabsContent value="today">
            <AssignmentTable rows={todayRows} empty="No assignments scheduled for today." />
          </TabsContent>
          <TabsContent value="upcoming">
            <AssignmentTable rows={upcomingRows} empty="No upcoming assignments." />
          </TabsContent>
          <TabsContent value="history">
            <AssignmentTable rows={historyRows} empty="No past assignments yet." />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
