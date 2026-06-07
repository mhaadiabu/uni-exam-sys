"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, IdCard, Loader2, Plus, Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { Input } from "@uni-exam-sys/ui/components/input";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import { Separator } from "@uni-exam-sys/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@uni-exam-sys/ui/components/table";

import { formatDateTime } from "@/lib/utils";

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "printed") return "default";
  if (status === "ready" || status === "reprint_requested") return "secondary";
  return "outline";
}

export default function IdCardsPage() {
  const me = useMe();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkValidity, setBulkValidity] = useState(() => {
    const start = new Date();
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const students = useQuery(
    api.students.listStudents,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];
  const idCards = useQuery(
    api.idCards.listIdCards,
    me.universityId
      ? {
          universityId: me.universityId,
          ...(statusFilter !== "all" ? { status: statusFilter as "generated" | "ready" | "printed" | "reprint_requested" } : {}),
        }
      : "skip",
  ) ?? [];

  const generateBulk = useMutation(api.idCards.generateBulkIdCards);
  const markPrinted = useMutation(api.idCards.markIdCardPrinted);

  const cardsByStudent = useMemo(() => {
    const map = new Map<string, (typeof idCards)[number]>();
    for (const c of idCards) map.set(c.studentId, c);
    return map;
  }, [idCards]);

  const studentsWithoutCard = useMemo(() => {
    return students.filter((s) => !cardsByStudent.has(s._id));
  }, [students, cardsByStudent]);

  const filteredCards = useMemo(() => {
    if (!search.trim()) return idCards;
    const term = search.trim().toLowerCase();
    return idCards.filter(
      (c) =>
        c.student?.fullName.toLowerCase().includes(term) ||
        c.student?.indexNumber.toLowerCase().includes(term) ||
        c.qrCodeValue.toLowerCase().includes(term),
    );
  }, [idCards, search]);

  if (me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only admins can manage ID cards.
      </div>
    );
  }

  async function generateForAll() {
    if (!me.universityId) return;
    if (studentsWithoutCard.length === 0) {
      setFeedback("Every student already has a card.");
      return;
    }
    const result = await generateBulk({
      universityId: me.universityId,
      studentDocIds: studentsWithoutCard.map((s) => s._id),
      validityStart: bulkValidity.start,
      validityEnd: bulkValidity.end,
    });
    setFeedback(`Generated ${result.count} ID card${result.count === 1 ? "" : "s"}.`);
    setBulkOpen(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="ID Cards"
        description="Generate, print, and reissue student ID cards."
        actions={
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => setBulkOpen((v) => !v)}
          >
            <Plus className="mr-1 size-3" /> Bulk generate
          </Button>
        }
      />

      {feedback ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{feedback}</div>
      ) : null}

      {bulkOpen ? (
        <div className="rounded-md border bg-card p-4">
          <h2 className="text-sm font-semibold">Bulk generate</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Will create cards for {studentsWithoutCard.length} student
            {studentsWithoutCard.length === 1 ? "" : "s"} without a card.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[11px]">
              <span className="font-medium">Valid from</span>
              <input
                type="date"
                value={bulkValidity.start}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBulkValidity((v) => ({ ...v, start: e.target.value }))
                }
                className="h-8 rounded-md border bg-background px-2 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px]">
              <span className="font-medium">Valid until</span>
              <input
                type="date"
                value={bulkValidity.end}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBulkValidity((v) => ({ ...v, end: e.target.value }))
                }
                className="h-8 rounded-md border bg-background px-2 text-xs"
              />
            </label>
            <Button size="sm" className="h-8 text-xs" onClick={generateForAll}>
              <IdCard className="mr-1 size-3" /> Generate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setBulkOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Filter by student or QR…"
            className="h-8 flex-1 min-w-[200px] text-xs"
          />
          <div className="flex items-center gap-1 text-[11px]">
            {(["all", "generated", "ready", "printed", "reprint_requested"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={
                  "rounded-md border px-2 py-1 capitalize " +
                  (statusFilter === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground")
                }
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {filteredCards.length} cards
          </Badge>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Separator />
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Index</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCards === undefined ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-xs text-muted-foreground">
                    <Loader2 className="inline size-3 animate-spin" /> Loading…
                  </TableCell>
                </TableRow>
              ) : filteredCards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-xs text-muted-foreground">
                    No ID cards yet. Use bulk generate to create the first batch.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCards.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="text-xs font-medium">
                      {c.student?.fullName ?? "—"}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {c.student?.indexNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.status)} className="text-[10px] capitalize">
                        {c.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {c.validityStart} → {c.validityEnd}
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {formatDateTime(c.generatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status !== "printed" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => markPrinted({ idCardId: c._id })}
                        >
                          <Printer className="mr-1 size-3" /> Mark printed
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CheckCircle2 className="size-3" /> Printed {c.printedAt ? formatDateTime(c.printedAt) : ""}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
