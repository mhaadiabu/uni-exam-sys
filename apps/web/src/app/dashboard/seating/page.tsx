"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { FileDown, LayoutGrid, Lock, Plus, Unlock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { Input } from "@uni-exam-sys/ui/components/input";
import { Label } from "@uni-exam-sys/ui/components/label";
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

import { downloadPdf, type PdfTable } from "@/lib/reports";
import { roleLabel } from "@/lib/utils";

export default function SeatingPage() {
  const me = useMe();
  const [scheduleId, setScheduleId] = useState<Id<"examSchedules"> | "">("");
  const [mode, setMode] = useState<"sequential" | "shuffled">("sequential");
  const [seed, setSeed] = useState<number | "">("");

  const schedules = useQuery(
    api.schedules.listSchedules,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];
  const chart = useQuery(
    api.seating.getSeatingChart,
    scheduleId ? { examScheduleId: scheduleId } : "skip",
  );

  const generateSeating = useMutation(api.seating.generateSeating);
  const freezeSeating = useMutation(api.seating.freezeSeating);
  const [busy, setBusy] = useState(false);

  const selectedSchedule = schedules.find((s) => s._id === scheduleId);

  if (me.role !== "university_admin" && me.role !== "super_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only university admins can manage seating.
      </div>
    );
  }

  if (!me.universityId) {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        No university linked to your account.
      </div>
    );
  }

  async function handleGenerate() {
    if (!me.universityId || !scheduleId) {
      toast.error("Select a schedule first");
      return;
    }
    setBusy(true);
    try {
      await generateSeating({
        universityId: me.universityId,
        examScheduleId: scheduleId,
        mode,
        seed: seed === "" ? undefined : Number(seed),
      });
      toast.success("Seating generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate seating");
    } finally {
      setBusy(false);
    }
  }

  async function handleFreeze(frozen: boolean) {
    if (!scheduleId) {
      toast.error("Select a schedule first");
      return;
    }
    try {
      await freezeSeating({ examScheduleId: scheduleId, frozen });
      toast.success(frozen ? "Seating frozen" : "Seating unfrozen");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle freeze");
    }
  }

  function handleDownload() {
    if (!chart?.rows?.length) {
      toast.error("No seating data to download");
      return;
    }
    const tables: PdfTable[] = [
      {
        title: "Seating Chart",
        subtitle: selectedSchedule
          ? `${selectedSchedule.examDate} | ${selectedSchedule.course?.code ?? ""} - ${selectedSchedule.course?.name ?? ""}`
          : "Seating Chart",
        columns: [
          { header: "Seat", width: 60 },
          { header: "Student ID", width: 100 },
          { header: "Name", width: 150 },
          { header: "Index", width: 80 },
          { header: "Room", width: 100 },
        ],
        rows: chart.rows.map((r) => [
          r.seatNumber,
          r.studentId,
          r.studentName,
          r.indexNumber,
          `${r.roomName} (${r.roomCode})`,
        ]),
      },
    ];
    downloadPdf("seating-chart.pdf", tables);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Seating"
        description="Generate seating arrangements and download the chart."
      />

      <div className="rounded-md border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Schedule</Label>
            <Select
              value={scheduleId || undefined}
              onValueChange={(v) => setScheduleId(v as Id<"examSchedules">)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select schedule">
                  {(() => {
                    const s = schedules.find((x) => x._id === scheduleId);
                    if (!s) return "Select schedule";
                    return `${s.course?.code ?? s.examDate} — ${s.examDate} ${s.startTime ?? ""}`;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {schedules.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.course?.code ?? "—"} — {s.examDate} {s.startTime ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger>
                <SelectValue>
                  {mode === "sequential" ? "Sequential" : "Shuffled"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sequential">Sequential</SelectItem>
                <SelectItem value="shuffled">Shuffled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "shuffled" ? (
            <div className="space-y-1.5">
              <Label>Seed (optional)</Label>
              <Input
                type="number"
                value={seed}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSeed(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="123"
              />
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-end">
            <Button onClick={handleGenerate} disabled={!scheduleId || busy} className="w-full">
              <Plus className="mr-1 size-3.5" />
              Generate
            </Button>
          </div>
          <div className="flex items-end gap-1">
            <Button
              variant="outline"
              onClick={() => void handleFreeze(!chart?.frozen)}
              disabled={!scheduleId}
            >
              {chart?.frozen ? <Unlock className="mr-1 size-3.5" /> : <Lock className="mr-1 size-3.5" />}
              {chart?.frozen ? "Unfreeze" : "Freeze"}
            </Button>
          </div>
        </div>
      </div>

      {scheduleId ? (
        <div className="rounded-md border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Seating chart</h2>
              <Badge variant="secondary">{chart?.rows.length ?? 0} seats</Badge>
              {chart?.frozen ? (
                <Badge variant="default" className="text-[10px]">
                  <Lock className="mr-0.5 size-2.5" />
                  Frozen
                </Badge>
              ) : null}
              {selectedSchedule ? (
                <span className="text-[11px] text-muted-foreground">
                  {selectedSchedule.course?.code} — {selectedSchedule.examDate}
                  {" · "}
                  {roleLabel(selectedSchedule.status)}
                </span>
              ) : null}
            </div>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!chart?.rows.length}>
              <FileDown className="mr-1 size-3.5" />
              Download PDF
            </Button>
          </div>
          <Separator />
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seat</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Index</TableHead>
                  <TableHead>Room</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(chart?.rows ?? []).map((r) => (
                  <TableRow key={r.assignmentId}>
                    <TableCell className="font-mono text-xs">{r.seatNumber}</TableCell>
                    <TableCell className="text-xs">{r.studentId}</TableCell>
                    <TableCell className="text-xs font-medium">{r.studentName}</TableCell>
                    <TableCell className="text-xs">{r.indexNumber}</TableCell>
                    <TableCell className="text-xs">
                      {r.roomName} <span className="text-muted-foreground">({r.roomCode})</span>
                    </TableCell>
                  </TableRow>
                ))}
                {chart?.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-xs text-muted-foreground">
                      No seating generated yet. Click “Generate” to create the chart.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );
}
