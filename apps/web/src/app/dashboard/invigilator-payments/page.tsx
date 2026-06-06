"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Plus, Wallet, X } from "lucide-react";
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

export default function InvigilatorPaymentsPage() {
  const me = useMe();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "paid">("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [invigilatorId, setInvigilatorId] = useState<Id<"invigilators"> | "">("");
  const [sessions, setSessions] = useState("1");
  const [includeBonus, setIncludeBonus] = useState(true);
  const [reference, setReference] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const invigilators =
    useQuery(
      api.assignments.listInvigilatorProfiles,
      me.universityId ? { universityId: me.universityId } : "skip",
    ) ?? [];
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
  const invPayments = allPayments.filter(
    (p) => p.type === "invigilator_payment" || p.type === "attendance_bonus",
  );

  const createPayment = useMutation(api.finance.createInvigilatorPayment);
  const updateStatus = useMutation(api.finance.updatePaymentStatus);

  const filtered = useMemo(() => {
    return invPayments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const inv = invigilators.find((i) => i._id === p.invigilatorId);
        return (
          p.reference.toLowerCase().includes(term) ||
          (inv?.fullName.toLowerCase().includes(term) ?? false) ||
          (inv?.staffId.toLowerCase().includes(term) ?? false)
        );
      }
      return true;
    });
  }, [invPayments, statusFilter, search, invigilators]);

  if (me.role !== "finance" && me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only finance staff can manage invigilator payments.
      </div>
    );
  }

  async function submit() {
    if (!invigilatorId || !me.universityId) {
      setFeedback("Pick an invigilator first.");
      return;
    }
    const inv = invigilators.find((i) => i._id === invigilatorId);
    if (!inv) return;
    await createPayment({
      universityId: me.universityId,
      invigilatorId,
      sessions: Number(sessions) || 1,
      includeAttendanceBonus: includeBonus,
      reference: reference.trim() || `INV-${inv.staffId}`,
    });
    setFeedback("Payment recorded.");
    setInvigilatorId("");
    setSessions("1");
    setReference("");
    setComposeOpen(false);
  }

  const totals = useMemo(() => {
    return {
      pending: invPayments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0),
      approved: invPayments.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0),
      paid: invPayments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
    };
  }, [invPayments]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invigilator Payments"
        description="Compensate invigilators for sessions and attendance bonuses."
        actions={
          <Button size="sm" className="h-8 text-xs" onClick={() => setComposeOpen((v) => !v)}>
            <Plus className="mr-1 size-3" /> Create payment
          </Button>
        }
      />

      {feedback ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{feedback}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Pending</p>
          <p className="mt-1 text-lg font-semibold">{totals.pending.toLocaleString()}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Approved</p>
          <p className="mt-1 text-lg font-semibold">{totals.approved.toLocaleString()}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Paid</p>
          <p className="mt-1 text-lg font-semibold text-primary">{totals.paid.toLocaleString()}</p>
        </div>
      </div>

      {composeOpen ? (
        <div className="rounded-md border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Create invigilator payment</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Select
              value={invigilatorId || "none"}
              onValueChange={(v) => setInvigilatorId(v === "none" ? "" : ((v as Id<"invigilators">) ?? ""))}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue>
                  {invigilatorId
                    ? invigilators.find((i) => i._id === invigilatorId)?.fullName ?? "Pick invigilator"
                    : "Pick invigilator"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Pick invigilator</SelectItem>
                {invigilators.map((i) => (
                  <SelectItem key={i._id} value={i._id}>
                    {i.fullName} · {i.staffId} · rate {i.ratePerSession}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={sessions}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSessions(e.target.value)}
              placeholder="Sessions"
              className="h-9 text-xs"
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={includeBonus}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncludeBonus(e.target.checked)}
              />
              Include attendance bonus
            </label>
            <Input
              value={reference}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReference(e.target.value)}
              placeholder="Reference"
              className="h-9 text-xs"
            />
          </div>
          {(() => {
            const inv = invigilators.find((i) => i._id === invigilatorId);
            if (!inv) return null;
            const total = inv.ratePerSession * (Number(sessions) || 0) + (includeBonus ? inv.attendanceBonus : 0);
            return (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Estimated total: {total.toLocaleString()} ({inv.ratePerSession}/session × {sessions}
                {includeBonus ? ` + ${inv.attendanceBonus} bonus` : ""})
              </p>
            );
          })()}
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

      <div className="rounded-md border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Filter by invigilator, reference…"
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

      <div className="rounded-md border bg-card shadow-sm">
        <Separator />
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invigilator</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
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
                    No invigilator payments yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const inv = invigilators.find((i) => i._id === p.invigilatorId);
                  return (
                    <TableRow key={p._id}>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium">{inv?.fullName ?? "—"}</span>
                          <span className="text-[10px] text-muted-foreground">{inv?.staffId ?? ""}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px]">{p.reference}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {p.type.replace(/_/g, " ")}
                        </Badge>
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
