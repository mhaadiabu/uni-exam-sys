"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { BookOpen, GraduationCap, Loader2, Users } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
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

export default function MyCoursesPage() {
  const me = useMe();
  const [search, setSearch] = useState("");

  const profile = useQuery(api.lecturers.getMyLecturerProfile, {});
  const courses = useQuery(api.lecturers.listMyCourses, {}) ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return courses;
    const term = search.trim().toLowerCase();
    return courses.filter(
      (c) =>
        c.course?.code.toLowerCase().includes(term) ||
        c.course?.name.toLowerCase().includes(term) ||
        c.program?.name.toLowerCase().includes(term),
    );
  }, [courses, search]);

  if (me.role !== "lecturer" && me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only lecturers can view their courses.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Courses"
        description={
          profile
            ? `Assigned courses for ${profile.fullName} (${profile.staffId}).`
            : "Your assigned courses."
        }
        actions={
          <Button
            size="sm"
            className="h-8 text-xs"
            nativeButton={false}
            render={<Link href={"/dashboard/upload-results" as Route} />}
          >
            <GraduationCap className="mr-1 size-3" /> Upload results
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Total courses</p>
          <p className="mt-1 text-lg font-semibold">{courses.length}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Programs</p>
          <p className="mt-1 text-lg font-semibold">
            {new Set(courses.map((c) => c.program?._id).filter(Boolean)).size}
          </p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Roles</p>
          <p className="mt-1 text-lg font-semibold">
            {new Set(courses.map((c) => c.role)).size}
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-card p-3">
        <Input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder="Filter by course, code, program…"
          className="h-8 text-xs"
        />
      </div>

      <div className="rounded-md border bg-card">
        <Separator />
        {courses === undefined ? (
          <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">
            No courses assigned yet. Ask your university admin to add you to courses.
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="text-xs font-medium">{c.course?.code ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{c.course?.name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{c.program?.name ?? "—"}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {c.academicYear} · S{c.semester}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {c.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.course?.creditHours ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={
                          `/dashboard/upload-results?courseId=${c.course?._id ?? ""}` as Route
                        }
                        className="inline-flex h-7 items-center rounded-md px-2 text-xs text-primary hover:underline"
                      >
                        <Users className="mr-1 size-3" /> Enter scores
                      </Link>
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
