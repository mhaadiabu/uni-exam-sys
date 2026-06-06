"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Loader2, Save, Wallet, X } from "lucide-react";
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
import { downloadPdf, type PdfTable } from "@/lib/reports";

export default function FeePaymentsPage() {
  const me = useMe();
  const [search, setSearch] = useState("");
  const [feeFilter, setFeeFilter] = useState<"all" | "cleared" | "outstanding">("all");
  const [editingId, setEditingId] = useState<Id<"students"> | null>(null);
  const [feeStatus, setFeeStatus] = useState<"cleared" | "outstanding">("cleared");
  const [outstanding, setOutstanding] = useState("0");
  const [reference, setReference] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const overview = useQuery(
    api.finance.listClearanceOverview,
    me.universityId ? { universityId: me.universityId } : "skip",
  );
  const payments = (useQuery(
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
      createdAt: number;
    }>;
    defaulterAttendance: Array<{
      studentId: string;
      fullName: string;
      feeStatus: "cleared" | "outstanding";
      attendanceStatus: "present" | "absent" | "late" | "excused";
    }>;
  };

  const updateClearance = useMutation(api.finance.updateStudentClearance);

  const studentPayments = useMemo(() => {
    return (payments.payments ?? []).filter((p) => p.type === "student_fee");
  }, [payments]);

  const filteredStudents = useMemo(() => {
    const rows = overview?.rows ?? [];
    if (!search.trim() && feeFilter === "all") return rows;
    return rows.filter((s) => {
      if (feeFilter !== "all" && s.feeStatus !== feeFilter) return false;
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        return (
          s.fullName.toLowerCase().includes(term) || s.indexNumber.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [overview, search, feeFilter]);

  if (me.role !== "finance" && me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only finance staff can manage payments.
      </div>
    );
  }

  async function saveClearance() {
    if (!editingId || !me.universityId) return;
    await updateClearance({
      universityId: me.universityId,
      studentDocId: editingId,
      feeStatus,
      outstandingBalance: Number(outstanding) || 0,
      reference: reference.trim() || "manual",
    });
    setFeedback(`Updated ${feeStatus}.`);
    setEditingId(null);
    setReference("");
  }

  async function exportPdf() {
    const tables: PdfTable[] = [
      {
        title: "Fee Payments",
        subtitle: me.university?.name ?? "",
        columns: [
          { header: "Index", width: 80 },
          { header: "Student", width: 130 },
          { header: "Status", width: 70 },
          { header: "Outstanding", width: 70 },
        ],
        rows: filteredStudents.map((s) => [
          s.indexNumber,
          s.fullName,
          s.feeStatus,
          String(s.outstandingBalance),
        ]),
      },
    ];
    downloadPdf("fee-payments.pdf", tables);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fee Payments"
        description="Manage student fee clearance and outstanding balances."
        actions={
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportPdf}>
            <Wallet className="mr-1 size-3" /> Export PDF
          </Button>
        }
      />

      {feedback ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{feedback}</div>
      ) : null}

      {overview ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-md border bg-card p-3 shadow-sm">
            <p className="text-[11px] uppercase text-muted-foreground">Total students</p>
            <p className="mt-1 text-lg font-semibold">{overview.totalStudents}</p>
          </div>
          <div className="rounded-md border bg-card p-3 shadow-sm">
            <p className="text-[11px] uppercase text-muted-foreground">Cleared</p>
            <p className="mt-1 text-lg font-semibold">{overview.cleared}</p>
          </div>
          <div className="rounded-md border bg-card p-3 shadow-sm">
            <p className="text-[11px] uppercase text-muted-foreground">Outstanding</p>
            <p className="mt-1 text-lg font-semibold text-destructive">{overview.outstanding}</p>
          </div>
          <div className="rounded-md border bg-card p-3 shadow-sm">
            <p className="text-[11px] uppercase text-muted-foreground">Total owed</p>
            <p className="mt-1 text-lg font-semibold">{overview.totalOutstanding.toLocaleString()}</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Filter by student or index…"
            className="h-8 flex-1 min-w-[200px] text-xs"
          />
          <Select
            value={feeFilter}
            onValueChange={(v) => setFeeFilter((v as "all" | "cleared" | "outstanding") ?? "all")}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue>
                {feeFilter === "all" ? "All students" : feeFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
              <SelectItem value="outstanding">Outstanding</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-md border bg-card shadow-sm">
          <Separator />
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Index</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-xs text-muted-foreground">
                      No students match.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell className="text-[11px] text-muted-foreground">{s.indexNumber}</TableCell>
                      <TableCell className="text-xs font-medium">{s.fullName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={s.feeStatus === "cleared" ? "default" : "destructive"}
                          className="text-[10px] capitalize"
                        >
                          {s.feeStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{s.outstandingBalance.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setEditingId(s._id);
                            setFeeStatus(s.feeStatus);
                            setOutstanding(String(s.outstandingBalance));
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <div className="rounded-md border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Update clearance</h2>
          {!editingId ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Pick a student to edit their fee status.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <Select
                value={feeStatus}
                onValueChange={(v) => setFeeStatus((v as "cleared" | "outstanding") ?? "cleared")}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue>{feeStatus}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleared">Cleared</SelectItem>
                  <SelectItem value="outstanding">Outstanding</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={outstanding}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOutstanding(e.target.value)}
                placeholder="Outstanding balance"
                className="h-9 text-xs"
              />
              <Input
                value={reference}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReference(e.target.value)}
                placeholder="Reference / receipt #"
                className="h-9 text-xs"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setEditingId(null)}
                >
                  <X className="mr-1 size-3" /> Cancel
                </Button>
                <Button size="sm" className="h-8 text-xs" onClick={saveClearance}>
                  <Save className="mr-1 size-3" /> Save
                </Button>
              </div>
            </div>
          )}
          <Separator className="my-4" />
          <h3 className="text-xs font-semibold">Recent fee payments</h3>
          <p className="text-[10px] text-muted-foreground">
            {studentPayments.length} record{studentPayments.length === 1 ? "" : "s"}.
          </p>
          <ScrollArea className="mt-2 max-h-[30vh]">
            <div className="space-y-1 text-[11px]">
              {studentPayments.slice(0, 20).map((p) => (
                <div key={p._id} className="flex items-center justify-between rounded border bg-muted/30 px-2 py-1">
                  <span>{p.reference}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={p.status === "paid" ? "default" : "secondary"}
                      className="text-[10px] capitalize"
                    >
                      {p.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateTime(p.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
