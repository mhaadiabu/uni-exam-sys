"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, FileText, Loader2, X } from "lucide-react";
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

type ResultStatus = "draft" | "submitted" | "approved" | "rejected";

const STATUS_VARIANT: Record<ResultStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  submitted: "secondary",
  approved: "default",
  rejected: "destructive",
};

export default function ResultsPage() {
  const me = useMe();
  const [statusFilter, setStatusFilter] = useState<"all" | ResultStatus>("all");
  const [search, setSearch] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const results = useQuery(
    api.lecturers.listAllResults,
    me.universityId
      ? {
          universityId: me.universityId,
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        }
      : "skip",
  ) ?? [];

  const review = useMutation(api.lecturers.reviewCourseResult);

  const filtered = useMemo(() => {
    if (!search.trim()) return results;
    const term = search.trim().toLowerCase();
    return results.filter(
      (r) =>
        r.student?.fullName.toLowerCase().includes(term) ||
        r.student?.indexNumber.toLowerCase().includes(term) ||
        r.course?.name.toLowerCase().includes(term) ||
        r.course?.code.toLowerCase().includes(term),
    );
  }, [results, search]);

  const counts = useMemo(() => {
    const map: Record<ResultStatus, number> = { draft: 0, submitted: 0, approved: 0, rejected: 0 };
    for (const r of results) map[r.status] += 1;
    return map;
  }, [results]);

  if (me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only admins can review results.
      </div>
    );
  }

  async function exportPdf() {
    const tables: PdfTable[] = [
      {
        title: "Course Results",
        subtitle: me.university?.name ?? "",
        columns: [
          { header: "Index", width: 80 },
          { header: "Student", width: 120 },
          { header: "Course", width: 80 },
          { header: "Name", width: 130 },
          { header: "Score", width: 50 },
          { header: "Grade", width: 40 },
          { header: "Status", width: 60 },
        ],
        rows: filtered.map((r) => [
          r.student?.indexNumber ?? "—",
          r.student?.fullName ?? "—",
          r.course?.code ?? "—",
          r.course?.name ?? "—",
          `${r.score}/${r.maxScore}`,
          r.grade ?? "—",
          r.status,
        ]),
      },
    ];
    downloadPdf("course-results.pdf", tables);
  }

  async function decide(resultId: Id<"courseResults">, decision: "approved" | "rejected") {
    await review({ resultId, decision, note: reviewNote.trim() || undefined });
    setReviewNote("");
    setFeedback(`Result ${decision}.`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Results"
        description="Review and publish course results."
        actions={
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportPdf}>
            <FileText className="mr-1 size-3" /> Export PDF
          </Button>
        }
      />

      {feedback ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{feedback}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        {(["draft", "submitted", "approved", "rejected"] as ResultStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={
              "rounded-md border bg-card p-3 text-left shadow-sm " +
              (statusFilter === s ? "border-primary" : "")
            }
          >
            <p className="text-[11px] uppercase text-muted-foreground">{s}</p>
            <p className="mt-1 text-lg font-semibold">{counts[s]}</p>
          </button>
        ))}
      </div>

      <div className="rounded-md border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Filter by student, index, course…"
            className="h-8 flex-1 min-w-[200px] text-xs"
          />
          <button
            onClick={() => setStatusFilter("all")}
            className={
              "rounded-md border px-2 py-1 text-[11px] " +
              (statusFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")
            }
          >
            All ({results.length})
          </button>
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm">
        <Separator />
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-xs text-muted-foreground">
                    No results to review.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{r.student?.fullName ?? "—"}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {r.student?.indexNumber ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{r.course?.code ?? "—"}</span>
                        <span className="text-[10px] text-muted-foreground">{r.course?.name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.score}/{r.maxScore}
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        ({Math.round((r.score / r.maxScore) * 100)}%)
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {r.grade ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status]} className="text-[10px] capitalize">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {formatDateTime(r.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "submitted" || r.status === "draft" ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => decide(r._id, "approved")}
                          >
                            <CheckCircle2 className="mr-1 size-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive"
                            onClick={() => decide(r._id, "rejected")}
                          >
                            <X className="mr-1 size-3" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          {r.reviewerNote ?? "—"}
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

      <div className="rounded-md border bg-card p-3 shadow-sm">
        <p className="text-[11px] font-medium">Review note (optional)</p>
        <p className="text-[10px] text-muted-foreground">
          This note is attached to the next decision you make.
        </p>
        <input
          type="text"
          value={reviewNote}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewNote(e.target.value)}
          placeholder="e.g. Score reconciled with moderation sheet"
          className="mt-2 h-8 w-full rounded-md border bg-background px-2 text-xs"
        />
      </div>
    </div>
  );
}
