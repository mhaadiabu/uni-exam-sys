"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { FileText, Loader2, MapPin } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import { Separator } from "@uni-exam-sys/ui/components/separator";

import { downloadPdf, type PdfTable } from "@/lib/reports";

export default function MySeatingPage() {
  const me = useMe();
  const [busy, setBusy] = useState(false);

  const rows = useQuery(api.seating.listMySeating, me.role === "student" ? {} : "skip") ?? [];

  async function exportPdf() {
    setBusy(true);
    try {
      const tables: PdfTable[] = [
        {
          title: "My Seating",
          subtitle: me.fullName ?? "",
          columns: [
            { header: "Date", width: 80 },
            { header: "Time", width: 100 },
            { header: "Course", width: 80 },
            { header: "Room", width: 130 },
            { header: "Seat", width: 60 },
          ],
          rows: rows.map((r) => [
            r.schedule?.examDate ?? "—",
            `${r.schedule?.startTime ?? "—"}–${r.schedule?.endTime ?? "—"}`,
            r.course?.code ?? "—",
            `${r.room?.name ?? "—"}${r.room?.code ? ` (${r.room.code})` : ""}`,
            r.seatNumber,
          ]),
        },
      ];
      downloadPdf("my-seating.pdf", tables);
    } finally {
      setBusy(false);
    }
  }

  if (me.role !== "student") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only students have personal seating.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Seating"
        description="Your assigned seat for every exam. Download a printable copy."
        actions={
          <Button size="sm" className="h-8 text-xs" onClick={exportPdf} disabled={busy || rows.length === 0}>
            <FileText className="mr-1 size-3" /> {busy ? "Generating…" : "Download PDF"}
          </Button>
        }
      />

      <div className="rounded-md border bg-card">
        <div className="flex items-center gap-2 p-4">
          <MapPin className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">All seats</h2>
          <Badge variant="secondary" className="text-[10px]">
            {rows.length}
          </Badge>
        </div>
        <Separator />
        {rows === undefined ? (
          <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">
            No seats assigned yet. Once your admin runs seating, you will see your seat
            numbers here.
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <div
                  key={r._id}
                  className="rounded-md border bg-card p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {r.schedule?.examDate ?? "—"}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      Seat {r.seatNumber}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{r.course?.code ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{r.course?.name ?? "—"}</p>
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {r.schedule?.startTime ?? "—"}–{r.schedule?.endTime ?? "—"}
                    </span>
                    <span className="font-medium">{r.room?.name ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
