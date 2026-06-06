"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { IdCard, Loader2, Printer, RefreshCcw } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { Separator } from "@uni-exam-sys/ui/components/separator";

import { formatDate } from "@/lib/utils";

export default function MyIdCardPage() {
  const me = useMe();
  const [reprintOpen, setReprintOpen] = useState(false);
  const [reprintReason, setReprintReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const data = useQuery(api.idCards.getMyDigitalIdCard, {});
  const requestReprint = useMutation(api.idCards.requestIdCardReprint);

  if (me.role !== "student") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only students have a digital ID card.
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading your ID card…
      </div>
    );
  }

  if (data === null || !data.student || !data.idCard) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="My ID Card"
          description="Your digital student ID."
        />
        <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
          {data === null
            ? "No student record is linked to your account yet. Contact your university admin."
            : "Your ID card has not been generated yet. It will appear here once your admin issues it."}
        </div>
      </div>
    );
  }

  const { student, idCard, program, university } = data;
  const statusVariant =
    idCard.status === "printed"
      ? "default"
      : idCard.status === "ready" || idCard.status === "reprint_requested"
        ? "secondary"
        : "outline";

  async function submitReprint() {
    if (!idCard) return;
    if (!reprintReason.trim()) {
      setFeedback("Please provide a reason for the reprint.");
      return;
    }
    await requestReprint({ idCardId: idCard._id, reason: reprintReason.trim() });
    setFeedback("Reprint request submitted. Your admin has been notified.");
    setReprintReason("");
    setReprintOpen(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My ID Card"
        description="Digital copy of your student ID. Show this at exam entry."
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setReprintOpen((v) => !v)}
          >
            <RefreshCcw className="mr-1 size-3" /> Request reprint
          </Button>
        }
      />

      {feedback ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{feedback}</div>
      ) : null}

      {reprintOpen ? (
        <div className="rounded-md border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Reprint request</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tell your admin why you need a new card (lost, damaged, name change, etc).
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={reprintReason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReprintReason(e.target.value)}
              placeholder="Reason"
              className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
            />
            <Button size="sm" className="h-8 text-xs" onClick={submitReprint}>
              Submit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setReprintOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <IdCard className="size-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Student ID
            </span>
          </div>
          <Separator className="my-4" />
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">University</p>
              <p className="text-sm font-semibold">{university?.name ?? "—"}</p>
              {university?.code ? (
                <p className="text-[10px] text-muted-foreground">{university.code}</p>
              ) : null}
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Full name</p>
              <p className="text-base font-semibold">{student.fullName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Index #</p>
                <p className="font-medium">{student.indexNumber}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Program</p>
                <p className="font-medium">{program?.name ?? "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Valid from</p>
                <p className="font-medium">{formatDate(idCard.validityStart)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Valid until</p>
                <p className="font-medium">{formatDate(idCard.validityEnd)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Printer className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Card status</h2>
          </div>
          <Separator className="my-3" />
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusVariant} className="text-[10px] capitalize">
                {idCard.status.replace("_", " ")}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Generated</span>
              <span>{formatDate(idCard.generatedAt)}</span>
            </div>
            {idCard.printedAt ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last printed</span>
                <span>{formatDate(idCard.printedAt)}</span>
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">QR code value</span>
              <code className="break-all rounded bg-muted/60 px-2 py-1 text-[10px]">
                {idCard.qrCodeValue}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
