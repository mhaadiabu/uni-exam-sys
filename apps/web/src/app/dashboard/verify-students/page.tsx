"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  BadgeCheck,
  History,
  IdCard,
  Loader2,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@uni-exam-sys/ui/components/card";
import { Input } from "@uni-exam-sys/ui/components/input";
import { Label } from "@uni-exam-sys/ui/components/label";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import { Separator } from "@uni-exam-sys/ui/components/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@uni-exam-sys/ui/components/tabs";

import { formatDateTime } from "@/lib/utils";

type Match = {
  student: {
    _id: Id<"students">;
    fullName: string;
    studentId: string;
    indexNumber: string;
    programId: Id<"programs">;
    feeStatus: "cleared" | "outstanding";
  };
  program: { name: string; code: string } | null;
  idCard: {
    cardNumber: string;
    issuedAt: number;
    expiresAt?: number;
  } | null;
};

export default function VerifyStudentsPage() {
  const me = useMe();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Match | null>(null);
  const [reason, setReason] = useState("");
  const [applyPenalty, setApplyPenalty] = useState(false);
  const [penaltyPoints, setPenaltyPoints] = useState("1");
  const [tab, setTab] = useState<"verify" | "history">("verify");

  const matches = useQuery(
    api.verification.searchStudentsForVerification,
    search.trim().length >= 2 ? { searchTerm: search.trim() } : "skip",
  ) as Match[] | undefined;

  const history = useQuery(api.verification.verificationHistory, me.universityId ? { universityId: me.universityId } : "skip") ?? [];

  const verify = useMutation(api.verification.verifyStudent);

  if (me.role !== "invigilator" && me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only invigilators and admins can verify students.
      </div>
    );
  }

  async function submit() {
    if (!selected) {
      toast.error("Pick a student first");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please describe the issue");
      return;
    }
    const points = Number(penaltyPoints) || 1;
    try {
      await verify({
        studentDocId: selected.student._id,
        searchTerm: search.trim() || selected.student.indexNumber,
        reason: reason.trim(),
        applyPenalty,
        penaltyPoints: applyPenalty ? points : undefined,
      });
      toast.success(applyPenalty ? `Penalty (${points} pts) applied` : "Verification logged");
      setReason("");
      setApplyPenalty(false);
      setPenaltyPoints("1");
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log verification");
    }
  }

  const todayCount = useMemo(
    () => history.filter((h) => new Date(h.timestamp).toDateString() === new Date().toDateString()).length,
    [history],
  );
  const penaltyCount = useMemo(() => history.filter((h) => h.penaltyApplied).length, [history]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Verify Students"
        description="Look up a student, log ID checks, and apply misconduct penalties."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Today</p>
          <p className="mt-1 text-lg font-semibold text-primary">{todayCount}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Total checks</p>
          <p className="mt-1 text-lg font-semibold">{history.length}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Penalties applied</p>
          <p className="mt-1 text-lg font-semibold">{penaltyCount}</p>
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <div className="p-3">
            <TabsList>
              <TabsTrigger value="verify">
                <IdCard className="mr-1 size-3.5" /> Verify
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-1 size-3.5" /> History
              </TabsTrigger>
            </TabsList>
          </div>
          <Separator />
          <TabsContent value="verify">
            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-md border bg-card p-2 shadow-sm">
                  <Search className="size-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    placeholder="Search by name, student id, or index…"
                    className="h-8 border-0 shadow-none focus-visible:ring-0"
                  />
                  {search ? (
                    <button
                      onClick={() => {
                        setSearch("");
                        setSelected(null);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </div>
                {search.trim().length < 2 ? (
                  <p className="px-2 text-[11px] text-muted-foreground">
                    Type at least 2 characters to search.
                  </p>
                ) : matches === undefined ? (
                  <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Searching…
                  </div>
                ) : matches.length === 0 ? (
                  <p className="px-2 text-[11px] text-muted-foreground">No students match.</p>
                ) : (
                  <ScrollArea className="max-h-[50vh]">
                    <div className="space-y-1.5">
                      {matches.map((m) => (
                        <button
                          key={m.student._id}
                          onClick={() => setSelected(m)}
                          className={
                            "w-full rounded-md border p-2 text-left text-xs transition-colors " +
                            (selected?.student._id === m.student._id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/40")
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium">{m.student.fullName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {m.student.studentId} · {m.student.indexNumber}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              {m.idCard ? (
                                <Badge variant="default" className="text-[9px]">
                                  <BadgeCheck className="mr-0.5 size-2.5" /> ID on file
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[9px]">
                                  no ID
                                </Badge>
                              )}
                              <Badge
                                variant={m.student.feeStatus === "cleared" ? "outline" : "secondary"}
                                className="text-[9px] capitalize"
                              >
                                {m.student.feeStatus}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <div className="space-y-3">
                {!selected ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>No student selected</CardTitle>
                      <CardDescription>
                        Search and pick a student on the left to log a verification or apply a
                        penalty.
                      </CardDescription>
                    </CardHeader>
                    <CardContent />
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle>{selected.student.fullName}</CardTitle>
                          <CardDescription>
                            {selected.student.studentId} · {selected.student.indexNumber} ·{" "}
                            {selected.program?.name ?? "—"}
                          </CardDescription>
                        </div>
                        {selected.idCard ? (
                          <Badge variant="default" className="text-[10px]">
                            <BadgeCheck className="mr-0.5 size-3" /> ID #{selected.idCard.cardNumber}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="mr-0.5 size-3" /> No ID on file
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>Reason / observation</Label>
                        <Input
                          value={reason}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                          placeholder="e.g. Photo mismatch, expired ID, missing card…"
                          className="h-9 text-xs"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={applyPenalty}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplyPenalty(e.target.checked)}
                        />
                        <ShieldAlert className="size-3.5 text-destructive" /> Apply misconduct penalty
                      </label>
                      {applyPenalty ? (
                        <div className="space-y-1.5">
                          <Label>Penalty points</Label>
                          <Input
                            type="number"
                            min={1}
                            value={penaltyPoints}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPenaltyPoints(e.target.value)}
                            className="h-9 w-24 text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Points accrue per term. 3 = warning, 5 = admin review, 7 = disciplinary flag.
                          </p>
                        </div>
                      ) : null}
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelected(null);
                            setReason("");
                          }}
                        >
                          Clear
                        </Button>
                        <Button size="sm" onClick={() => void submit()}>
                          Log verification
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="history">
            {history.length === 0 ? (
              <div className="p-6 text-xs text-muted-foreground">No verification logs yet.</div>
            ) : (
              <ScrollArea className="max-h-[60vh]">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">When</th>
                      <th className="px-3 py-2 text-left">Student</th>
                      <th className="px-3 py-2 text-left">Reason</th>
                      <th className="px-3 py-2 text-left">Penalty</th>
                      <th className="px-3 py-2 text-left">Invigilator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h._id} className="border-t">
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {formatDateTime(h.timestamp)}
                        </td>
                        <td className="px-3 py-2 font-medium">{h.student?.fullName ?? "—"}</td>
                        <td className="px-3 py-2">{h.reason}</td>
                        <td className="px-3 py-2">
                          {h.penaltyApplied ? (
                            <Badge variant="destructive" className="text-[10px]">
                              {h.penaltyPoints} pt{h.penaltyPoints === 1 ? "" : "s"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">none</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-muted-foreground">
                          {h.invigilator?.fullName ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
