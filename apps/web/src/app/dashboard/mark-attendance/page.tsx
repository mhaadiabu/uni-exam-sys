"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, ClipboardList, Loader2, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
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
  const variant =
    status === "present"
      ? "default"
      : status === "absent"
        ? "destructive"
        : status === "late"
          ? "secondary"
          : "outline";
  return (
    <Badge variant={variant} className="text-[10px] capitalize">
      {status}
    </Badge>
  );
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function MarkAttendancePage() {
  const me = useMe();
  const [selected, setSelected] = useState<{
    examScheduleId: Id<"examSchedules">;
    roomId: Id<"rooms">;
    registerId?: Id<"attendanceRegisters">;
  } | null>(null);
  const [signature, setSignature] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const invigilatorProfiles =
    useQuery(api.assignments.listInvigilatorProfiles, me.universityId ? { universityId: me.universityId } : "skip") ??
    [];
  const myProfile = useMemo(
    () => invigilatorProfiles.find((p) => p.userId === me._id) ?? null,
    [invigilatorProfiles, me._id],
  );

  const dashboard = useQuery(
    api.dashboard.invigilatorDashboard,
    me.universityId && myProfile
      ? { universityId: me.universityId, todayDate: todayIso(), invigilatorId: myProfile._id }
      : me.universityId
        ? { universityId: me.universityId, todayDate: todayIso() }
        : "skip",
  );

  const registerData = useQuery(
    api.attendance.getRegisterForExamRoom,
    selected ? { examScheduleId: selected.examScheduleId, roomId: selected.roomId } : "skip",
  );

  const createRegister = useMutation(api.attendance.createRegister);
  const markAttendance = useMutation(api.attendance.markAttendance);
  const bulkMarkAttendance = useMutation(api.attendance.bulkMarkAttendance);
  const finalizeAttendance = useMutation(api.attendance.finalizeAttendance);

  const myAssignments = useMemo(() => {
    if (!dashboard) return [];
    return [...dashboard.todayAssignments, ...dashboard.upcomingAssignments];
  }, [dashboard]);

  async function ensureRegister(examScheduleId: Id<"examSchedules">, roomId: Id<"rooms">) {
    if (!me.universityId || !myProfile) return;
    await createRegister({
      universityId: me.universityId,
      examScheduleId,
      roomId,
      invigilatorId: myProfile._id,
    });
  }

  async function markAll(status: AttendanceStatus) {
    if (!registerData?.register) return;
    const studentIds = registerData.students.map((s) => s.studentDocId);
    if (studentIds.length === 0) return;
    await bulkMarkAttendance({
      registerId: registerData.register._id,
      status,
      studentIds,
    });
    setConfirmation(`Marked ${studentIds.length} students as ${status}.`);
  }

  async function finalize() {
    if (!registerData?.register) return;
    if (!signature.trim()) {
      setConfirmation("Please provide a signature before finalizing.");
      return;
    }
    await finalizeAttendance({
      registerId: registerData.register._id,
      signature: signature.trim(),
    });
    setConfirmation("Attendance finalized and submitted to admin.");
    setSignature("");
  }

  if (me.role !== "invigilator" && me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only invigilators can mark attendance.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mark Attendance"
        description="Live register for the rooms you are invigilating."
      />

      {confirmation ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{confirmation}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <div className="rounded-md border bg-card shadow-sm">
          <div className="flex items-center gap-2 p-4">
            <ClipboardList className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">My assignments</h2>
          </div>
          <Separator />
          {!myProfile ? (
            <div className="p-4 text-xs text-muted-foreground">
              You don&apos;t have an invigilator profile yet. Ask your university admin to assign
              one.
            </div>
          ) : dashboard === undefined ? (
            <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading assignments…
            </div>
          ) : myAssignments.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground">
              No active assignments. Once a room is assigned, it will appear here.
            </div>
          ) : (
            <ScrollArea className="max-h-[55vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myAssignments.map((a) => (
                    <TableRow
                      key={a.assignment._id}
                      className={
                        selected?.examScheduleId === a.schedule?._id &&
                        selected?.roomId === a.room?._id
                          ? "bg-muted/40"
                          : undefined
                      }
                    >
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {a.schedule?.courseId
                              ? `Course #${a.schedule.courseId.slice(-6)}`
                              : "—"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {a.assignment.assignmentDate} · {a.schedule?.startTime ?? "—"}–
                            {a.schedule?.endTime ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {a.room?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={a.attendanceStatus === "finalized" ? "secondary" : "outline"}
                          className="text-[10px] capitalize"
                        >
                          {a.attendanceStatus ?? "draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={async () => {
                            if (!a.schedule || !a.room) return;
                            const next = {
                              examScheduleId: a.schedule._id,
                              roomId: a.room._id,
                            };
                            setSelected(next);
                            await ensureRegister(next.examScheduleId, next.roomId);
                          }}
                        >
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>

        <div className="rounded-md border bg-card shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div>
              <h2 className="text-sm font-semibold">Register</h2>
              <p className="text-[11px] text-muted-foreground">
                Changes are saved immediately. Finalize at the end of the exam.
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
          {!selected ? (
            <div className="p-6 text-xs text-muted-foreground">
              Pick an assignment on the left to start marking.
            </div>
          ) : registerData === undefined ? (
            <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading register…
            </div>
          ) : registerData === null ? (
            <div className="p-6 text-xs text-muted-foreground">
              The register could not be created. Try opening the assignment again.
            </div>
          ) : (
            <div className="p-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>Total: {registerData.students.length}</span>
                <span>· Present: {registerData.counters.present}</span>
                <span>· Absent: {registerData.counters.absent}</span>
                <span>· Late: {registerData.counters.late}</span>
                <span>· Excused: {registerData.counters.excused}</span>
                <span>· Completion: {registerData.counters.completionPercent}%</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => markAll("present")}
                  disabled={registerData.register.status === "finalized"}
                >
                  <CheckCircle2 className="mr-1 size-3" /> Mark all present
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => markAll("absent")}
                  disabled={registerData.register.status === "finalized"}
                >
                  Mark all absent
                </Button>
              </div>
              <ScrollArea className="max-h-[45vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Index</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marked</TableHead>
                      <TableHead className="text-right">Update</TableHead>
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
                              })
                            }
                            disabled={registerData.register.status === "finalized"}
                          >
                            <SelectTrigger className="ml-auto h-7 w-24 text-xs">
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

              {registerData.register.status !== "finalized" ? (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <h3 className="text-xs font-semibold">Finalize register</h3>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Once submitted, you cannot make further changes as invigilator. Admins can
                    still override.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={signature}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignature(e.target.value)}
                      placeholder="Type your full name as signature"
                      className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
                    />
                    <Button size="sm" className="h-8 text-xs" onClick={finalize}>
                      Finalize & submit
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
