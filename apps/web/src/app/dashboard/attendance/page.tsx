"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ClipboardList, Loader2, Shield } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { Input } from "@uni-exam-sys/ui/components/input";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import { Separator } from "@uni-exam-sys/ui/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@uni-exam-sys/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@uni-exam-sys/ui/components/table";

import { formatDateTime } from "@/lib/utils";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

const STATUS_OPTIONS: AttendanceStatus[] = ["present", "absent", "late", "excused"];

function statusBadge(status: AttendanceStatus) {
  const variant: "default" | "secondary" | "destructive" | "outline" = (() => {
    switch (status) {
      case "present":
        return "default";
      case "absent":
        return "destructive";
      case "late":
        return "secondary";
      case "excused":
        return "outline";
    }
  })();
  return (
    <Badge variant={variant} className="text-[10px] capitalize">
      {status}
    </Badge>
  );
}

export default function AttendancePage() {
  const me = useMe();
  const [universityFilter, setUniversityFilter] = useState<"all" | string>("all");
  const [search, setSearch] = useState("");
  const [selectedRegister, setSelectedRegister] = useState<{
    examScheduleId: Id<"examSchedules">;
    roomId: Id<"rooms">;
    registerId?: Id<"attendanceRegisters">;
  } | null>(null);

  const universities = useQuery(api.tenants.listUniversities, {}) ?? [];
  const scopedUniversityId =
    me.role === "super_admin"
      ? universityFilter === "all"
        ? undefined
        : (universityFilter as Id<"universities">)
      : me.universityId;

  const summary = useQuery(
    api.attendance.attendanceSummary,
    me.role === "super_admin" || me.role === "university_admin"
      ? { universityId: scopedUniversityId }
      : "skip",
  );

  const registerData = useQuery(
    api.attendance.getRegisterForExamRoom,
    selectedRegister ? { examScheduleId: selectedRegister.examScheduleId, roomId: selectedRegister.roomId } : "skip",
  );

  const markAttendance = useMutation(api.attendance.markAttendance);

  const filteredRows = useMemo(() => {
    if (!summary?.rows) return [];
    if (!search.trim()) return summary.rows;
    const term = search.trim().toLowerCase();
    return summary.rows.filter(
      (r) => r.roomName.toLowerCase().includes(term) || r.registerId.toLowerCase().includes(term),
    );
  }, [summary, search]);

  if (me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        You need admin access to review attendance.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance"
        description={
          me.role === "super_admin"
            ? "Review attendance across all tenants."
            : `Review attendance for ${me.university?.name ?? "this university"}.`
        }
      />

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase text-muted-foreground">Registers</p>
              <ClipboardList className="size-3.5 text-primary" />
            </div>
            <p className="mt-1 text-lg font-semibold">{summary.rows.length}</p>
            <p className="text-[10px] text-muted-foreground">
              {summary.rows.filter((r) => r.status === "finalized").length} finalized
            </p>
          </div>
          <div className="rounded-md border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase text-muted-foreground">Present</p>
              <Shield className="size-3.5 text-primary" />
            </div>
            <p className="mt-1 text-lg font-semibold">{summary.totals.present}</p>
            <p className="text-[10px] text-muted-foreground">
              {summary.totals.late} late
            </p>
          </div>
          <div className="rounded-md border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase text-muted-foreground">Absent</p>
              <Shield className="size-3.5 text-primary" />
            </div>
            <p className="mt-1 text-lg font-semibold">{summary.totals.absent}</p>
            <p className="text-[10px] text-muted-foreground">
              {summary.totals.excused} excused
            </p>
          </div>
          <div className="rounded-md border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase text-muted-foreground">Completion</p>
              <ClipboardList className="size-3.5 text-primary" />
            </div>
            <p className="mt-1 text-lg font-semibold">
              {(() => {
                if (summary.rows.length === 0) return "—";
                const total =
                  summary.totals.present +
                  summary.totals.absent +
                  summary.totals.late +
                  summary.totals.excused;
                const present =
                  summary.totals.present + summary.totals.late + summary.totals.excused;
                if (total === 0) return "—";
                return `${Math.round((present / total) * 100)}%`;
              })()}
            </p>
            <p className="text-[10px] text-muted-foreground">present equivalent</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-md border bg-card">
          <div className="flex flex-wrap items-center gap-2 p-3">
            <Input
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Filter by room..."
              className="h-8 flex-1 min-w-[160px] text-xs"
            />
            {me.role === "super_admin" ? (
              <Select
                value={universityFilter}
                onValueChange={(v) => setUniversityFilter((v as string) ?? "all")}
              >
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue>
                    {universityFilter === "all"
                      ? "All universities"
                      : universities.find((u) => u._id === universityFilter)?.name ?? "University"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All universities</SelectItem>
                  {universities.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
          <Separator />
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Counters</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow
                    key={row.registerId}
                    className={
                      selectedRegister?.registerId === row.registerId
                        ? "bg-muted/40"
                        : undefined
                    }
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{row.roomName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {row.examDate ?? "—"} · {row.startTime ?? "—"}–{row.endTime ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.status === "finalized" ? "secondary" : "outline"}
                        className="text-[10px] capitalize"
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {row.counters.present}P · {row.counters.absent}A · {row.counters.late}L · {row.counters.excused}E
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() =>
                          setSelectedRegister({
                            examScheduleId: row.examScheduleId,
                            roomId: row.roomId,
                            registerId: row.registerId,
                          })
                        }
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-xs text-muted-foreground">
                      No registers found. Invigilators will create them as they mark attendance.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between p-4">
            <div>
              <h2 className="text-sm font-semibold">Register detail</h2>
              <p className="text-[11px] text-muted-foreground">
                Admins can override finalized registers.
              </p>
            </div>
            {registerData?.register ? (
              <Badge
                variant={registerData.register.status === "finalized" ? "secondary" : "outline"}
                className="text-[10px] capitalize"
              >
                {registerData.register.status}
              </Badge>
            ) : null}
          </div>
          <Separator />
          {!selectedRegister ? (
            <div className="p-6 text-xs text-muted-foreground">
              Select a register on the left to review and update attendance.
            </div>
          ) : registerData === undefined ? (
            <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading register…
            </div>
          ) : registerData === null ? (
            <div className="p-6 text-xs text-muted-foreground">
              No register exists for this exam+room yet. The assigned invigilator will create it
              when they start marking.
            </div>
          ) : (
            <div className="p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>Total: {registerData.students.length}</span>
                <span>· Present: {registerData.counters.present}</span>
                <span>· Absent: {registerData.counters.absent}</span>
                <span>· Late: {registerData.counters.late}</span>
                <span>· Excused: {registerData.counters.excused}</span>
                <span>· Completion: {registerData.counters.completionPercent}%</span>
              </div>
              <ScrollArea className="max-h-[55vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Index</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marked</TableHead>
                      <TableHead className="text-right">Override</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registerData.students.map((s) => (
                      <TableRow key={s.attendanceId}>
                        <TableCell className="text-xs font-medium">{s.fullName}</TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {s.indexNumber}
                        </TableCell>
                        <TableCell>{statusBadge(s.status)}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {formatDateTime(s.markedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={s.status}
                            onValueChange={(v) =>
                              markAttendance({
                                registerId: registerData.register!._id,
                                studentId: s.studentDocId,
                                status: (v as AttendanceStatus) ?? s.status,
                                note: "Admin override",
                              })
                            }
                          >
                            <SelectTrigger className="ml-auto h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt} className="capitalize">
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
