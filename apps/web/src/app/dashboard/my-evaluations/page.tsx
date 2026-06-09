"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { AlertCircle, Loader2, MessageSquare, Star } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";
import { StarRating } from "@/components/star-rating";
import { formatDateTime, roleLabel } from "@/lib/utils";

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

const DIMENSION_LABELS = [
  { key: "teaching", label: "Teaching quality" },
  { key: "content", label: "Course content" },
  { key: "engagement", label: "Engagement" },
  { key: "punctuality", label: "Punctuality" },
  { key: "fairness", label: "Fairness" },
] as const;

type DimKey = (typeof DIMENSION_LABELS)[number]["key"];

export default function MyEvaluationsPage() {
  const me = useMe();
  const [filter, setFilter] = useState<{ academicYear: string; semester: number } | "all">("all");

  const terms = useQuery(api.lecturerEvaluations.listEvaluationTerms, {}) ?? [];
  const aggregates = useQuery(
    api.lecturerEvaluations.listMyEvaluationAggregates,
    filter === "all" ? {} : { academicYear: filter.academicYear, semester: filter.semester },
  ) ?? [];

  const overall = useMemo(() => {
    if (aggregates.length === 0) return null;
    const valid = aggregates.map((a) => a.aggregate.overall).filter((n) => n > 0);
    if (valid.length === 0) return null;
    const sum = valid.reduce((a, b) => a + b, 0);
    return sum / valid.length;
  }, [aggregates]);

  if (me.role !== "lecturer" && me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only lecturers can view their evaluations.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Evaluations"
        description="Anonymous student feedback for your courses. Individual students are never identified."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Overall rating</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <Star className="size-4 text-amber-400" />
            {overall ? overall.toFixed(2) : "—"}
            <span className="text-xs font-normal text-muted-foreground">/ 5</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            Across {aggregates.length} course{aggregates.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Responses</p>
          <p className="mt-1 text-2xl font-semibold">
            {aggregates.reduce((sum, a) => sum + a.aggregate.count, 0)}
          </p>
          <p className="text-[10px] text-muted-foreground">Anonymous submissions</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Comments</p>
          <p className="mt-1 text-2xl font-semibold">
            {aggregates.reduce((sum, a) => sum + a.aggregate.comments.length, 0)}
          </p>
          <p className="text-[10px] text-muted-foreground">Free-text responses</p>
        </div>
      </div>

      <div className="rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium">Filter</p>
          <Select
            value={
              filter === "all"
                ? "all"
                : `${filter.academicYear}::${filter.semester}`
            }
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

      {aggregates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">No evaluations yet</CardTitle>
            <CardDescription>
              Once students submit evaluations for your courses, anonymous aggregated results will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {aggregates.map((agg) => {
            const course = agg.course as { code: string; name: string } | null;
            return (
              <Card key={`${course?.code ?? "course"}-${agg.aggregate.count}`}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm">
                        {course ? `${course.code} — ${course.name}` : "Course"}
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        {agg.aggregate.count} response{agg.aggregate.count === 1 ? "" : "s"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating value={Math.round(agg.aggregate.overall)} readOnly />
                      <span className="text-lg font-semibold">{agg.aggregate.overall.toFixed(2)}</span>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-3 pt-3">
                  <div className="grid gap-2 sm:grid-cols-5">
                    {DIMENSION_LABELS.map((d) => {
                      const avg = agg.aggregate.averages[d.key as DimKey];
                      return (
                        <div key={d.key} className="rounded-md border bg-muted/20 px-2 py-1.5">
                          <p className="text-[10px] uppercase text-muted-foreground">{d.label}</p>
                          <p className="mt-0.5 text-sm font-semibold">{avg.toFixed(2)}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-[11px] font-medium">
                      <MessageSquare className="size-3" /> Comments ({agg.aggregate.comments.length})
                    </p>
                    <ScrollArea className="max-h-48">
                      <div className="space-y-1.5">
                        {agg.aggregate.comments.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">No comments for this course.</p>
                        ) : (
                          agg.aggregate.comments.map((c) => (
                            <div key={c.id} className="rounded-md border bg-muted/10 px-2 py-1.5">
                              <p className="text-[11px] leading-relaxed">{c.comment}</p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                {formatDateTime(c.createdAt)}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <AlertCircle className="size-3" />
        <span>Identity is never shown to lecturers or admins. Comments are kept verbatim.</span>
        <Badge variant="outline" className="ml-1 text-[9px]">{roleLabel(me.role)}</Badge>
      </div>
    </div>
  );
}
