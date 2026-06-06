"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@uni-exam-sys/ui/components/card";
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

import { downloadCsv, downloadPdf, type PdfTable } from "@/lib/reports";
import { formatDateTime } from "@/lib/utils";

type ReportKey =
  | "timetable"
  | "attendance-summary"
  | "students"
  | "rooms"
  | "schedules-csv"
  | "finance-payments"
  | "defaulter-attendance";

type ReportDef = {
  key: ReportKey;
  title: string;
  description: string;
  format: "pdf" | "csv";
  adminOnly: boolean;
};

const REPORTS: ReportDef[] = [
  {
    key: "timetable",
    title: "Exam timetable",
    description: "All exam schedules with course, program, room, and invigilator.",
    format: "pdf",
    adminOnly: true,
  },
  {
    key: "attendance-summary",
    title: "Attendance summary",
    description: "Per-room attendance counters (present, absent, late, excused).",
    format: "pdf",
    adminOnly: true,
  },
  {
    key: "students",
    title: "Students roster",
    description: "All students with program, semester, fee status, and balance.",
    format: "csv",
    adminOnly: true,
  },
  {
    key: "rooms",
    title: "Rooms inventory",
    description: "All rooms with code, type, capacity, and special-needs flag.",
    format: "csv",
    adminOnly: true,
  },
  {
    key: "schedules-csv",
    title: "Schedules (CSV)",
    description: "Raw exam schedule rows for downstream processing.",
    format: "csv",
    adminOnly: true,
  },
  {
    key: "finance-payments",
    title: "All payments",
    description: "Every payment record (student fees, course reg, penalties, invigilator).",
    format: "pdf",
    adminOnly: false,
  },
  {
    key: "defaulter-attendance",
    title: "Defaulter attendance",
    description: "Students with outstanding fees who attended or missed exams.",
    format: "pdf",
    adminOnly: false,
  },
];

type TimetableRow = {
  scheduleId: string;
  examDate: string;
  startTime: string | null;
  endTime: string | null;
  courseCode: string;
  courseName: string;
  program: string;
  room: string;
  invigilator: string;
  status: string;
};

type AttendanceRow = {
  registerId: string;
  roomName: string;
  status: string;
  presentEquivalent: number;
  late: number;
  excused: number;
  absent: number;
};

type CsvBundle = {
  studentsCsv: string;
  roomsCsv: string;
  schedulesCsv: string;
};

type PaymentRecord = {
  _id: string;
  type: string;
  amount: number;
  status: string;
  reference: string;
  description?: string;
  createdAt: number;
};

type DefaulterRow = {
  studentId: string;
  fullName: string;
  feeStatus: string;
  attendanceStatus: string;
};

