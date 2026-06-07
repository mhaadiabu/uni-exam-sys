"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@uni-exam-sys/ui/components/tabs";

import { formatDate, roleLabel } from "@/lib/utils";

import { ClerkUserPicker } from "./_components/clerk-user-picker";
import { type ClerkUser, type Role } from "./_components/people-types";
import { ManageUserDialog } from "./_components/manage-user-dialog";

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
      <div className="rounded-md border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Plus className="size-3.5 text-primary" />
          <h2 className="text-sm font-semibold">Add student</h2>
        </div>
        <Separator className="mb-3" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Student ID</Label>
            <div className="flex items-center rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring">
              {me.university?.prefix ? (
                <span className="select-none border-r bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
                  {me.university.prefix}
                </span>
              ) : null}
              <Input
                value={newStudentId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStudentId(e.target.value)}
                placeholder={me.university?.prefix ? "0001" : "STD-0001"}
                className="h-8 flex-1 border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {me.university?.prefix
                ? `The prefix “${me.university.prefix}” is added automatically. Type only the suffix.`
                : "No prefix set for this university."}
            </p>
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

      <div className="rounded-md border bg-card">
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
                          variant="destructive"
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
    <div className="rounded-md border bg-card p-4">
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

function UsersTab() {
  const me = useMe();
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const universities = useQuery(api.tenants.listUniversities, {}) ?? [];

  const isSuperAdmin = me.role === "super_admin";

  // Resolve the listUsers query args. We branch on the caller's role
  // and the tenant filter, falling back to the user's own university
  // for non-super-admins. This sidesteps the PLATFORM-tenant isolation
  // that would otherwise hide every real-tenant user from a super admin.
  let users: Array<{
    _id: Id<"users">;
    externalId: string;
    universityId: Id<"universities">;
    role: Role;
    fullName: string;
    email: string;
    phone?: string;
    isActive: boolean;
    failedLoginAttempts: number;
    lockedUntil?: number;
    createdAt: number;
    updatedAt: number;
  }> = [];
  if (isSuperAdmin) {
    users =
      (useQuery(
        api.users.listUsers,
        tenantFilter === "all"
          ? { includeAllTenants: true, role: roleFilter || undefined }
          : {
              universityId: tenantFilter as Id<"universities">,
              role: roleFilter || undefined,
            },
      ) as typeof users) ?? [];
  } else if (me.universityId) {
    users =
      (useQuery(api.users.listUsers, {
        universityId: me.universityId,
        role: roleFilter || undefined,
      }) as typeof users) ?? [];
  } else {
    users =
      (useQuery(
        api.users.listUsers,
        { role: roleFilter || undefined },
      ) as typeof users) ?? [];
  }

  const updateUserRole = useMutation(api.users.updateUserRole);
  const reactivateUser = useMutation(api.users.reactivateUser);
  const deactivateUser = useMutation(api.users.deactivateUser);

  const [roleChangeUserId, setRoleChangeUserId] = useState<Id<"users"> | "">("");
  const [roleChangeNew, setRoleChangeNew] = useState<Role>("student");

  const [confirmDeactivateId, setConfirmDeactivateId] = useState<Id<"users"> | null>(null);
  const [tableReactivateId, setTableReactivateId] = useState<Id<"users"> | null>(null);

  // Clerk picker + manage dialog state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedClerkUser, setPickedClerkUser] = useState<ClerkUser | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

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

  async function handleReactivateFromTable() {
    if (!tableReactivateId) return;
    try {
      await reactivateUser({ userId: tableReactivateId });
      toast.success("User reactivated");
      setTableReactivateId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reactivate user");
    }
  }

  function openPickerForUser(user: ClerkUser) {
    setPickedClerkUser(user);
    setManageOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Search className="size-3.5 text-primary" />
          <h2 className="text-sm font-semibold">Users</h2>
          <Badge variant="secondary">{users.length}</Badge>
          <p className="ml-1 text-[11px] text-muted-foreground">
            Search Clerk for any account to add, transfer, or change its role.
          </p>
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
          {isSuperAdmin ? (
            <Select
              value={tenantFilter}
              onValueChange={(v) =>
                setTenantFilter(!v || v === "all" ? "all" : v)
              }
            >
              <SelectTrigger className="h-7 w-56 text-xs">
                <SelectValue>
                  {tenantFilter === "all"
                    ? "All universities"
                    : universities.find((u) => u._id === tenantFilter)?.name ??
                      "University"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All universities</SelectItem>
                {universities.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.name}
                    {u.code ? ` (${u.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              <Search className="mr-1 size-3.5" />
              Pick from Clerk
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
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
                          variant="destructive"
                          onClick={() => setConfirmDeactivateId(u._id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setTableReactivateId(u._id)}
                        >
                          Reactivate
                        </Button>
                      )}
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

      <ClerkUserPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        me={me}
        currentUniversityId={me.universityId}
        onPickUser={openPickerForUser}
      />

      <ManageUserDialog
        open={manageOpen}
        onOpenChange={(o) => {
          setManageOpen(o);
          if (!o) setPickedClerkUser(null);
        }}
        me={me}
        currentUniversityId={me.universityId}
        clerkUser={pickedClerkUser}
        onSuccess={() => setPickerOpen(false)}
      />

      <Dialog
        open={confirmDeactivateId !== null}
        onOpenChange={(open) => !open && setConfirmDeactivateId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate user?</DialogTitle>
            <DialogDescription>
              The user will lose access to the platform. You can re-enable them
              from the table or via the Clerk picker.
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

      <Dialog
        open={tableReactivateId !== null}
        onOpenChange={(open) => !open && setTableReactivateId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reactivate user?</DialogTitle>
            <DialogDescription>
              This restores the user&apos;s access without changing their role.
              For role changes, use the Clerk picker.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTableReactivateId(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleReactivateFromTable()}>
              Reactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
