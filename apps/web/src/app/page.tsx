"use client";

import { SignInButton, SignUpButton, useAuth, useClerk } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCheck,
  Clock3,
  FileCheck,
  Fingerprint,
  GraduationCap,
  ShieldAlert,
  Sparkles,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@uni-exam-sys/ui/components/card";
import { Input } from "@uni-exam-sys/ui/components/input";
import { Label } from "@uni-exam-sys/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@uni-exam-sys/ui/components/table";

import { formatDate } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Root page component                                                       */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto size-8 animate-spin rounded-md border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <LandingPage />;
  }

  return <AuthenticatedHome />;
}

/* -------------------------------------------------------------------------- */
/*  Landing page (unauthenticated)                                            */
/* -------------------------------------------------------------------------- */

function LandingPage() {
  return (
    <section className="relative flex min-h-[calc(100svh-57px)] flex-col items-center justify-center overflow-hidden px-4 sm:px-6">
      {/* Background -- subtle academic grid + radial glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,color-mix(in_oklch,var(--primary),transparent_92%),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-2xl text-center">
        {/* Icon */}
        <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:size-20">
          <GraduationCap className="size-8 sm:size-10" />
        </div>

        {/* Heading */}
        <h1 className="font-serif text-4xl tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          AcademeX
        </h1>

        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Exam scheduling, seating arrangements, attendance, and
          verification&mdash;managed in one place for your entire university.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <SignUpButton>
            <Button size="lg" className="gap-2">
              Get started
              <ArrowRight className="size-4" />
            </Button>
          </SignUpButton>
          <SignInButton>
            <Button variant="outline" size="lg">
              Sign in
            </Button>
          </SignInButton>
        </div>

        {/* Trust line */}
        <p className="mt-16 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="size-3.5" />
          Built for universities that demand exam-day reliability.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Authenticated home (signed-in users)                                      */
/* -------------------------------------------------------------------------- */

function AuthenticatedHome() {
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const healthCheck = useQuery(api.healthCheck.get);
  const me = useQuery(api.bootstrap.me);
  const onboardingUniversities = useQuery(
    api.bootstrap.listOnboardingUniversities,
    {},
  );
  const scopedUniversityId = me?.universityId;
  const schedules = useQuery(
    api.schedules.getRoleTimetable,
    scopedUniversityId ? { universityId: scopedUniversityId } : "skip",
  );
  const programs = useQuery(
    api.academics.listPrograms,
    scopedUniversityId ? { universityId: scopedUniversityId } : "skip",
  );
  const rooms = useQuery(
    api.rooms.listRooms,
    scopedUniversityId ? { universityId: scopedUniversityId } : "skip",
  );

  const createProgram = useMutation(api.academics.createProgram);

  const [programCode, setProgramCode] = useState("BSC-IT");
  const [programName, setProgramName] = useState(
    "BSc Information Technology",
  );
  const [programDuration, setProgramDuration] = useState(8);

  const metrics = useMemo(() => {
    const totalSchedules = schedules?.length ?? 0;
    const frozenSchedules = (schedules ?? []).filter(
      (schedule) => schedule.frozenSeating,
    ).length;
    const totalRooms = rooms?.length ?? 0;
    const totalPrograms = programs?.length ?? 0;
    return {
      totalSchedules,
      frozenSchedules,
      totalRooms,
      totalPrograms,
    };
  }, [programs, rooms, schedules]);
  const canManagePrograms =
    me?.role === "super_admin" || me?.role === "university_admin";
  const timetableTitle =
    me?.role === "student"
      ? "My Exam Timetable"
      : me?.role === "invigilator"
        ? "Assigned Exam Timetable"
        : "Upcoming Exam Timetable";


  async function handleLogout() {
    await clerk.signOut();
  }

  const matchedUniversity =
    onboardingUniversities && "matchedUniversity" in onboardingUniversities
      ? onboardingUniversities.matchedUniversity
      : null;
  const onboardingError =
    onboardingUniversities && "error" in onboardingUniversities
      ? onboardingUniversities.error
      : null;
  const onboardingEmailDomain =
    onboardingUniversities && "emailDomain" in onboardingUniversities
      ? onboardingUniversities.emailDomain
      : null;

  async function handleCreateProgram() {
    if (!me?.universityId) {
      toast.error("No tenant selected");
      return;
    }

    try {
      await createProgram({
        universityId: me.universityId,
        code: programCode,
        name: programName,
        durationSemesters: programDuration,
      });
      toast.success("Program created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create program",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      {/* ── Hero / workspace header ──────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  healthCheck === "OK" ? "default" : "destructive"
                }
              >
                {healthCheck === undefined
                  ? "Checking backend"
                  : healthCheck === "OK"
                    ? "Backend connected"
                    : "Backend issue"}
              </Badge>
              <Badge variant="outline">Convex + Clerk</Badge>
            </div>
            <CardTitle className="text-xl tracking-tight">
              University Examination Seating and Management System
            </CardTitle>
            <CardDescription>
              Multi-tenant operations engine for schedule planning, seating
              generation, attendance finalization, verification controls,
              complaints workflow, and finance clearance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard">
                <Button className="gap-2">
                  <Sparkles className="size-3.5" />
                  Open operations dashboard
                </Button>
              </Link>
              <div className="px-3 text-xs text-muted-foreground">
                Profile setup runs automatically after signup.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Current Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {!me && onboardingError ? (
              <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="font-medium text-destructive">Access denied</p>
                <p>{onboardingError}</p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email domain</span>
                  <span>{onboardingEmailDomain ?? "Unknown"}</span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLogout}
                >
                  Sign out
                </Button>
              </div>
            ) : null}
            {!me && matchedUniversity ? (
              <div className="space-y-1 rounded-md border bg-background/60 p-3">
                <p className="font-medium">Automatic tenant match</p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Matched university
                  </span>
                  <span>{matchedUniversity.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email domain</span>
                  <span>{onboardingEmailDomain}</span>
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">University</span>
              <span>
                {me?.university?.name ??
                  matchedUniversity?.name ??
                  "Not selected"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <span>{me?.role ?? "No profile"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Schedules</span>
              <span>{metrics.totalSchedules}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── KPI stats ────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          title="Exam Schedules"
          value={metrics.totalSchedules}
          icon={CalendarDays}
        />
        <Stat
          title="Frozen Seating"
          value={metrics.frozenSchedules}
          icon={ShieldAlert}
        />
        <Stat
          title="Programs"
          value={metrics.totalPrograms}
          icon={FileCheck}
        />
        <Stat title="Rooms" value={metrics.totalRooms} icon={Users2} />
      </section>

      {/* ── Timetable + setup ────────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card size="sm">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm">{timetableTitle}</CardTitle>
            <Badge variant="outline">Tenant scoped</Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(schedules ?? []).slice(0, 10).map((schedule) => (
                  <TableRow key={schedule._id}>
                    <TableCell>{formatDate(schedule.examDate)}</TableCell>
                    <TableCell>
                      {schedule.startTime} - {schedule.endTime}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">
                        {schedule.course?.code ?? "N/A"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {schedule.course?.name ?? "Unknown course"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {schedule.program?.code ?? "N/A"}
                    </TableCell>
                    <TableCell>
                      {schedule.room?.name ?? "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{schedule.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card size="sm">
          {canManagePrograms ? (
            <>
              <CardHeader>
                <CardTitle className="text-sm">Program Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="programCode">Program code</Label>
                  <Input
                    id="programCode"
                    value={programCode}
                    onChange={(event) =>
                      setProgramCode(event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="programName">Program name</Label>
                  <Input
                    id="programName"
                    value={programName}
                    onChange={(event) =>
                      setProgramName(event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="programDuration">
                    Duration (semesters)
                  </Label>
                  <Input
                    id="programDuration"
                    type="number"
                    value={programDuration}
                    onChange={(event) =>
                      setProgramDuration(
                        Number(event.target.value || 0),
                      )
                    }
                  />
                </div>
                <Button
                  onClick={handleCreateProgram}
                  disabled={
                    !me?.universityId || !programCode || !programName
                  }
                >
                  Create program
                </Button>
              </CardContent>
            </>
          ) : (
            <CardHeader>
              <CardTitle className="text-sm">Operational Rules</CardTitle>
            </CardHeader>
          )}

          <CardContent>
            <div className="space-y-2 rounded-md border bg-background/60 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Reliability Rules
              </p>
              <p className="flex items-center gap-1.5">
                <CheckCheck className="size-3.5 text-primary" />
                Finalized attendance is immutable for invigilators.
              </p>
              <p className="flex items-center gap-1.5">
                <Clock3 className="size-3.5 text-primary" />
                Offline attendance actions queue for conflict-aware sync.
              </p>
              <p className="flex items-center gap-1.5">
                <Fingerprint className="size-3.5 text-primary" />
                Verification events and penalty transitions are audited.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stat card (authenticated view)                                            */
/* -------------------------------------------------------------------------- */

function Stat({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 text-xl font-semibold leading-none">
            {value.toLocaleString()}
          </p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );
}
