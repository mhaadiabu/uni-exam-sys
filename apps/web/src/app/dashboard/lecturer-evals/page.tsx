"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { AlertCircle, MessageSquare, Star } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";
import { StarRating } from "@/components/star-rating";
import { formatDateTime } from "@/lib/utils";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@uni-exam-sys/ui/components/card";
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

const DIMENSION_LABELS = [
  { key: "teaching", label: "Teaching" },
  { key: "content", label: "Content" },
  { key: "engagement", label: "Engagement" },
  { key: "punctuality", label: "Punctuality" },
  { key: "fairness", label: "Fairness" },
] as const;

type DimKey = (typeof DIMENSION_LABELS)[number]["key"];

/**
 * Renders the administrator-facing Lecturer Evaluations dashboard with KPIs, term filtering, and per-course aggregated metrics.
 *
 * Displays university-level KPIs (overall rating, courses, responses, comments), a filter for academic terms, and a table of per-course aggregates that can be expanded to show free-text comments. If the current user is not a university or super admin, renders an access-restricted message instead.
 *
 * @returns The dashboard UI as a React element.
 */
export default function LecturerEvalsPage() {
  const me = useMe();
  const [filter, setFilter] = useState<{ academicYear: string; semester: number } | "all">("all");

  const terms = useQuery(api.lecturerEvaluations.listEvaluationTerms, {}) ?? [];
  const aggregates = useQuery(
    api.lecturerEvaluations.listAggregatedEvaluations,
    filter === "all"
      ? me.universityId
        ? { universityId: me.universityId }
        : "skip"
      : me.universityId
        ? { universityId: me.universityId, academicYear: filter.academicYear, semester: filter.semester }
        : "skip",
  ) ?? [];

  const overall = useMemo(() => {
    const valid = aggregates.map((a) => a.aggregate.overall).filter((n) => n > 0);
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }, [aggregates]);

  const totals = useMemo(() => {
    return {
      responses: aggregates.reduce((s, a) => s + a.aggregate.count, 0),
      comments: aggregates.reduce((s, a) => s + a.aggregate.comments.length, 0),
      courses: aggregates.length,
    };
  }, [aggregates]);

  if (me.role !== "university_admin" && me.role !== "super_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only admins can view lecturer evaluations.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lecturer Evaluations"
        description="Aggregated anonymous student feedback for every lecturer and course in this university."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">University overall</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <Star className="size-4 text-amber-400" />
            {overall ? overall.toFixed(2) : "—"}
            <span className="text-xs font-normal text-muted-foreground">/ 5</span>
          </p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Courses</p>
          <p className="mt-1 text-2xl font-semibold">{totals.courses}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Responses</p>
          <p className="mt-1 text-2xl font-semibold">{totals.responses}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Comments</p>
          <p className="mt-1 text-2xl font-semibold">{totals.comments}</p>
        </div>
      </div>

      <div className="rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium">Filter</p>
          <Select
            value={filter === "all" ? "all" : `${filter.academicYear}::${filter.semester}`}
            onValueChange={(v) => {
              if (!v || v === "all") {
                setFilter("all");
                return;
              }
              const [academicYear, semesterStr] = v.split("::");
              setFilter({ academicYear, semester: Number(semesterStr) });
            }}
          >
            <SelectTrigger className="h-8 w-56 text-xs">
              <SelectValue>{filter === "all" ? "All terms" : `${filter.academicYear} · S${filter.semester}`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All terms</SelectItem>
              {terms.map((t) => (
                <SelectItem key={`${t.academicYear}::${t.semester}`} value={`${t.academicYear}::${t.semester}`}>
                  {t.academicYear} · Semester {t.semester}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Per-course aggregates</CardTitle>
          <CardDescription>
            Sorted by overall rating. Click a row to expand free-text comments.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {aggregates.length === 0 ? (
            <div className="p-6 text-xs text-muted-foreground">
              No evaluations yet. Once students submit, aggregates will appear here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lecturer</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Responses</TableHead>
                  {DIMENSION_LABELS.map((d) => (
                    <TableHead key={d.key} className="text-right">
                      {d.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Overall</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregates.map((agg) => {
                  const lecturer = agg.lecturer as { fullName: string; department?: string | null } | null;
                  const course = agg.course as { code: string; name: string } | null;
                  return (
                    <AggregateRow
                      key={`${lecturer?.fullName ?? "?"}-${course?.code ?? "?"}-${agg.academicYear}-${agg.semester}`}
                      lecturerName={lecturer?.fullName ?? "Unknown"}
                      department={lecturer?.department ?? null}
                      courseCode={course?.code ?? "—"}
                      courseName={course?.name ?? "—"}
                      academicYear={agg.academicYear}
                      semester={agg.semester}
                      count={agg.aggregate.count}
                      averages={agg.aggregate.averages}
                      overall={agg.aggregate.overall}
                      comments={agg.aggregate.comments}
                    />
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <AlertCircle className="size-3" />
        <span>Student identities are never exposed. Comments are stored verbatim.</span>
      </div>
    </div>
  );
}

/**
 * Render a table row for a course's aggregated lecturer evaluation with an expandable comments section.
 *
 * @param lecturerName - Lecturer's display name
 * @param department - Lecturer's department or `null` if unavailable
 * @param courseCode - Course code (e.g., "CS101")
 * @param courseName - Course title
 * @param academicYear - Academic year label (e.g., "2024/2025")
 * @param semester - Semester number
 * @param count - Number of responses for this course
 * @param averages - Per-dimension average scores keyed by dimension key
 * @param overall - Aggregate overall score (floating-point)
 * @param comments - Array of comment objects; each contains `id`, `comment`, and `createdAt` (timestamp)
 * @returns A JSX fragment containing the main aggregate table row and, when expanded, a comments row spanning the table columns
 */
function AggregateRow({
  lecturerName,
  department,
  courseCode,
  courseName,
  academicYear,
  semester,
  count,
  averages,
  overall,
  comments,
}: {
  lecturerName: string;
  department: string | null;
  courseCode: string;
  courseName: string;
  academicYear: string;
  semester: number;
  count: number;
  averages: Record<DimKey, number>;
  overall: number;
  comments: Array<{ id: string; comment: string; createdAt: number }>;
}) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <TableCell>
          <div className="flex flex-col">
            <span className="text-xs font-medium">{lecturerName}</span>
            {department ? (
              <span className="text-[10px] text-muted-foreground">{department}</span>
            ) : null}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="text-xs font-medium">{courseCode}</span>
            <span className="text-[10px] text-muted-foreground">{courseName}</span>
          </div>
        </TableCell>
        <TableCell className="text-[11px] text-muted-foreground">
          {academicYear} · S{semester}
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-[10px]">
            {count}
          </Badge>
        </TableCell>
        {DIMENSION_LABELS.map((d) => (
          <TableCell key={d.key} className="text-right text-xs tabular-nums">
            {averages[d.key as DimKey].toFixed(2)}
          </TableCell>
        ))}
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <StarRating value={Math.round(overall)} readOnly size={12} />
            <span className="ml-1 text-xs font-semibold tabular-nums">{overall.toFixed(2)}</span>
          </div>
        </TableCell>
      </TableRow>
      {open ? (
        <TableRow>
          <TableCell colSpan={4 + DIMENSION_LABELS.length + 1} className="bg-muted/20 px-6 py-3">
            <div className="space-y-2">
              <p className="flex items-center gap-1 text-[11px] font-medium">
                <MessageSquare className="size-3" /> Comments ({comments.length})
              </p>
              {comments.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No comments for this course.</p>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="space-y-1.5">
                    {comments.map((c) => (
                      <div key={c.id} className="rounded-md border bg-background px-2 py-1.5">
                        <p className="text-[11px] leading-relaxed">{c.comment}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {formatDateTime(c.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
