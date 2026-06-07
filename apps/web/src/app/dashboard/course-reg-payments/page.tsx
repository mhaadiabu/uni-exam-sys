"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Loader2, Plus, Wallet, X } from "lucide-react";
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

export default function CourseRegPaymentsPage() {
  const me = useMe();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "paid">("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [studentId, setStudentId] = useState<Id<"students"> | "">("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const reports = (useQuery(
    api.finance.listFinanceReports,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? { payments: [], defaulterAttendance: [] }) as {
    payments: Array<{
      _id: Id<"paymentRecords">;
      type: string;
      status: "pending" | "approved" | "paid";
      amount: number;
      reference: string;
      description?: string;
      studentId?: Id<"students">;
      invigilatorId?: Id<"invigilators">;
      createdAt: number;
    }>;
    defaulterAttendance: Array<{
      studentId: string;
      fullName: string;
      feeStatus: "cleared" | "outstanding";
      attendanceStatus: "present" | "absent" | "late" | "excused";
    }>;
  };
  const allPayments = reports.payments;
  const regPayments = allPayments.filter((p) => p.type === "course_reg_payment");
  const students = useQuery(api.students.listStudents, me.universityId ? { universityId: me.universityId } : "skip") ?? [];

  const createPayment = useMutation(api.finance.createCourseRegPayment);
  const updateStatus = useMutation(api.finance.updatePaymentStatus);

  const filtered = useMemo(() => {
    return regPayments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const student = students.find((s) => s._id === p.studentId);
        return (
          p.reference.toLowerCase().includes(term) ||
          (p.description ?? "").toLowerCase().includes(term) ||
          (student?.fullName.toLowerCase().includes(term) ?? false)
        );
      }
      return true;
    });
  }, [regPayments, statusFilter, search, students]);

  if (me.role !== "finance" && me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only finance staff can process course registration payments.
      </div>
    );
  }

  async function submit() {
    if (!studentId || !amount || !me.universityId) {
      setFeedback("Pick a student and enter an amount.");
      return;
    }
    await createPayment({
      universityId: me.universityId,
      studentDocId: studentId,
      amount: Number(amount),
      reference: reference.trim() || "course-reg",
      description: description.trim() || undefined,
    });
    setFeedback("Payment recorded.");
    setStudentId("");
    setAmount("");
    setReference("");
    setDescription("");
    setComposeOpen(false);
  }

  const totals = useMemo(() => {
    return {
      pending: regPayments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0),
      approved: regPayments.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0),
      paid: regPayments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
    };
  }, [regPayments]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Course Registration Payments"
        description="Record and process course registration payments."
        actions={
          <Button size="sm" className="h-8 text-xs" onClick={() => setComposeOpen((v) => !v)}>
            <Plus className="mr-1 size-3" /> New payment
          </Button>
        }
      />

      {feedback ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{feedback}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Pending</p>
          <p className="mt-1 text-lg font-semibold">{totals.pending.toLocaleString()}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Approved</p>
          <p className="mt-1 text-lg font-semibold">{totals.approved.toLocaleString()}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Paid</p>
          <p className="mt-1 text-lg font-semibold text-primary">{totals.paid.toLocaleString()}</p>
        </div>
      </div>

      {composeOpen ? (
        <div className="rounded-md border bg-card p-4">
          <h2 className="text-sm font-semibold">New course registration payment</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Select
              value={studentId || "none"}
              onValueChange={(v) => setStudentId(v === "none" ? "" : ((v as Id<"students">) ?? ""))}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue>
                  {studentId
                    ? students.find((s) => s._id === studentId)?.fullName ?? "Pick a student"
                    : "Pick a student"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Pick a student</SelectItem>
                {students.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.fullName} · {s.indexNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              placeholder="Amount"
              className="h-9 text-xs"
            />
            <Input
              value={reference}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReference(e.target.value)}
              placeholder="Reference / receipt #"
              className="h-9 text-xs"
            />
            <Input
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="h-9 text-xs"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setComposeOpen(false)}>
              <X className="mr-1 size-3" /> Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={submit}>
              <CheckCircle2 className="mr-1 size-3" /> Record
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Filter by student, reference…"
            className="h-8 flex-1 min-w-[200px] text-xs"
          />
          <div className="flex items-center gap-1 text-[11px]">
            {(["all", "pending", "approved", "paid"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={
                  "rounded-md border px-2 py-1 capitalize " +
                  (statusFilter === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Separator />
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-xs text-muted-foreground">
                    No course registration payments yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const student = students.find((s) => s._id === p.studentId);
                  return (
                    <TableRow key={p._id}>
                      <TableCell className="text-xs">{student?.fullName ?? "—"}</TableCell>
                      <TableCell className="text-[11px]">{p.reference}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {p.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{p.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={p.status === "paid" ? "default" : p.status === "approved" ? "secondary" : "outline"}
                          className="text-[10px] capitalize"
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {formatDateTime(p.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={p.status}
                          onValueChange={(v) =>
                            updateStatus({
                              paymentRecordId: p._id,
                              status: (v as "pending" | "approved" | "paid") ?? p.status,
                            })
                          }
                        >
                          <SelectTrigger className="ml-auto h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
