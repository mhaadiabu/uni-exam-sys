"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, CheckCircle2, MessageSquarePlus, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useMe } from "@/components/dashboard/dashboard-layout-shell";
import { StarRating } from "@/components/star-rating";
import { formatDateTime, roleLabel } from "@/lib/utils";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@uni-exam-sys/ui/components/card";
import { Separator } from "@uni-exam-sys/ui/components/separator";
import { Textarea } from "@uni-exam-sys/ui/components/textarea";

const DIMENSIONS = [
  { key: "teaching", label: "Teaching quality" },
  { key: "content", label: "Course content" },
  { key: "engagement", label: "Engagement" },
  { key: "punctuality", label: "Punctuality" },
  { key: "fairness", label: "Fairness in assessment" },
] as const;

type DimensionKey = (typeof DIMENSIONS)[number]["key"];
type Ratings = Record<DimensionKey, number>;

function emptyRatings(): Ratings {
  return { teaching: 0, content: 0, engagement: 0, punctuality: 0, fairness: 0 };
}

type Target = NonNullable<
  ReturnType<typeof useQuery<typeof api.lecturerEvaluations.listMyEvaluationTargets>>
>[number];

export default function EvaluateLecturersPage() {
  const me = useMe();
  const targets = useQuery(api.lecturerEvaluations.listMyEvaluationTargets, {}) ?? [];
  const myEvaluations = useQuery(api.lecturerEvaluations.listMyEvaluations, {}) ?? [];

  const submitted = useMemo(
    () => new Set(myEvaluations.map((e) => `${e.courseId}::${e.academicYear}::${e.semester}`)),
    [myEvaluations],
  );

  const pending = useMemo(
    () => targets.filter((t) => !submitted.has(`${t.course._id}::${t.academicYear}::${t.semester}`)),
    [targets, submitted],
  );

  const completed = useMemo(
    () => targets.filter((t) => submitted.has(`${t.course._id}::${t.academicYear}::${t.semester}`)),
    [targets, submitted],
  );

  if (me.role !== "student") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only students can submit lecturer evaluations.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card p-6">
        <div className="flex items-start gap-3">
          <MessageSquarePlus className="mt-0.5 size-5 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Evaluate Lecturers</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Submit anonymous feedback for your lecturers and courses. Your identity is never shown.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pending evaluations</CardTitle>
          <CardDescription>
            {pending.length === 0
              ? "You have no evaluations waiting. New courses will appear here when assigned."
              : `You have ${pending.length} evaluation${pending.length === 1 ? "" : "s"} to complete.`}
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-3 pt-3">
          {pending.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5" /> All caught up.
            </div>
          ) : (
            pending.map((t) => (
              <EvaluationForm
                key={`${t.course._id}::${t.lecturer._id}::${t.academicYear}::${t.semester}`}
                target={t}
              />
            ))
          )}
        </CardContent>
      </Card>

      {completed.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Already submitted</CardTitle>
            <CardDescription>
              You can edit or remove your previous evaluations while the term is open.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-3 pt-3">
            {completed.map((t) => (
              <SubmittedEvaluationRow
                key={`${t.course._id}::${t.lecturer._id}::${t.academicYear}::${t.semester}`}
                target={t}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function EvaluationForm({ target }: { target: Target }) {
  const submit = useMutation(api.lecturerEvaluations.submitEvaluation);
  const [ratings, setRatings] = useState<Ratings>(emptyRatings);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const allRated = DIMENSIONS.every((d) => ratings[d.key] >= 1);
  const isReady = allRated;

  async function onSubmit() {
    if (!isReady) {
      toast.error("Please rate every dimension before submitting.");
      return;
    }
    setBusy(true);
    try {
      await submit({
        courseId: target.course._id,
        lecturerId: target.lecturer._id,
        academicYear: target.academicYear,
        semester: target.semester,
        ratings,
        comment: comment.trim() || undefined,
      });
      toast.success("Evaluation submitted anonymously.");
      setRatings(emptyRatings());
      setComment("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit evaluation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {target.course.code} — {target.course.name}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {target.lecturer.fullName} · {target.academicYear} · Semester {target.semester}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          <Star className="mr-1 size-2.5" /> Required
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {DIMENSIONS.map((d) => (
          <div key={d.key} className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
            <div>
              <p className="text-xs font-medium">{d.label}</p>
              <p className="text-[10px] text-muted-foreground">1 = poor, 5 = excellent</p>
            </div>
            <StarRating
              value={ratings[d.key]}
              onChange={(next) => setRatings((prev) => ({ ...prev, [d.key]: next }))}
              ariaLabel={d.label}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        <label className="text-[11px] font-medium">Comment (optional)</label>
        <Textarea
          value={comment}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
          placeholder="Share any specific feedback that might help the lecturer improve…"
          rows={3}
          className="text-xs"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground">
          <AlertCircle className="mr-1 inline size-3" /> Your name is not attached to this evaluation.
        </p>
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => void onSubmit()}
          disabled={!isReady || busy}
        >
          {busy ? "Submitting…" : "Submit evaluation"}
        </Button>
      </div>
    </div>
  );
}

function SubmittedEvaluationRow({ target }: { target: Target }) {
  const submit = useMutation(api.lecturerEvaluations.submitEvaluation);
  const remove = useMutation(api.lecturerEvaluations.deleteMyEvaluation);
  const [editing, setEditing] = useState(false);
  const [ratings, setRatings] = useState<Ratings>(() => {
    const r = target.existingEvaluation?.ratings;
    if (!r) return emptyRatings();
    return {
      teaching: r.teaching,
      content: r.content,
      engagement: r.engagement,
      punctuality: r.punctuality,
      fairness: r.fairness,
    };
  });
  const [comment, setComment] = useState(target.existingEvaluation?.comment ?? "");
  const [busy, setBusy] = useState(false);

  const allRated = DIMENSIONS.every((d) => ratings[d.key] >= 1);

  async function onSave() {
    if (!allRated) {
      toast.error("Please rate every dimension.");
      return;
    }
    setBusy(true);
    try {
      await submit({
        courseId: target.course._id,
        lecturerId: target.lecturer._id,
        academicYear: target.academicYear,
        semester: target.semester,
        ratings,
        comment: comment.trim() || undefined,
      });
      toast.success("Evaluation updated.");
      setEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update evaluation.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!target.existingEvaluation) return;
    setBusy(true);
    try {
      await remove({ evaluationId: target.existingEvaluation._id });
      toast.success("Evaluation removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove evaluation.");
    } finally {
      setBusy(false);
    }
  }

  if (!target.existingEvaluation) return null;

  if (!editing) {
    const r = target.existingEvaluation.ratings;
    const overall = (r.teaching + r.content + r.engagement + r.punctuality + r.fairness) / 5;
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/10 px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {target.course.code} · {target.lecturer.fullName}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <StarRating value={Math.round(overall)} readOnly size={14} />
            <span className="text-[11px] text-muted-foreground">
              {overall.toFixed(1)} avg · {target.academicYear} · S{target.semester} · submitted{" "}
              {formatDateTime(target.existingEvaluation.updatedAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="xs" variant="outline" onClick={() => setEditing(true)} disabled={busy}>
            Edit
          </Button>
          <Button size="xs" variant="destructive" onClick={() => void onDelete()} disabled={busy}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-sm font-semibold">
        {target.course.code} — {target.course.name}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {target.lecturer.fullName} · {target.academicYear} · Semester {target.semester}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {DIMENSIONS.map((d) => (
          <div key={d.key} className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
            <p className="text-xs font-medium">{d.label}</p>
            <StarRating
              value={ratings[d.key]}
              onChange={(next) => setRatings((prev) => ({ ...prev, [d.key]: next }))}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        <label className="text-[11px] font-medium">Comment (optional)</label>
        <Textarea
          value={comment}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
          rows={3}
          className="text-xs"
        />
      </div>
      <div className="mt-3 flex justify-end gap-1">
        <Button size="xs" variant="outline" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </Button>
        <Button size="xs" onClick={() => void onSave()} disabled={!allRated || busy}>
          Save
        </Button>
      </div>
    </div>
  );
}
