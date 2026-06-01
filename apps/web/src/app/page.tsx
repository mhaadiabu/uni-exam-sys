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
      {/* Background -- sophisticated noise + subtle gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_oklch,var(--primary),transparent_95%),transparent_80%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,color-mix(in_oklch,var(--primary),transparent_97%),transparent_80%)]" />
      </div>

      <div className="mx-auto w-full max-w-3xl text-center">
        {/* Icon */}
        <div className="mx-auto mb-8 flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20 sm:size-16">
          <GraduationCap className="size-6 sm:size-8" />
        </div>

        {/* Heading */}
        <h1 className="font-serif text-5xl tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-[5rem] lg:leading-[1.1]">
          AcademeX
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          The ultimate engine for university examinations. Scheduling, seating, attendance, and verification—orchestrated with absolute precision.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <SignUpButton>
            <Button size="lg" className="w-full gap-2 sm:w-auto rounded-full font-medium">
              Start orchestrating
              <ArrowRight className="size-4" />
            </Button>
          </SignUpButton>
          <SignInButton>
            <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full font-medium bg-background/50 backdrop-blur-sm">
              Sign in to workspace
            </Button>
          </SignInButton>
        </div>

        {/* Trust line */}
        <p className="mt-16 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground/80">
          <BookOpen className="size-3.5" />
          Reliability at scale
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
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      {/* ── Hero / workspace header ──────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="flex flex-col justify-between border-border/40 bg-card/40 backdrop-blur-sm shadow-sm transition-all hover:bg-card/60">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={
                  healthCheck === "OK" ? "default" : "destructive"
                }
                className="font-mono text-[10px] uppercase tracking-wider"
              >
                {healthCheck === undefined
                  ? "Sys: Checking"
                  : healthCheck === "OK"
                    ? "Sys: Online"
                    : "Sys: Offline"}
              </Badge>
              <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider bg-secondary/50">Convex + Clerk</Badge>
            </div>
            <CardTitle className="font-serif text-3xl tracking-tight mt-2">
              Examination Control Center
            </CardTitle>
            <CardDescription className="text-sm mt-2 max-w-md leading-relaxed">
              Multi-tenant operations engine for schedule planning, seating
              generation, attendance finalization, and finance clearance.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard">
                <Button className="gap-2 shadow-sm rounded-full">
                  <Sparkles className="size-3.5" />
                  Open Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-border/40 bg-card/40 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Fingerprint className="size-4 text-primary" />
              Active Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm">
            {!me && onboardingError ? (
              <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="font-medium text-destructive flex items-center gap-2"><ShieldAlert className="size-4"/> Access denied</p>
                <p className="text-xs text-muted-foreground">{onboardingError}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Domain</span>
                  <span className="font-mono">{onboardingEmailDomain ?? "Unknown"}</span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full mt-2"
                >
                  Sign out
                </Button>
              </div>
            ) : null}
            {!me && matchedUniversity ? (
              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="font-medium text-primary text-xs uppercase tracking-wider">Tenant match</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">University</span>
                  <span className="font-medium">{matchedUniversity.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Domain</span>
                  <span className="font-mono">{onboardingEmailDomain}</span>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">University</span>
                <span className="font-medium">
                  {me?.university?.name ??
                    matchedUniversity?.name ??
                    "Not selected"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role</span>
                <span className="font-mono text-xs uppercase tracking-wider bg-secondary/50 px-2 py-1 rounded-md">{me?.role ?? "No profile"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Schedules</span>
                <span className="font-medium">{metrics.totalSchedules}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── KPI stats ────────────────────────────────────────────────── */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat
          title="Schedules"
          value={metrics.totalSchedules}
          icon={CalendarDays}
        />
        <Stat
          title="Frozen"
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
      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="flex-row items-center justify-between gap-2 border-b border-border/40 pb-4 bg-muted/20">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock3 className="size-4 text-primary" />
              {timetableTitle}
            </CardTitle>
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider bg-background">Tenant scoped</Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                  <TableHead className="h-10 text-xs uppercase tracking-wider text-muted-foreground">Time</TableHead>
                  <TableHead className="h-10 text-xs uppercase tracking-wider text-muted-foreground">Course</TableHead>
                  <TableHead className="h-10 text-xs uppercase tracking-wider text-muted-foreground">Program</TableHead>
                  <TableHead className="h-10 text-xs uppercase tracking-wider text-muted-foreground">Room</TableHead>
                  <TableHead className="h-10 text-xs uppercase tracking-wider text-muted-foreground text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No schedules found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (schedules ?? []).slice(0, 10).map((schedule) => (
                    <TableRow key={schedule._id} className="group transition-colors hover:bg-muted/50">
                      <TableCell className="font-medium whitespace-nowrap">{formatDate(schedule.examDate)}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {schedule.startTime} - {schedule.endTime}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate font-medium">
                          {schedule.course?.code ?? "N/A"}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {schedule.course?.name ?? "Unknown course"}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {schedule.program?.code ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {schedule.room?.name ?? "Unassigned"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider bg-background shadow-sm">{schedule.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur-sm shadow-sm flex flex-col h-full">
          {canManagePrograms ? (
            <>
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileCheck className="size-4 text-primary" />
                  Program Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5 flex-1 flex flex-col">
                <div className="space-y-1.5">
                  <Label htmlFor="programCode" className="text-xs text-muted-foreground uppercase tracking-wider">Code</Label>
                  <Input
                    id="programCode"
                    value={programCode}
                    onChange={(event) =>
                      setProgramCode(event.target.value)
                    }
                    className="h-9 shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="programName" className="text-xs text-muted-foreground uppercase tracking-wider">Name</Label>
                  <Input
                    id="programName"
                    value={programName}
                    onChange={(event) =>
                      setProgramName(event.target.value)
                    }
                    className="h-9 shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="programDuration" className="text-xs text-muted-foreground uppercase tracking-wider">
                    Duration (Semesters)
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
                    className="h-9 shadow-sm"
                  />
                </div>
                <Button
                  onClick={handleCreateProgram}
                  disabled={
                    !me?.universityId || !programCode || !programName
                  }
                  className="w-full mt-auto"
                  size="sm"
                >
                  Create Program
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShieldAlert className="size-4 text-primary" />
                  Operational Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 flex-1">
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                      <CheckCheck className="size-3.5 text-primary" />
                    </div>
                    <p className="leading-relaxed">Finalized attendance is immutable for invigilators.</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                      <Clock3 className="size-3.5 text-primary" />
                    </div>
                    <p className="leading-relaxed">Offline attendance actions queue for conflict-aware sync.</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                      <Fingerprint className="size-3.5 text-primary" />
                    </div>
                    <p className="leading-relaxed">Verification events and penalty transitions are audited.</p>
                  </div>
                </div>
              </CardContent>
            </>
          )}
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
    <Card className="border-border/40 bg-card/40 backdrop-blur-sm shadow-sm transition-all hover:bg-card/60">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <p className="font-serif text-3xl font-medium tracking-tight">
            {value.toLocaleString()}
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