export default function ReportsPage() {
  const me = useMe();
  const [busy, setBusy] = useState<ReportKey | null>(null);

  const isAdmin = me.role === "university_admin" || me.role === "super_admin";
  const isFinance = me.role === "finance";
  if (!isAdmin && !isFinance) {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only admins and finance staff can access reports.
      </div>
    );
  }

  const visible = REPORTS.filter((r) => isAdmin || !r.adminOnly);

  const timetable = useQuery(
    api.reports.timetableReport,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) as TimetableRow[] | undefined;

  const attendanceSummary = useQuery(
    api.reports.attendanceSummaryByUniversity,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) as AttendanceRow[] | undefined;

  const csvBundle = useQuery(
    api.reports.exportCsvBundle,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) as CsvBundle | undefined;

  const finance = useQuery(
    api.finance.listFinanceReports,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) as { payments: PaymentRecord[]; defaulterAttendance: DefaulterRow[] } | undefined;

  const ready = {
    timetable: timetable !== undefined,
    "attendance-summary": attendanceSummary !== undefined,
    students: csvBundle !== undefined,
    rooms: csvBundle !== undefined,
    "schedules-csv": csvBundle !== undefined,
    "finance-payments": finance !== undefined,
    "defaulter-attendance": finance !== undefined,
  };

  async function runReport(key: ReportKey) {
    setBusy(key);
    try {
      switch (key) {
        case "timetable":
          if (!timetable) throw new Error("Timetable not loaded");
          downloadPdf("exam-timetable.pdf", [timetableTable(timetable)]);
          break;
        case "attendance-summary":
          if (!attendanceSummary) throw new Error("Attendance summary not loaded");
          downloadPdf("attendance-summary.pdf", [attendanceTable(attendanceSummary)]);
          break;
        case "students":
          if (!csvBundle) throw new Error("Data not loaded");
          downloadCsv("students.csv", csvBundle.studentsCsv);
          break;
        case "rooms":
          if (!csvBundle) throw new Error("Data not loaded");
          downloadCsv("rooms.csv", csvBundle.roomsCsv);
          break;
        case "schedules-csv":
          if (!csvBundle) throw new Error("Data not loaded");
          downloadCsv("schedules.csv", csvBundle.schedulesCsv);
          break;
        case "finance-payments":
          if (!finance) throw new Error("Finance data not loaded");
          downloadPdf("payments.pdf", [paymentsTable(finance.payments)]);
          break;
        case "defaulter-attendance":
          if (!finance) throw new Error("Finance data not loaded");
          downloadPdf("defaulter-attendance.pdf", [defaulterTable(finance.defaulterAttendance)]);
          break;
      }
      toast.success(`${labelFor(key)} exported`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to build report");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Generate and download attendance, timetable, and finance exports."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((r) => (
          <Card key={r.key}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">{r.title}</CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {r.format}
                </Badge>
              </div>
              <CardDescription>{r.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                className="h-8 w-full text-xs"
                disabled={!ready[r.key] || busy !== null}
                onClick={() => void runReport(r.key)}
              >
                {busy === r.key ? (
                  <>
                    <Loader2 className="mr-1 size-3 animate-spin" /> Building…
                  </>
                ) : !ready[r.key] ? (
                  <>
                    <Loader2 className="mr-1 size-3 animate-spin" /> Loading…
                  </>
                ) : (
                  <>
                    <Download className="mr-1 size-3" /> Generate
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {isFinance ? (
        <div className="rounded-md border bg-muted/30 p-4 text-xs text-muted-foreground">
          <p>
            Finance staff see payment and defaulter reports. Admin-only reports (timetable, students,
            rooms, attendance summary) are not visible here.
          </p>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="rounded-md border bg-card shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Preview · Exam timetable</h2>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {timetable?.length ?? 0} rows
            </Badge>
          </div>
          <Separator />
          {timetable === undefined ? (
            <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading…
            </div>
          ) : timetable.length === 0 ? (
            <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
              <FileSpreadsheet className="size-3.5" /> No schedules to preview.
            </div>
          ) : (
            <ScrollArea className="max-h-[40vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Invigilator</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timetable.slice(0, 50).map((r) => (
                    <TableRow key={r.scheduleId}>
                      <TableCell className="text-[10px]">{r.examDate}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {r.startTime ?? "—"}–{r.endTime ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {r.courseCode}
                        <span className="ml-1 text-[10px] text-muted-foreground">{r.courseName}</span>
                      </TableCell>
                      <TableCell className="text-xs">{r.room}</TableCell>
                      <TableCell className="text-xs">{r.invigilator}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      ) : null}
    </div>
  );
}

function labelFor(key: ReportKey): string {
  return REPORTS.find((r) => r.key === key)?.title ?? key;
}

function timetableTable(rows: TimetableRow[]): PdfTable {
  return {
    title: "Exam Timetable",
    columns: [
      { header: "Date", width: 70 },
      { header: "Time", width: 80 },
      { header: "Course", width: 90 },
      { header: "Program", width: 80 },
      { header: "Room", width: 80 },
      { header: "Invigilator", width: 100 },
      { header: "Status", width: 60 },
    ],
    rows: rows.map((r) => [
      r.examDate,
      `${r.startTime ?? "—"}–${r.endTime ?? "—"}`,
      r.courseCode,
      r.program,
      r.room,
      r.invigilator,
      r.status,
    ]),
  };
}

function attendanceTable(rows: AttendanceRow[]): PdfTable {
  return {
    title: "Attendance Summary",
    columns: [
      { header: "Room", width: 120 },
      { header: "Status", width: 80 },
      { header: "Present", width: 60 },
      { header: "Late", width: 50 },
      { header: "Excused", width: 60 },
      { header: "Absent", width: 60 },
    ],
    rows: rows.map((r) => [
      r.roomName,
      r.status,
      String(r.presentEquivalent ?? 0),
      String(r.late ?? 0),
      String(r.excused ?? 0),
      String(r.absent ?? 0),
    ]),
  };
}

function paymentsTable(rows: PaymentRecord[]): PdfTable {
  return {
    title: "All Payments",
    columns: [
      { header: "Created", width: 110 },
      { header: "Type", width: 100 },
      { header: "Reference", width: 110 },
      { header: "Description", width: 150 },
      { header: "Amount", width: 60 },
      { header: "Status", width: 60 },
    ],
    rows: rows.map((p) => [
      formatDateTime(p.createdAt),
      p.type.replace(/_/g, " "),
      p.reference,
      p.description ?? "—",
      p.amount.toLocaleString(),
      p.status,
    ]),
  };
}

function defaulterTable(rows: DefaulterRow[]): PdfTable {
  return {
    title: "Defaulter Attendance",
    columns: [
      { header: "Student ID", width: 100 },
      { header: "Name", width: 160 },
      { header: "Fee status", width: 90 },
      { header: "Attendance", width: 90 },
    ],
    rows: rows.map((r) => [r.studentId, r.fullName, r.feeStatus, r.attendanceStatus]),
  };
}
