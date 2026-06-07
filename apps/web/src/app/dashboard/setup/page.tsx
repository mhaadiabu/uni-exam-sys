"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  BookOpen,
  Check,
  Pencil,
  Plus,
  School,
  Trash2,
  X,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@uni-exam-sys/ui/components/tabs";

type Tab = "programs" | "courses" | "rooms";

export default function SetupPage() {
  const me = useMe();
  const [tab, setTab] = useState<Tab>("programs");

  if (me.role !== "university_admin" && me.role !== "super_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only university admins can manage setup data.
      </div>
    );
  }

  if (!me.universityId && me.role !== "super_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        No university is linked to your account.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Setup"
        description="Foundation data — programs, courses, and rooms. Build the academic structure before scheduling exams."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="programs">
            <School className="mr-1 size-3.5" />
            Programs
          </TabsTrigger>
          <TabsTrigger value="courses">
            <BookOpen className="mr-1 size-3.5" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="rooms">
            <School className="mr-1 size-3.5" />
            Rooms
          </TabsTrigger>
        </TabsList>
        <TabsContent value="programs">
          <ProgramsPanel />
        </TabsContent>
        <TabsContent value="courses">
          <CoursesPanel />
        </TabsContent>
        <TabsContent value="rooms">
          <RoomsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProgramsPanel() {
  const me = useMe();
  const programs = useQuery(
    api.academics.listPrograms,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];

  const createProgram = useMutation(api.academics.createProgram);
  const updateProgram = useMutation(api.academics.updateProgram);

  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(8);

  const [editingId, setEditingId] = useState<Id<"programs"> | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editDuration, setEditDuration] = useState(8);

  async function handleCreate() {
    if (!me.universityId) {
      toast.error("No university selected");
      return;
    }
    if (!code || !name) {
      toast.error("Code and name are required");
      return;
    }
    setCreating(true);
    try {
      await createProgram({
        universityId: me.universityId,
        code,
        name,
        durationSemesters: duration,
      });
      toast.success("Program created");
      setCode("");
      setName("");
      setDuration(8);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create program");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(id: Id<"programs">) {
    try {
      await updateProgram({
        programId: id,
        code: editCode || undefined,
        name: editName || undefined,
        durationSemesters: editDuration || undefined,
      });
      toast.success("Program updated");
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update program");
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Plus className="size-3.5 text-primary" />
          <h2 className="text-sm font-semibold">Create program</h2>
        </div>
        <Separator className="mb-3" />
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="prog-code">Code</Label>
            <Input
              id="prog-code"
              value={code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toUpperCase())}
              placeholder="BSC-CS"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prog-name">Name</Label>
            <Input
              id="prog-name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="BSc Computer Science"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prog-duration">Semesters</Label>
            <Input
              id="prog-duration"
              type="number"
              min={1}
              value={duration}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuration(Number(e.target.value || 0))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-sm font-semibold">All programs</h2>
          <Badge variant="secondary">{programs.length}</Badge>
        </div>
        <Separator />
        <ScrollArea className="max-h-[55vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Semesters</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((p) =>
                editingId === p._id ? (
                  <TableRow key={p._id}>
                    <TableCell>
                      <Input
                        className="h-7 text-xs"
                        value={editCode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCode(e.target.value.toUpperCase())}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-7 text-xs"
                        value={editName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-7 w-16 text-xs"
                        type="number"
                        value={editDuration}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDuration(Number(e.target.value || 0))}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="xs" onClick={() => void handleSave(p._id)}>
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
                  <TableRow key={p._id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="text-xs">{p.name}</TableCell>
                    <TableCell className="text-xs">{p.durationSemesters}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setEditingId(p._id);
                          setEditCode(p.code);
                          setEditName(p.name);
                          setEditDuration(p.durationSemesters);
                        }}
                      >
                        <Pencil className="mr-0.5 size-3" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ),
              )}
              {programs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-xs text-muted-foreground">
                    No programs yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}

