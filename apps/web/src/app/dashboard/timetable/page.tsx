"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CalendarClock, Check, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@uni-exam-sys/ui/components/dialog";
import { Input } from "@uni-exam-sys/ui/components/input";
import { Label } from "@uni-exam-sys/ui/components/label";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@uni-exam-sys/ui/components/tabs";

import { roleLabel } from "@/lib/utils";

type Tab = "schedules" | "assignments";

export default function TimetablePage() {
  const me = useMe();
  const [tab, setTab] = useState<Tab>("schedules");

  if (me.role !== "university_admin" && me.role !== "super_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only university admins can manage exam schedules.
      </div>
    );
  }

  if (!me.universityId) {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        No university linked to your account.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Timetable"
        description="Course → exam schedules and invigilator assignments."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="schedules">
            <CalendarClock className="mr-1 size-3.5" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <UserPlus className="mr-1 size-3.5" />
            Invigilator assignments
          </TabsTrigger>
        </TabsList>
        <TabsContent value="schedules">
          <SchedulesPanel />
        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SchedulesPanel() {
  const me = useMe();
  const programs = useQuery(
    api.academics.listPrograms,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];
  const courses = useQuery(
    api.academics.listCourses,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];
  const rooms = useQuery(
    api.rooms.listRooms,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];
  const invigilators = useQuery(
    api.assignments.listInvigilatorProfiles,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];
  const schedules = useQuery(
    api.schedules.listSchedules,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];

  const createSchedule = useMutation(api.schedules.createSchedule);
  const updateSchedule = useMutation(api.schedules.updateSchedule);
  const deleteSchedule = useMutation(api.schedules.deleteSchedule);

  const [programId, setProgramId] = useState<Id<"programs"> | "">("");
  const [courseId, setCourseId] = useState<Id<"courses"> | "">("");
  const [roomId, setRoomId] = useState<Id<"rooms"> | "">("");
  const [invigilatorId, setInvigilatorId] = useState<Id<"invigilators"> | "">("");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<Id<"examSchedules"> | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editStatus, setEditStatus] = useState<"draft" | "published" | "ongoing" | "completed">("published");

  const [confirmDeleteId, setConfirmDeleteId] = useState<Id<"examSchedules"> | null>(null);

  async function handleCreate() {
    if (!me.universityId || !programId || !courseId || !examDate || !startTime || !endTime) {
      toast.error("Program, course, date, and time are required");
      return;
    }
    setCreating(true);
    try {
      await createSchedule({
        universityId: me.universityId,
        programId,
        courseId,
        examDate,
        startTime,
        endTime,
        roomId: roomId || undefined,
        invigilatorId: invigilatorId || undefined,
        status: "published",
      });
      toast.success("Schedule created");
      setCourseId("");
      setExamDate("");
      setStartTime("");
      setEndTime("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create schedule");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(id: Id<"examSchedules">) {
    try {
      await updateSchedule({
        scheduleId: id,
        examDate: editDate || undefined,
        startTime: editStartTime || undefined,
        endTime: editEndTime || undefined,
        status: editStatus,
      });
      toast.success("Schedule updated");
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update schedule");
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    try {
      await deleteSchedule({ scheduleId: confirmDeleteId });
      toast.success("Schedule deleted");
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete schedule");
    }
  }

  const coursesForProgram = programId
    ? courses.filter((c) => c.programId === programId)
    : courses;

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Plus className="size-3.5 text-primary" />
          <h2 className="text-sm font-semibold">Create schedule</h2>
        </div>
        <Separator className="mb-3" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Program</Label>
            <Select value={programId || undefined} onValueChange={(v) => { setProgramId(v as Id<"programs">); setCourseId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select program">
                  {programs.find((p) => p._id === programId)?.code ?? "Select program"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p._id} value={p._id}>{p.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Course</Label>
            <Select value={courseId || undefined} onValueChange={(v) => setCourseId(v as Id<"courses">)}>
              <SelectTrigger>
                <SelectValue placeholder="Select course">
                  {coursesForProgram.find((c) => c._id === courseId)?.code ?? "Select course"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {coursesForProgram.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Room</Label>
            <Select value={roomId || "none"} onValueChange={(v) => setRoomId((v === "none" ? "" : v) as Id<"rooms"> | "")}>
              <SelectTrigger>
                <SelectValue>
                  {roomId ? rooms.find((r) => r._id === roomId)?.code ?? "Room" : "No room"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No room</SelectItem>
                {rooms.map((r) => (
                  <SelectItem key={r._id} value={r._id}>{r.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Invigilator</Label>
            <Select value={invigilatorId || "none"} onValueChange={(v) => setInvigilatorId((v === "none" ? "" : v) as Id<"invigilators"> | "")}>
              <SelectTrigger>
                <SelectValue>
                  {invigilatorId
                    ? invigilators.find((i) => i._id === invigilatorId)?.fullName ?? "Invigilator"
                    : "No invigilator"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No invigilator</SelectItem>
                {invigilators.map((i) => (
                  <SelectItem key={i._id} value={i._id}>{i.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={examDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExamDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Start time</Label>
            <Input type="time" value={startTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>End time</Label>
            <Input type="time" value={endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              Create
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-sm font-semibold">Exam schedules</h2>
          <Badge variant="secondary">{schedules.length}</Badge>
        </div>
        <Separator />
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Invigilator</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s) =>
                editingId === s._id ? (
                  <TableRow key={s._id}>
                    <TableCell>
                      <Input
                        className="h-7 w-32 text-xs"
                        type="date"
                        value={editDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDate(e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Input
                          className="h-7 w-20 text-xs"
                          type="time"
                          value={editStartTime}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditStartTime(e.target.value)}
                        />
                        <Input
                          className="h-7 w-20 text-xs"
                          type="time"
                          value={editEndTime}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditEndTime(e.target.value)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{s.course?.code ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.program?.code ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.room?.code ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.invigilator?.fullName ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={editStatus} onValueChange={(v) => setEditStatus(v as typeof editStatus)}>
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue>{editStatus === "draft" ? "Draft" : editStatus === "published" ? "Published" : editStatus === "ongoing" ? "Ongoing" : "Completed"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="xs" onClick={() => void handleSave(s._id)}>
                          <Check className="mr-0.5 size-3" />
                          Save
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={s._id}>
                    <TableCell className="whitespace-nowrap text-xs">{s.examDate}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {s.startTime ?? "—"} – {s.endTime ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{s.course?.code ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.program?.code ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.room?.code ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.invigilator?.fullName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {roleLabel(s.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setEditingId(s._id);
                            setEditDate(s.examDate);
                            setEditStartTime(s.startTime ?? "");
                            setEditEndTime(s.endTime ?? "");
                            setEditStatus((s.status as typeof editStatus) ?? "published");
                          }}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => setConfirmDeleteId(s._id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ),
              )}
              {schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-xs text-muted-foreground">
                    No exam schedules yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <Dialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete schedule?</DialogTitle>
            <DialogDescription>
              This permanently removes the selected exam schedule. Deletion will fail if seating assignments already exist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              Delete schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssignmentsPanel() {
  const me = useMe();
  const schedules = useQuery(
    api.schedules.listSchedules,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];
  const invigilators = useQuery(
    api.assignments.listInvigilatorProfiles,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];
  const rooms = useQuery(
    api.rooms.listRooms,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];
  const assignments = useQuery(
    api.assignments.listInvigilatorAssignments,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];

  const createAssignment = useMutation(api.assignments.createInvigilatorAssignment);
  const deleteAssignment = useMutation(api.assignments.deleteInvigilatorAssignment);

  const [scheduleId, setScheduleId] = useState<Id<"examSchedules"> | "">("");
  const [invigilatorId, setInvigilatorId] = useState<Id<"invigilators"> | "">("");
  const [roomId, setRoomId] = useState<Id<"rooms"> | "">("");
  const [assignmentDate, setAssignmentDate] = useState("");
  const [creating, setCreating] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<Id<"invigilatorAssignments"> | null>(null);

  async function handleCreate() {
    if (!me.universityId || !scheduleId || !invigilatorId || !roomId || !assignmentDate) {
      toast.error("Schedule, invigilator, room, and date are required");
      return;
    }
    setCreating(true);
    try {
      await createAssignment({
        universityId: me.universityId,
        examScheduleId: scheduleId,
        invigilatorId,
        roomId,
        assignmentDate,
      });
      toast.success("Invigilator assigned");
      setAssignmentDate("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign invigilator");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    try {
      await deleteAssignment({ assignmentId: confirmDeleteId });
      toast.success("Assignment removed");
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove assignment");
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <UserPlus className="size-3.5 text-primary" />
          <h2 className="text-sm font-semibold">Assign invigilator</h2>
        </div>
        <Separator className="mb-3" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Schedule</Label>
            <Select value={scheduleId || undefined} onValueChange={(v) => setScheduleId(v as Id<"examSchedules">)}>
              <SelectTrigger>
                <SelectValue placeholder="Select schedule">
                  {(() => {
                    const s = schedules.find((x) => x._id === scheduleId);
                    return s ? `${s.course?.code ?? s.examDate} (${s.examDate})` : "Select schedule";
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {schedules.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.course?.code ?? "—"} — {s.examDate} {s.startTime ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Invigilator</Label>
            <Select value={invigilatorId || undefined} onValueChange={(v) => setInvigilatorId(v as Id<"invigilators">)}>
              <SelectTrigger>
                <SelectValue placeholder="Select invigilator">
                  {invigilators.find((i) => i._id === invigilatorId)?.fullName ?? "Select invigilator"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {invigilators.map((i) => (
                  <SelectItem key={i._id} value={i._id}>{i.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Room</Label>
            <Select value={roomId || undefined} onValueChange={(v) => setRoomId(v as Id<"rooms">)}>
              <SelectTrigger>
                <SelectValue placeholder="Select room">
                  {rooms.find((r) => r._id === roomId)?.code ?? "Select room"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r._id} value={r._id}>{r.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={assignmentDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignmentDate(e.target.value)} />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            <Button onClick={handleCreate} disabled={creating}>
              Assign
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-sm font-semibold">Current assignments</h2>
          <Badge variant="secondary">{assignments.length}</Badge>
        </div>
        <Separator />
        <ScrollArea className="max-h-[55vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invigilator</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a._id}>
                  <TableCell className="text-xs">{a.invigilator?.fullName ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {a.schedule?.examDate ?? "—"} {a.schedule?.courseId ? "" : ""}
                  </TableCell>
                  <TableCell className="text-xs">{a.room?.code ?? "—"}</TableCell>
                  <TableCell className="text-xs">{a.assignmentDate}</TableCell>
                  <TableCell>
                    <Button
                      size="xs"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => setConfirmDeleteId(a._id)}
                    >
                      <Trash2 className="mr-0.5 size-3" />
                      Unassign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-xs text-muted-foreground">
                    No assignments yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <Dialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unassign invigilator?</DialogTitle>
            <DialogDescription>
              This removes the selected invigilator assignment from the schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              Unassign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
