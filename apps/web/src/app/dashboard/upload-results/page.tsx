"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Save, Send, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader, TableSkeleton } from "@/components/dashboard/kpi";
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

type ScoreRow = {
  studentDocId: Id<"students">;
  indexNumber: string;
  fullName: string;
  score: string;
  maxScore: string;
  remarks: string;
  existingStatus: "draft" | "submitted" | "approved" | "rejected" | null;
  existingResultId: Id<"courseResults"> | null;
};

export default function UploadResultsPage() {
  const me = useMe();
  const [selectedCourseId, setSelectedCourseId] = useState<Id<"courses"> | "">("");
  const [maxScore, setMaxScore] = useState("100");
  const [academicYear, setAcademicYear] = useState(() => {
    const d = new Date();
    const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
    return `${y}/${y + 1}`;
  });
  const [semester, setSemester] = useState("1");
  const [scores, setScores] = useState<Record<string, { score: string; remarks: string; maxScore?: string }>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const myCourses = useQuery(api.lecturers.listMyCourses, {}) ?? [];
  const courseStudents = useQuery(
    api.lecturers.listCourseStudents,
    selectedCourseId ? { courseId: selectedCourseId } : "skip",
  ) ?? [];

  const upsert = useMutation(api.lecturers.upsertCourseResult);
  const submitBatch = useMutation(api.lecturers.submitCourseResults);

  const rows = useMemo<ScoreRow[]>(() => {
    return courseStudents.map((row) => {
      const override = scores[row.student._id];
      return {
        studentDocId: row.student._id,
        indexNumber: row.student.indexNumber,
        fullName: row.student.fullName,
        score: override?.score ?? (row.existingResult?.score != null ? String(row.existingResult.score) : ""),
        maxScore:
          row.existingResult?.maxScore != null ? String(row.existingResult.maxScore) : maxScore,
        remarks: override?.remarks ?? row.existingResult?.remarks ?? "",
        existingStatus: row.existingResult?.status ?? null,
        existingResultId: row.existingResult?._id ?? null,
      };
    });
  }, [courseStudents, scores, maxScore]);

  const selectedCourse = useMemo(
    () => myCourses.find((c) => c.course?._id === selectedCourseId) ?? null,
    [myCourses, selectedCourseId],
  );

  function update(studentId: Id<"students">, field: "score" | "remarks", value: string) {
    setScores((prev) => {
      const existing = prev[studentId] ?? { score: "", remarks: "" };
      return {
        ...prev,
        [studentId]: { ...existing, [field]: value },
      };
    });
  }

  async function saveAll(submit: boolean) {
    if (!selectedCourseId) return;
    setBusy(true);
    setFeedback(null);
    try {
      const numericMax = Number(maxScore);
      if (!numericMax || numericMax <= 0) {
        setFeedback("Max score must be a positive number.");
        setBusy(false);
        return;
      }
      const resultIds: Id<"courseResults">[] = [];
      let saved = 0;
      let skipped = 0;
      for (const row of rows) {
        const scoreVal = row.score.trim() === "" ? null : Number(row.score);
        if (scoreVal == null || Number.isNaN(scoreVal)) {
          skipped += 1;
          continue;
        }
        if (scoreVal < 0 || scoreVal > numericMax) {
          skipped += 1;
          continue;
        }
        const id = await upsert({
          courseId: selectedCourseId,
          studentId: row.studentDocId,
          academicYear,
          semester: Number(semester),
          score: scoreVal,
          maxScore: numericMax,
          remarks: row.remarks.trim() || undefined,
        });
        resultIds.push(id);
        saved += 1;
      }
      if (submit && resultIds.length > 0) {
        const out = await submitBatch({ resultIds });
        setFeedback(`Saved ${saved}, submitted ${out.submittedCount} (${skipped} skipped).`);
      } else {
        setFeedback(`Saved ${saved} (${skipped} skipped — empty or out of range).`);
      }
      setScores({});
    } finally {
      setBusy(false);
    }
  }

  if (me.role !== "lecturer" && me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only lecturers can upload results.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Upload Results"
        description="Enter scores for your assigned courses, then submit for admin review."
      />

      {feedback ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{feedback}</div>
      ) : null}

      <div className="rounded-md border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-[11px] font-medium">Course</label>
            <Select
              value={selectedCourseId || "none"}
              onValueChange={(v) => setSelectedCourseId(v === "none" ? "" : ((v as Id<"courses">) ?? ""))}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue>
                  {selectedCourseId
                    ? `${selectedCourse?.course?.code ?? ""} · ${selectedCourse?.course?.name ?? ""}`
                    : "Pick a course"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Pick a course</SelectItem>
                {myCourses.map((c) => (
                  <SelectItem key={c._id} value={c.course?._id ?? ""}>
                    {c.course?.code} · {c.course?.name} ({c.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-medium">Academic year</label>
            <Input
              value={academicYear}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAcademicYear(e.target.value)}
              className="h-9 text-xs"
              placeholder="2025/2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium">Semester</label>
              <Input
                value={semester}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSemester(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium">Max score</label>
              <Input
                value={maxScore}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxScore(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Upload className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Scores</h2>
            {selectedCourse ? (
              <span className="text-[10px] text-muted-foreground">
                {courseStudents.length} students enrolled
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => saveAll(false)}
              disabled={!selectedCourseId || busy}
            >
              <Save className="mr-1 size-3" /> Save draft
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => saveAll(true)}
              disabled={!selectedCourseId || busy}
            >
              <Send className="mr-1 size-3" /> Save & submit
            </Button>
          </div>
        </div>
        <Separator />
        {!selectedCourseId ? (
          <div className="p-6 text-xs text-muted-foreground">Pick a course to see enrolled students.</div>
        ) : courseStudents === undefined ? (
          <TableSkeleton columns={3} rows={8} className="py-2" />
        ) : courseStudents.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">
            No students are enrolled in this course yet.
          </div>
        ) : (
          <ScrollArea className="max-h-[55vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Index</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.studentDocId}>
                    <TableCell className="text-[11px] text-muted-foreground">{r.indexNumber}</TableCell>
                    <TableCell className="text-xs font-medium">{r.fullName}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={r.score}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          update(r.studentDocId, "score", e.target.value)
                        }
                        className="h-7 w-20 text-xs"
                        min={0}
                        max={Number(maxScore) || 100}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={r.remarks}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          update(r.studentDocId, "remarks", e.target.value)
                        }
                        className="h-7 text-xs"
                        placeholder="Optional"
                      />
                    </TableCell>
                    <TableCell>
                      {r.existingStatus ? (
                        <Badge
                          variant={
                            r.existingStatus === "approved"
                              ? "default"
                              : r.existingStatus === "rejected"
                                ? "destructive"
                                : r.existingStatus === "submitted"
                                  ? "secondary"
                                  : "outline"
                          }
                          className="text-[10px] capitalize"
                        >
                          {r.existingStatus}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">new</span>
                      )}
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