function CoursesPanel() {
  const me = useMe();
  const programs = useQuery(
    api.academics.listPrograms,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];
  const [filterProgramId, setFilterProgramId] = useState<Id<"programs"> | "">("");
  const courses = useQuery(
    api.academics.listCourses,
    me.universityId
      ? { universityId: me.universityId, programId: filterProgramId || undefined }
      : "skip",
  ) ?? [];

  const createCourse = useMutation(api.academics.createCourse);
  const updateCourse = useMutation(api.academics.updateCourse);

  const [programId, setProgramId] = useState<Id<"programs"> | "">("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [semester, setSemester] = useState(1);
  const [creditHours, setCreditHours] = useState(3);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<Id<"courses"> | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editSemester, setEditSemester] = useState(1);
  const [editCreditHours, setEditCreditHours] = useState(3);

  async function handleCreate() {
    if (!me.universityId || !programId || !code || !name) {
      toast.error("Program, code, and name are required");
      return;
    }
    setCreating(true);
    try {
      await createCourse({
        universityId: me.universityId,
        programId,
        code,
        name,
        semester,
        creditHours,
      });
      toast.success("Course created");
      setCode("");
      setName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create course");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(id: Id<"courses">) {
    try {
      await updateCourse({
        courseId: id,
        code: editCode || undefined,
        name: editName || undefined,
        semester: editSemester || undefined,
        creditHours: editCreditHours || undefined,
      });
      toast.success("Course updated");
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update course");
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Plus className="size-3.5 text-primary" />
          <h2 className="text-sm font-semibold">Create course</h2>
        </div>
        <Separator className="mb-3" />
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label>Program</Label>
            <Select value={programId || undefined} onValueChange={(v) => setProgramId(v as Id<"programs">)}>
              <SelectTrigger>
                <SelectValue placeholder="Select program">
                  {programs.find((p) => p._id === programId)?.code ?? "Select program"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.code} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toUpperCase())}
              placeholder="CS101"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="Intro to Programming"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sem</Label>
            <Input
              type="number"
              min={1}
              value={semester}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSemester(Number(e.target.value || 0))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Credits</Label>
            <Input
              type="number"
              min={0}
              value={creditHours}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreditHours(Number(e.target.value || 0))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Courses</h2>
            <Badge variant="secondary">{courses.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Filter by program:</span>
            <Select
              value={filterProgramId || "all"}
              onValueChange={(v) => setFilterProgramId((v === "all" ? "" : v) as Id<"programs"> | "")}
            >
              <SelectTrigger className="h-7 w-48 text-xs">
                <SelectValue>
                  {filterProgramId
                    ? programs.find((p) => p._id === filterProgramId)?.code ?? "Program"
                    : "All programs"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programs</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        <ScrollArea className="max-h-[55vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Sem</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) =>
                editingId === c._id ? (
                  <TableRow key={c._id}>
                    <TableCell>
                      <Input
                        className="h-7 text-xs"
                        value={editCode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCode(e.target.value.toUpperCase())}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-7 text-xs"
                        value={editName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-xs">
                      {programs.find((p) => p._id === c.programId)?.code ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-7 w-14 text-xs"
                        type="number"
                        value={editSemester}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditSemester(Number(e.target.value || 0))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-7 w-14 text-xs"
                        type="number"
                        value={editCreditHours}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCreditHours(Number(e.target.value || 0))}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="xs" onClick={() => void handleSave(c._id)}>
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
                  <TableRow key={c._id}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell className="text-xs">{c.name}</TableCell>
                    <TableCell className="text-xs">
                      {programs.find((p) => p._id === c.programId)?.code ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{c.semester}</TableCell>
                    <TableCell className="text-xs">{c.creditHours}</TableCell>
                    <TableCell>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setEditingId(c._id);
                          setEditCode(c.code);
                          setEditName(c.name);
                          setEditSemester(c.semester);
                          setEditCreditHours(c.creditHours);
                        }}
                      >
                        <Pencil className="mr-0.5 size-3" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ),
              )}
              {courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-xs text-muted-foreground">
                    No courses yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}

function RoomsPanel() {
  const me = useMe();
  const rooms = useQuery(
    api.rooms.listRooms,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];

  const createRoom = useMutation(api.rooms.createRoom);
  const updateRoom = useMutation(api.rooms.updateRoom);
  const deleteRoom = useMutation(api.rooms.deleteRoom);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [capacity, setCapacity] = useState(100);
  const [location, setLocation] = useState("");
  const [roomType, setRoomType] = useState<"hall" | "lab" | "small_class" | "special_needs">("hall");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<Id<"rooms"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editCapacity, setEditCapacity] = useState(100);
  const [editLocation, setEditLocation] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<Id<"rooms"> | null>(null);

  async function handleCreate() {
    if (!me.universityId || !name || !code) {
      toast.error("Name and code are required");
      return;
    }
    setCreating(true);
    try {
      await createRoom({
        universityId: me.universityId,
        name,
        code,
        roomType,
        capacity,
        location: location || undefined,
        specialNeedsSupport: roomType === "special_needs",
      });
      toast.success("Room created");
      setName("");
      setCode("");
      setCapacity(100);
      setLocation("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create room");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(id: Id<"rooms">) {
    try {
      await updateRoom({
        roomId: id,
        name: editName || undefined,
        code: editCode || undefined,
        capacity: editCapacity || undefined,
        location: editLocation || undefined,
      });
      toast.success("Room updated");
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update room");
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    try {
      await deleteRoom({ roomId: confirmDeleteId });
      toast.success("Room deleted");
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete room");
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Plus className="size-3.5 text-primary" />
          <h2 className="text-sm font-semibold">Create room</h2>
        </div>
        <Separator className="mb-3" />
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_2fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toUpperCase())}
              placeholder="R101"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="Main Hall"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Capacity</Label>
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCapacity(Number(e.target.value || 0))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input
              value={location}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
              placeholder="Block A, Floor 2"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={roomType} onValueChange={(v) => setRoomType(v as typeof roomType)}>
              <SelectTrigger>
                <SelectValue>
                  {roomType === "hall" ? "Hall" : roomType === "lab" ? "Lab" : roomType === "small_class" ? "Small class" : "Special needs"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hall">Hall</SelectItem>
                <SelectItem value="lab">Lab</SelectItem>
                <SelectItem value="small_class">Small class</SelectItem>
                <SelectItem value="special_needs">Special needs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-sm font-semibold">All rooms</h2>
          <Badge variant="secondary">{rooms.length}</Badge>
        </div>
        <Separator />
        <ScrollArea className="max-h-[55vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((r) =>
                editingId === r._id ? (
                  <TableRow key={r._id}>
                    <TableCell>
                      <Input
                        className="h-7 text-xs"
                        value={editCode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCode(e.target.value.toUpperCase())}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-7 text-xs"
                        value={editName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-xs">{r.roomType}</TableCell>
                    <TableCell>
                      <Input
                        className="h-7 w-16 text-xs"
                        type="number"
                        value={editCapacity}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCapacity(Number(e.target.value || 0))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-7 text-xs"
                        value={editLocation}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditLocation(e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="xs" onClick={() => void handleSave(r._id)}>
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
                  <TableRow key={r._id}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell className="text-xs">{r.name}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {r.roomType === "small_class" ? "Small class" : r.roomType === "special_needs" ? "Special needs" : r.roomType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.capacity}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.location ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setEditingId(r._id);
                            setEditCode(r.code);
                            setEditName(r.name);
                            setEditCapacity(r.capacity);
                            setEditLocation(r.location ?? "");
                          }}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => setConfirmDeleteId(r._id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ),
              )}
              {rooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-xs text-muted-foreground">
                    No rooms yet.
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
            <DialogTitle>Delete room?</DialogTitle>
            <DialogDescription>
              This removes the room record. Deletion will fail if the room is referenced by existing schedules.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              Delete room
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
