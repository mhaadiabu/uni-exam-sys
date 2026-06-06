"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCog,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@uni-exam-sys/ui/components/popover";
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

import { formatDate, roleLabel } from "@/lib/utils";

type Role = "super_admin" | "university_admin" | "lecturer" | "student" | "invigilator" | "finance";

export default function PeoplePage() {
  const me = useMe();

  if (me.role !== "university_admin" && me.role !== "super_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only admins can manage people.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="People"
        description="Students, lecturers, invigilators, finance officers, and admins for this university."
      />
      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="users">Users & roles</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <StudentsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StudentsTab() {
  const me = useMe();
  const programs = useQuery(
    api.academics.listPrograms,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];
  const [filterProgram, setFilterProgram] = useState<Id<"programs"> | "">("");
  const [search, setSearch] = useState("");
  const students = useQuery(
    api.students.listStudents,
    me.universityId
      ? { universityId: me.universityId, programId: filterProgram || undefined, search: search || undefined }
      : "skip",
  ) ?? [];

  const createStudent = useMutation(api.students.createStudent);
  const updateStudent = useMutation(api.students.updateStudent);
  const deleteStudent = useMutation(api.students.deleteStudent);
  const importCsv = useMutation(api.students.importStudentsCsv);

  const [newStudentId, setNewStudentId] = useState("");
  const [newIndex, setNewIndex] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newProgramId, setNewProgramId] = useState<Id<"programs"> | "">("");
  const [newSemester, setNewSemester] = useState(1);
  const [newYear, setNewYear] = useState("2025/2026");
  const [newFeeStatus, setNewFeeStatus] = useState<"cleared" | "outstanding">("outstanding");
  const [newBalance, setNewBalance] = useState(0);
  const [newLateReg, setNewLateReg] = useState(false);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<Id<"students"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSemester, setEditSemester] = useState(1);
  const [editFeeStatus, setEditFeeStatus] = useState<"cleared" | "outstanding">("outstanding");
  const [editBalance, setEditBalance] = useState(0);
  const [editLateReg, setEditLateReg] = useState(false);

  const [csvContent, setCsvContent] = useState("");
  const [csvProgramId, setCsvProgramId] = useState<Id<"programs"> | "">("");
  const [csvSemester, setCsvSemester] = useState(1);
  const [csvYear, setCsvYear] = useState("2025/2026");
  const [importing, setImporting] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<Id<"students"> | null>(null);

  function resetForm() {
    setNewStudentId("");
    setNewIndex("");
    setNewName("");
    setNewEmail("");
    setNewPhone("");
  }

  async function handleCreate() {
    if (!me.universityId || !newStudentId || !newIndex || !newName || !newProgramId) {
      toast.error("Student ID, index, name, and program are required");
      return;
    }
    setCreating(true);
    try {
      await createStudent({
        universityId: me.universityId,
        studentId: newStudentId,
        indexNumber: newIndex,
        fullName: newName,
        email: newEmail || undefined,
        phone: newPhone || undefined,
        programId: newProgramId,
        semester: newSemester,
        academicYear: newYear,
        feeStatus: newFeeStatus,
        outstandingBalance: newBalance,
        lateRegistration: newLateReg,
      });
      toast.success("Student created");
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create student");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(id: Id<"students">) {
    try {
      await updateStudent({
        studentDocId: id,
        fullName: editName || undefined,
        email: editEmail || undefined,
        phone: editPhone || undefined,
        semester: editSemester || undefined,
        feeStatus: editFeeStatus,
        outstandingBalance: editBalance,
        lateRegistration: editLateReg,
      });
      toast.success("Student updated");
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update student");
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    try {
      await deleteStudent({ studentDocId: confirmDeleteId });
      toast.success("Student deleted");
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete student");
    }
  }

  async function handleImport() {
    if (!me.universityId || !csvContent || !csvProgramId) {
      toast.error("CSV content and program are required");
      return;
    }
    setImporting(true);
    try {
      const result = await importCsv({
        universityId: me.universityId,
        csvContent,
        defaultProgramId: csvProgramId,
        defaultSemester: csvSemester,
        defaultAcademicYear: csvYear,
      });
      toast.success(`Imported ${result.imported} students (${result.errors.length} errors)`);
      setCsvContent("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import CSV");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Plus className="size-3.5 text-primary" />
          <h2 className="text-sm font-semibold">Add student</h2>
        </div>
        <Separator className="mb-3" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Student ID</Label>
            <Input
              value={newStudentId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStudentId(e.target.value)}
              placeholder="STD-0001"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Index number</Label>
            <Input
              value={newIndex}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewIndex(e.target.value)}
              placeholder="PS/ITC/22/0001"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Full name</Label>
            <Input
              value={newName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Program</Label>
            <Select
              value={newProgramId || undefined}
              onValueChange={(v) => setNewProgramId(v as Id<"programs">)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Program">
                  {programs.find((p) => p._id === newProgramId)?.code ?? "Program"}
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
            <Label>Semester</Label>
            <Input
              type="number"
              min={1}
              value={newSemester}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSemester(Number(e.target.value || 0))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Academic year</Label>
            <Input
              value={newYear}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewYear(e.target.value)}
              placeholder="2025/2026"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fee status</Label>
            <Select
              value={newFeeStatus}
              onValueChange={(v) => setNewFeeStatus(v as typeof newFeeStatus)}
            >
              <SelectTrigger>
                <SelectValue>{newFeeStatus === "cleared" ? "Cleared" : "Outstanding"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="outstanding">Outstanding</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail(e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={newPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPhone(e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Outstanding balance</Label>
            <Input
              type="number"
              min={0}
              value={newBalance}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBalance(Number(e.target.value || 0))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Late registration</Label>
            <Select
              value={newLateReg ? "yes" : "no"}
              onValueChange={(v) => setNewLateReg(v === "yes")}
            >
              <SelectTrigger>
                <SelectValue>{newLateReg ? "Yes" : "No"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            <Button onClick={handleCreate} disabled={creating}>
              Create student
            </Button>
          </div>
        </div>
      </div>

      <CsvImportCard
        csvContent={csvContent}
        setCsvContent={setCsvContent}
        csvProgramId={csvProgramId}
        setCsvProgramId={setCsvProgramId}
        csvSemester={csvSemester}
        setCsvSemester={setCsvSemester}
        csvYear={csvYear}
        setCsvYear={setCsvYear}
        programs={programs}
        importing={importing}
        onImport={handleImport}
      />

      <div className="rounded-md border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Students</h2>
            <Badge variant="secondary">{students.length}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Search name or ID"
                className="h-7 w-48 pl-7 text-xs"
              />
            </div>
            <Select
              value={filterProgram || "all"}
              onValueChange={(v) => setFilterProgram((v === "all" ? "" : v) as Id<"programs"> | "")}
            >
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue>
                  {filterProgram
                    ? programs.find((p) => p._id === filterProgram)?.code ?? "Program"
                    : "All programs"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programs</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p._id} value={p._id}>{p.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Index</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Sem</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const program = programs.find((p) => p._id === s.programId);
                return editingId === s._id ? (
                  <TableRow key={s._id}>
                    <TableCell className="font-mono text-xs">{s.studentId}</TableCell>
                    <TableCell>
                      <Input
                        className="h-7 text-xs"
                        value={editName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-xs">{s.indexNumber}</TableCell>
                    <TableCell className="text-xs">{program?.code ?? "—"}</TableCell>
                    <TableCell>
                      <Input
                        className="h-7 w-14 text-xs"
                        type="number"
                        value={editSemester}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditSemester(Number(e.target.value || 0))}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={editFeeStatus}
                        onValueChange={(v) => setEditFeeStatus(v as typeof editFeeStatus)}
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue>{editFeeStatus === "cleared" ? "Cleared" : "Outstanding"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cleared">Cleared</SelectItem>
                          <SelectItem value="outstanding">Outstanding</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-7 w-20 text-xs"
                        type="number"
                        value={editBalance}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditBalance(Number(e.target.value || 0))}
                      />
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
                    <TableCell className="font-mono text-xs">{s.studentId}</TableCell>
                    <TableCell className="text-xs font-medium">{s.fullName}</TableCell>
                    <TableCell className="text-xs">{s.indexNumber}</TableCell>
                    <TableCell className="text-xs">{program?.code ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.semester}</TableCell>
                    <TableCell>
                      <Badge
                        variant={s.feeStatus === "cleared" ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {s.feeStatus === "cleared" ? "Cleared" : "Outstanding"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{s.outstandingBalance.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setEditingId(s._id);
                            setEditName(s.fullName);
                            setEditEmail(s.email ?? "");
                            setEditPhone(s.phone ?? "");
                            setEditSemester(s.semester);
                            setEditFeeStatus(s.feeStatus as typeof editFeeStatus);
                            setEditBalance(s.outstandingBalance);
                            setEditLateReg(s.lateRegistration);
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
                );
              })}
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-xs text-muted-foreground">
                    No students match your filter.
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
            <DialogTitle>Delete student?</DialogTitle>
            <DialogDescription>
              This permanently removes the student record. Use with care.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CsvImportCard({
  csvContent,
  setCsvContent,
  csvProgramId,
  setCsvProgramId,
  csvSemester,
  setCsvSemester,
  csvYear,
  setCsvYear,
  programs,
  importing,
  onImport,
}: {
  csvContent: string;
  setCsvContent: (v: string) => void;
  csvProgramId: Id<"programs"> | "";
  setCsvProgramId: (v: Id<"programs"> | "") => void;
  csvSemester: number;
  setCsvSemester: (v: number) => void;
  csvYear: string;
  setCsvYear: (v: string) => void;
  programs: { _id: Id<"programs">; code: string; name: string }[];
  importing: boolean;
  onImport: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border bg-card p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Upload className="size-3.5 text-primary" />
          <h2 className="text-sm font-semibold">Bulk import from CSV</h2>
        </div>
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {open ? (
        <>
          <Separator className="my-3" />
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label>Default program</Label>
              <Select
                value={csvProgramId || undefined}
                onValueChange={(v) => setCsvProgramId(v as Id<"programs">)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Program">
                    {programs.find((p) => p._id === csvProgramId)?.code ?? "Program"}
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
              <Label>Default semester</Label>
              <Input
                type="number"
                min={1}
                value={csvSemester}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCsvSemester(Number(e.target.value || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default year</Label>
              <Input
                value={csvYear}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCsvYear(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => void onImport()} disabled={importing}>
                {importing ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="csv-content">CSV content</Label>
            <textarea
              id="csv-content"
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="studentId,indexNumber,fullName,email,phone,semester,academicYear,feeStatus,outstandingBalance,lateRegistration"
              className="h-32 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Headers: studentId,indexNumber,fullName,email,phone,semester,academicYear,feeStatus,outstandingBalance,lateRegistration
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

type ClerkUserOption = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
};

function UsersTab() {
  const me = useMe();
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const users = useQuery(
    api.users.listUsers,
    me.universityId
      ? { universityId: me.universityId, role: roleFilter || undefined }
      : { role: roleFilter || undefined },
  ) ?? [];

  const createUser = useMutation(api.users.createUser);
  const updateUserRole = useMutation(api.users.updateUserRole);
  const deactivateUser = useMutation(api.users.deactivateUser);
  const listClerkUsers = useAction(api.clerkUsers.listClerkUsers);

  const [adding, setAdding] = useState(false);
  const [addRole, setAddRole] = useState<Role | "">("");
  const [addExternalId, setAddExternalId] = useState("");
  const [addFullName, setAddFullName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addStaffId, setAddStaffId] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addDepartment, setAddDepartment] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  const [roleChangeUserId, setRoleChangeUserId] = useState<Id<"users"> | "">("");
  const [roleChangeNew, setRoleChangeNew] = useState<Role>("student");

  const [confirmDeactivateId, setConfirmDeactivateId] = useState<Id<"users"> | null>(null);

  // Clerk picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerResults, setPickerResults] = useState<ClerkUserOption[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const existingExternalIds = useMemo(
    () => new Set(users.map((u) => u.externalId).filter((id): id is string => Boolean(id))),
    [users],
  );

  async function refreshPicker() {
    setPickerLoading(true);
    try {
      const result = await listClerkUsers({
        limit: 50,
        query: pickerSearch || undefined,
      });
      setPickerResults(
        (result.users as ClerkUserOption[]).filter(
          (u) => !existingExternalIds.has(u.id),
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load Clerk users");
    } finally {
      setPickerLoading(false);
    }
  }

  async function handleCreate() {
    if (!addRole || !addExternalId || !addFullName || !addEmail) {
      toast.error("Role, Clerk user, name, and email are required");
      return;
    }
    setCreatingUser(true);
    try {
      const targetUniversityId =
        addRole === "super_admin"
          ? undefined
          : me.role === "super_admin"
            ? me.universityId ?? undefined
            : me.universityId;
      await createUser({
        universityId: targetUniversityId,
        role: addRole,
        externalId: addExternalId,
        fullName: addFullName,
        email: addEmail,
        phone: addPhone || undefined,
        staffId: addStaffId || undefined,
        title: addRole === "lecturer" ? addTitle || undefined : undefined,
        department: addRole === "lecturer" ? addDepartment || undefined : undefined,
      });
      toast.success(`${roleLabel(addRole)} created`);
      setAddRole("");
      setAddExternalId("");
      setAddFullName("");
      setAddEmail("");
      setAddPhone("");
      setAddStaffId("");
      setAddTitle("");
      setAddDepartment("");
      setAdding(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleUpdateRole() {
    if (!roleChangeUserId) return;
    try {
      await updateUserRole({ userId: roleChangeUserId, newRole: roleChangeNew });
      toast.success("User role updated");
      setRoleChangeUserId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    }
  }

  async function handleDeactivate() {
    if (!confirmDeactivateId) return;
    try {
      await deactivateUser({ userId: confirmDeactivateId });
      toast.success("User deactivated");
      setConfirmDeactivateId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to deactivate user");
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <UserCog className="size-3.5 text-primary" />
          <h2 className="text-sm font-semibold">Users</h2>
          <Badge variant="secondary">{users.length}</Badge>
        </div>
        <Separator className="mb-3" />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={roleFilter || "all"}
            onValueChange={(v) => setRoleFilter((v === "all" ? "" : v) as Role | "")}
          >
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue>
                {roleFilter ? roleLabel(roleFilter) : "All roles"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="university_admin">University admin</SelectItem>
              <SelectItem value="lecturer">Lecturer</SelectItem>
              <SelectItem value="invigilator">Invigilator</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              {me.role === "super_admin" ? (
                <SelectItem value="super_admin">Super admin</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Popover
              open={pickerOpen}
              onOpenChange={(o) => {
                setPickerOpen(o);
                if (o) void refreshPicker();
              }}
            >
              <PopoverTrigger
                render={(props) => (
                  <Button
                    variant="outline"
                    size="sm"
                    {...props}
                    onClick={() => setPickerOpen(true)}
                  >
                    <Search className="mr-1 size-3.5" />
                    Pick from Clerk
                  </Button>
                )}
              />
              <PopoverContent className="w-80 p-0" align="end">
                <div className="border-b p-2">
                  <Input
                    autoFocus
                    value={pickerSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setPickerSearch(e.target.value);
                      void refreshPicker();
                    }}
                    placeholder="Search Clerk users"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto p-1">
                  {pickerLoading ? (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                      Loading Clerk users...
                    </p>
                  ) : pickerResults.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                      No matching Clerk users.
                    </p>
                  ) : (
                    pickerResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-xs hover:bg-muted"
                        onClick={() => {
                          setAddExternalId(u.id);
                          setAddFullName(u.fullName);
                          setAddEmail(u.email ?? "");
                          setPickerOpen(false);
                          setAdding(true);
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{u.fullName}</p>
                          {u.email ? (
                            <p className="truncate text-muted-foreground">{u.email}</p>
                          ) : null}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Button size="sm" onClick={() => setAdding((v) => !v)}>
              <Plus className="mr-1 size-3.5" />
              Add user
            </Button>
          </div>
        </div>
        {adding ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={addRole || undefined}
                onValueChange={(v) => setAddRole(v as Role)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Role">
                    {addRole ? roleLabel(addRole) : "Role"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {me.role === "super_admin" ? (
                    <SelectItem value="super_admin">Super admin</SelectItem>
                  ) : null}
                  <SelectItem value="university_admin">University admin</SelectItem>
                  <SelectItem value="lecturer">Lecturer</SelectItem>
                  <SelectItem value="invigilator">Invigilator</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Clerk user ID</Label>
              <Input
                value={addExternalId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddExternalId(e.target.value)}
                placeholder="user_..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input
                value={addFullName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={addEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={addPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Staff ID (lecturer/invigilator)</Label>
              <Input
                value={addStaffId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddStaffId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Title (lecturer)</Label>
              <Input
                value={addTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddTitle(e.target.value)}
                placeholder="Dr., Prof., etc."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department (lecturer)</Label>
              <Input
                value={addDepartment}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddDepartment(e.target.value)}
              />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-4">
              <Button onClick={handleCreate} disabled={creatingUser}>
                Create user
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-md border bg-card shadow-sm">
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-44">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u._id}>
                  <TableCell className="text-xs font-medium">{u.fullName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {roleChangeUserId === u._id ? (
                      <div className="flex flex-col gap-1.5">
                        <Select
                          value={roleChangeNew}
                          onValueChange={(v) => setRoleChangeNew(v as Role)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue>{roleLabel(roleChangeNew)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {me.role === "super_admin" ? (
                              <SelectItem value="super_admin">Super admin</SelectItem>
                            ) : null}
                            <SelectItem value="university_admin">University admin</SelectItem>
                            <SelectItem value="lecturer">Lecturer</SelectItem>
                            <SelectItem value="invigilator">Invigilator</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Button size="xs" onClick={() => void handleUpdateRole()}>
                            Save
                          </Button>
                          <Button size="xs" variant="outline" onClick={() => setRoleChangeUserId("")}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        {roleLabel(u.role)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge variant="default" className="text-[10px]">Active</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setRoleChangeUserId(u._id);
                          setRoleChangeNew(u.role as Role);
                        }}
                        disabled={u.role === "super_admin" && me.role !== "super_admin"}
                      >
                        Change role
                      </Button>
                      {u.isActive ? (
                        <Button
                          size="xs"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => setConfirmDeactivateId(u._id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-3.5" />
                      No users match your filter.
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <Dialog
        open={confirmDeactivateId !== null}
        onOpenChange={(open) => !open && setConfirmDeactivateId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate user?</DialogTitle>
            <DialogDescription>
              The user will lose access to the platform. You can re-enable by changing their role.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDeactivateId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDeactivate()}>
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
