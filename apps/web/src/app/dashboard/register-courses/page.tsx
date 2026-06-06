"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { BookOpen, CheckCircle2, Loader2, Plus, X } from "lucide-react";
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

export default function RegisterCoursesPage() {
  const me = useMe();
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const available = useQuery(
    api.courseRegistrations.listAvailableCourses,
    me.role === "student" ? {} : "skip",
  );
  const myRegs = useQuery(
    api.courseRegistrations.listMyRegistrations,
    me.role === "student" ? {} : "skip",
  ) ?? [];

  const register = useMutation(api.courseRegistrations.registerForCourse);
  const drop = useMutation(api.courseRegistrations.dropCourse);

  const filtered = useMemo(() => {
    const list = available?.available ?? [];
    if (!search.trim()) return list;
    const term = search.trim().toLowerCase();
    return list.filter(
      (item) =>
        (item.course as { code: string; name: string }).code.toLowerCase().includes(term) ||
        (item.course as { code: string; name: string }).name.toLowerCase().includes(term),
    );
  }, [available, search]);

  if (me.role !== "student") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only students can register for courses.
      </div>
    );
  }

  async function onRegister(courseId: Id<"courses">) {
    try {
      await register({ courseId });
      setFeedback("Registered successfully.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not register");
    }
  }

  async function onDrop(registrationId: Id<"courseRegistrations">) {
    try {
      await drop({ registrationId });
      setFeedback("Course dropped.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not drop");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Register Courses"
        description="Register for courses in your program/semester."
      />

      {feedback ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{feedback}</div>
      ) : null}

      {available?.student?.feeStatus === "outstanding" &&
      !available?.student?.lateRegistration ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
          You have outstanding fees. Clear them with finance or request late registration before
          registering for new courses.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Available</p>
          <p className="mt-1 text-lg font-semibold">{available?.available.length ?? 0}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Registered</p>
          <p className="mt-1 text-lg font-semibold">
            {myRegs.filter((r) => r.status === "registered").length}
          </p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Dropped</p>
          <p className="mt-1 text-lg font-semibold">
            {myRegs.filter((r) => r.status === "dropped").length}
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-card p-3 shadow-sm">
        <Input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder="Filter courses by code or name…"
          className="h-8 text-xs"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-md border bg-card shadow-sm">
          <div className="flex items-center gap-2 p-4">
            <BookOpen className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Available courses</h2>
          </div>
          <Separator />
          {available === undefined ? (
            <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading…
            </div>
          ) : available.student === null ? (
            <div className="p-6 text-xs text-muted-foreground">
              No student profile linked to your account.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-xs text-muted-foreground">
              No courses available for your program/semester.
            </div>
          ) : (
            <ScrollArea className="max-h-[55vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const c = item.course as { _id: Id<"courses">; code: string; name: string; creditHours: number };
                    return (
                      <TableRow key={c._id}>
                        <TableCell className="text-xs font-medium">{c.code}</TableCell>
                        <TableCell className="text-xs">{c.name}</TableCell>
                        <TableCell className="text-xs">{c.creditHours}</TableCell>
                        <TableCell className="text-right">
                          {item.alreadyRegistered ? (
                            <Badge variant="secondary" className="text-[10px]">
                              <CheckCircle2 className="mr-1 size-3" /> Registered
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => onRegister(c._id)}
                            >
                              <Plus className="mr-1 size-3" /> Register
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>

        <div className="rounded-md border bg-card shadow-sm">
          <div className="flex items-center gap-2 p-4">
            <h2 className="text-sm font-semibold">My registrations</h2>
          </div>
          <Separator />
          {myRegs.length === 0 ? (
            <div className="p-6 text-xs text-muted-foreground">
              You haven&apos;t registered for any courses yet.
            </div>
          ) : (
            <ScrollArea className="max-h-[55vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRegs.map((r) => {
                    const c = r.course as { code: string; name: string } | null;
                    return (
                      <TableRow key={r._id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{c?.code ?? "—"}</span>
                            <span className="text-[10px] text-muted-foreground">{c?.name ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {r.academicYear} · S{r.semester}
                          <br />
                          <span className="text-[10px]">{formatDateTime(r.registeredAt)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "registered"
                                ? "default"
                                : r.status === "completed"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-[10px] capitalize"
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === "registered" ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => onDrop(r._id)}
                            >
                              <X className="mr-1 size-3" /> Drop
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
