"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { FileText, Loader2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
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

type PayType = "all" | "student_fee" | "course_reg_payment" | "penalty_fee";

export default function MyPaymentsPage() {
  const me = useMe();
  const [typeFilter, setTypeFilter] = useState<PayType>("all");
  const [search, setSearch] = useState("");

  const payments = useQuery(api.students.listMyPayments, me.role === "student" ? {} : "skip") ?? [];

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        return (
          p.reference.toLowerCase().includes(term) ||
          (p.description ?? "").toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [payments, typeFilter, search]);

  const totals = useMemo(() => {
    return {
      paid: payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
      approved: payments.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0),
      pending: payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0),
    };
  }, [payments]);

  if (me.role !== "student") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only students can view their own payments.
      </div>
    );
  }

  async function exportPdf() {
    const tables: PdfTable[] = [
      {
        title: "My Payments",
        subtitle: me.fullName ?? "",
        columns: [
          { header: "Date", width: 100 },
          { header: "Type", width: 100 },
          { header: "Reference", width: 110 },
          { header: "Description", width: 150 },
          { header: "Amount", width: 60 },
          { header: "Status", width: 60 },
        ],
        rows: filtered.map((p) => [
          formatDateTime(p.createdAt),
          p.type.replace(/_/g, " "),
          p.reference,
          p.description ?? "—",
          p.amount.toLocaleString(),
          p.status,
        ]),
      },
    ];
    downloadPdf("my-payments.pdf", tables);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Payments"
        description="Your fee and registration payment history."
        actions={
          <button
            onClick={exportPdf}
            className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-3 text-xs hover:bg-muted"
          >
            <FileText className="size-3" /> Export PDF
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Paid</p>
          <p className="mt-1 text-lg font-semibold text-primary">{totals.paid.toLocaleString()}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Approved</p>
          <p className="mt-1 text-lg font-semibold">{totals.approved.toLocaleString()}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Pending</p>
          <p className="mt-1 text-lg font-semibold">{totals.pending.toLocaleString()}</p>
        </div>
      </div>

      <div className="rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Filter by reference or description…"
            className="h-8 flex-1 min-w-[200px] text-xs"
          />
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter((v as PayType) ?? "all")}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue>{typeFilter === "all" ? "All types" : typeFilter.replace(/_/g, " ")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="student_fee">Student fee</SelectItem>
              <SelectItem value="course_reg_payment">Course registration</SelectItem>
              <SelectItem value="penalty_fee">Penalty</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Separator />
        {payments === undefined ? (
          <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
            <Wallet className="size-3.5" /> No payments to show.
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {formatDateTime(p.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {p.type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px]">{p.reference}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {p.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {p.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "paid"
                            ? "default"
                            : p.status === "approved"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[10px] capitalize"
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
