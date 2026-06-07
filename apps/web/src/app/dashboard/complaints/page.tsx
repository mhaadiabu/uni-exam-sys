"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, CheckCircle2, Loader2, Plus, X } from "lucide-react";
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

import { formatDateTime, roleLabel } from "@/lib/utils";

type ComplaintStatus = "open" | "in_review" | "resolved" | "rejected";
type ComplaintCategory =
  | "wrong_seat"
  | "wrong_timetable"
  | "wrong_details"
  | "payment_issue"
  | "id_verification_issue"
  | "attendance_system_issue"
  | "schedule_conflict"
  | "room_issue"
  | "other";

const STATUS_OPTIONS: { value: ComplaintStatus; label: string; variant: "default" | "secondary" | "destructive" | "outline" }[] = [
  { value: "open", label: "Open", variant: "destructive" },
  { value: "in_review", label: "In review", variant: "secondary" },
  { value: "resolved", label: "Resolved", variant: "default" },
  { value: "rejected", label: "Rejected", variant: "outline" },
];

const CATEGORY_OPTIONS: ComplaintCategory[] = [
  "wrong_seat",
  "wrong_timetable",
  "wrong_details",
  "payment_issue",
  "id_verification_issue",
  "attendance_system_issue",
  "schedule_conflict",
  "room_issue",
  "other",
];

function categoryLabel(c: ComplaintCategory): string {
  return c.replace(/_/g, " ");
}

export default function ComplaintsPage() {
  const me = useMe();
  const [statusFilter, setStatusFilter] = useState<"all" | ComplaintStatus>("all");
  const [selected, setSelected] = useState<Id<"complaints"> | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<ComplaintCategory>("other");
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newComment, setNewComment] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const complaints =
    useQuery(
      api.communications.listComplaints,
      me.universityId
        ? {
            universityId: me.universityId,
            ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          }
        : "skip",
    ) ?? [];

  const users = useQuery(api.users.listUsers, me.universityId ? { universityId: me.universityId } : "skip") ?? [];

  const submitComplaint = useMutation(api.communications.submitComplaint);
  const updateStatus = useMutation(api.communications.updateComplaintStatus);
  const addComment = useMutation(api.communications.addComplaintComment);

  const filtered = useMemo(() => complaints, [complaints]);
  const active = selected ? complaints.find((c) => c._id === selected) ?? null : null;
  const submitterName = (userId: Id<"users">) =>
    users.find((u) => u._id === userId)?.fullName ?? userId.slice(-6);

  async function submit() {
    if (!newSubject.trim() || !newDescription.trim()) {
      setFeedback("Subject and description are required.");
      return;
    }
    await submitComplaint({
      category: newCategory,
      subject: newSubject.trim(),
      description: newDescription.trim(),
    });
    setFeedback("Complaint submitted.");
    setNewSubject("");
    setNewDescription("");
    setNewCategory("other");
    setComposeOpen(false);
  }

  async function changeStatus(status: ComplaintStatus) {
    if (!active) return;
    await updateStatus({
      complaintId: active._id,
      status,
      resolutionNote: resolutionNote.trim() || undefined,
    });
    setResolutionNote("");
    setFeedback(`Status set to ${status}.`);
  }

  async function postComment() {
    if (!active) return;
    if (!newComment.trim()) return;
    await addComment({ complaintId: active._id, message: newComment.trim() });
    setNewComment("");
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Complaints"
        description={
          me.role === "university_admin" || me.role === "super_admin"
            ? "Review and resolve submitted complaints."
            : "Submit and track your complaints."
        }
        actions={
          me.role !== "university_admin" && me.role !== "super_admin" ? (
            <Button size="sm" className="h-8 text-xs" onClick={() => setComposeOpen((v) => !v)}>
              <Plus className="mr-1 size-3" /> New complaint
            </Button>
          ) : null
        }
      />

      {feedback ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{feedback}</div>
      ) : null}

      {composeOpen ? (
        <div className="rounded-md border bg-card p-4">
          <h2 className="text-sm font-semibold">New complaint</h2>
          <Separator className="my-3" />
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              value={newCategory}
              onValueChange={(v) => setNewCategory((v as ComplaintCategory) ?? "other")}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue>{categoryLabel(newCategory)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {categoryLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={newSubject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSubject(e.target.value)}
              placeholder="Short subject"
              className="h-9 text-xs"
            />
          </div>
          <textarea
            value={newDescription}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDescription(e.target.value)}
            placeholder="Describe the issue in detail…"
            rows={4}
            className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-xs"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setComposeOpen(false)}
            >
              <X className="mr-1 size-3" /> Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={submit}>
              <CheckCircle2 className="mr-1 size-3" /> Submit
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={
            "rounded-md border px-2 py-1 text-[11px] " +
            (statusFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")
          }
        >
          All ({complaints.length})
        </button>
        {STATUS_OPTIONS.map((s) => {
          const count = complaints.filter((c) => c.status === s.value).length;
          return (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={
                "rounded-md border px-2 py-1 text-[11px] " +
                (statusFilter === s.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground")
              }
            >
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-md border bg-card">
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>From</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-xs text-muted-foreground">
                      No complaints.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow
                      key={c._id}
                      onClick={() => setSelected(c._id)}
                      className={selected === c._id ? "bg-muted/40" : "cursor-pointer"}
                    >
                      <TableCell className="text-xs font-medium">{c.subject}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground capitalize">
                        {categoryLabel(c.category)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (STATUS_OPTIONS.find((s) => s.value === c.status)?.variant ?? "outline") as
                              | "default"
                              | "secondary"
                              | "destructive"
                              | "outline"
                          }
                          className="text-[10px] capitalize"
                        >
                          {c.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {submitterName(c.submittedByUserId)}
                        <br />
                        <span className="text-[10px]">{roleLabel(c.complainantRole)}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <div className="rounded-md border bg-card">
          {!active ? (
            <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
              <AlertCircle className="size-3.5" /> Select a complaint to view details.
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div>
                <h2 className="text-sm font-semibold">{active.subject}</h2>
                <p className="text-[11px] text-muted-foreground">
                  {categoryLabel(active.category)} · {formatDateTime(active.createdAt)}
                </p>
              </div>
              <p className="rounded-md bg-muted/30 p-3 text-xs">{active.description}</p>
              {active.resolutionNote ? (
                <div className="rounded-md border-l-2 border-primary bg-primary/5 p-3 text-xs">
                  <p className="text-[10px] uppercase text-primary">Resolution</p>
                  <p className="mt-1">{active.resolutionNote}</p>
                </div>
              ) : null}
              {me.role === "university_admin" || me.role === "super_admin" ? (
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-[11px] font-medium">Update status</p>
                  <textarea
                    value={resolutionNote}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResolutionNote(e.target.value)}
                    placeholder="Resolution note (optional)"
                    rows={2}
                    className="mt-2 w-full rounded-md border bg-background px-2 py-1 text-xs"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <Button
                        key={s.value}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => changeStatus(s.value)}
                        disabled={active.status === s.value}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-[11px] font-medium">Add comment</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
                    placeholder="Reply or follow up…"
                    className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
                  />
                  <Button size="sm" className="h-8 text-xs" onClick={postComment}>
                    Post
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
