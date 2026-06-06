"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { FileText, GraduationCap, Loader2 } from "lucide-react";
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

const GRADE_POINTS: Record<string, number> = { A: 4.0, B: 3.5, C: 3.0, D: 2.5, E: 2.0, F: 0.0 };

export default function MyResultsPage() {
  const me = useMe();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "approved" | "submitted" | "rejected" | "draft">("all");

  const results = useQuery(api.students.listMyResults, {}) ?? [];

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        return (
          r.course?.code.toLowerCase().includes(term) ||
          r.course?.name.toLowerCase().includes(term) ||
          r.lecturer?.fullName.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [results, filter, search]);

  const gpa = useMemo(() => {
    const approved = results.filter((r) => r.status === "approved" && r.grade);
    if (approved.length === 0) return null;
    const total = approved.reduce((sum, r) => sum + (GRADE_POINTS[r.grade ?? "F"] ?? 0), 0);
    return (total / approved.length).toFixed(2);
  }, [results]);

  if (me.role !== "student") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only students can view their own results.
      </div>
    );
  }

  async function exportPdf() {
    const tables: PdfTable[] = [
      {
        title: "My Results",
        subtitle: me.fullName ?? "",
        columns: [
          { header: "Code", width: 60 },
          { header: "Course", width: 150 },
          { header: "Score", width: 50 },
          { header: "Grade", width: 40 },
          { header: "Lecturer", width: 120 },
          { header: "Status", width: 60 },
        ],
        rows: filtered.map((r) => [
          r.course?.code ?? "—",
          r.course?.name ?? "—",
          `${r.score}/${r.maxScore}`,
          r.grade ?? "—",
          r.lecturer?.fullName ?? "—",
          r.status,
        ]),
      },
    ];
    downloadPdf("my-results.pdf", tables);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Results"
        description="Your grades across all courses and semesters."
        actions={
          <button
            onClick={exportPdf}
            className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-3 text-xs shadow-sm hover:bg-muted"
          >
            <FileText className="size-3" /> Export PDF
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Cumulative GPA</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <GraduationCap className="size-4 text-primary" />
            {gpa ?? "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Based on {results.filter((r) => r.status === "approved").length} approved result
            {results.filter((r) => r.status === "approved").length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Total entries</p>
          <p className="mt-1 text-2xl font-semibold">{results.length}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Latest update</p>
          <p className="mt-1 text-xs font-medium">
            {results.length > 0 ? formatDateTime(Math.max(...results.map((r) => r.updatedAt))) : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Filter by course, lecturer…"
            className="h-8 flex-1 min-w-[200px] text-xs"
          />
          <Select
            value={filter}
            onValueChange={(v) => setFilter((v as "all" | "approved" | "submitted" | "rejected" | "draft") ?? "all")}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue>{filter === "all" ? "All statuses" : filter}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm">
        <Separator />
        {results === undefined ? (
          <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading results…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">
            No results match your filter. Once lecturers upload, they will appear here.
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Lecturer</TableHead>
                  <TableHead>Year/Sem</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{r.course?.code ?? "—"}</span>
                        <span className="text-[10px] text-muted-foreground">{r.course?.name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{r.lecturer?.fullName ?? "—"}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {r.academicYear} · S{r.semester}
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
                      <Badge
                        variant={
                          r.status === "approved"
                            ? "default"
                            : r.status === "rejected"
                              ? "destructive"
                              : r.status === "submitted"
                                ? "secondary"
                                : "outline"
                        }
                        className="text-[10px] capitalize"
                      >
                        {r.status}
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
