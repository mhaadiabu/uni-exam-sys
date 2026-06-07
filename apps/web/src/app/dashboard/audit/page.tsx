"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Search, Shield } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
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
import { cn } from "@uni-exam-sys/ui/lib/utils";

import { formatDateTime, roleLabel } from "@/lib/utils";

const HIDDEN_CONTEXT_KEYS = new Set([
  "previousExternalId",
  "newExternalId",
  "externalId",
  "createdBy",
  "id",
  "_id",
]);

function formatContext(raw: string | undefined): { display: string; full: string } {
  if (!raw) return { display: "—", full: "" };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed as Record<string, unknown>).filter(
        ([k]) => !HIDDEN_CONTEXT_KEYS.has(k),
      );
      if (entries.length === 0) return { display: "—", full: "" };
      const full = entries
        .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join(" · ");
      const display = full.length > 140 ? `${full.slice(0, 137)}…` : full;
      return { display, full };
    }
    return { display: String(parsed), full: String(parsed) };
  } catch {
    return { display: raw, full: raw };
  }
}

export default function AuditPage() {
  const me = useMe();
  const [search, setSearch] = useState("");
  const [universityFilter, setUniversityFilter] = useState<"all" | string>("all");

  const universities = useQuery(api.tenants.listUniversities, {}) ?? [];
  const scopedUniversityId =
    me.role === "super_admin"
      ? universityFilter === "all"
        ? undefined
        : (universityFilter as Id<"universities">)
      : me.universityId;

  const logs = useQuery(
    api.dashboard.listAuditLogs,
    me.role === "super_admin" || me.role === "university_admin"
      ? { universityId: scopedUniversityId, limit: 300 }
      : "skip",
  );

  const filtered = useMemo(() => {
    if (!logs) return [];
    if (!search.trim()) return logs;
    const term = search.trim().toLowerCase();
    return logs.filter((log) => {
      return (
        log.action.toLowerCase().includes(term) ||
        log.entityType.toLowerCase().includes(term) ||
        log.entityId?.toLowerCase().includes(term) ||
        log.context?.toLowerCase().includes(term) ||
        log.actor?.fullName?.toLowerCase().includes(term)
      );
    });
  }, [logs, search]);

  if (me.role !== "super_admin" && me.role !== "university_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        You need admin access to view the audit log.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Log"
        description={
          me.role === "super_admin"
            ? "System-wide activity across all tenants."
            : `Activity for ${me.university?.name ?? "this university"}.`
        }
      />

      <div className="rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Filter by action, entity, actor..."
              className="h-8 pl-7 text-xs"
            />
          </div>
          {me.role === "super_admin" ? (
            <Select
              value={universityFilter}
              onValueChange={(v) => setUniversityFilter((v as string) ?? "all")}
            >
              <SelectTrigger className="h-8 w-56 text-xs">
                <SelectValue placeholder="All universities">
                  {universityFilter === "all"
                    ? "All universities"
                    : universities.find((u) => u._id === universityFilter)?.name ?? "University"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All universities</SelectItem>
                {universities.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Badge variant="secondary" className="text-[10px]">
            {filtered.length} events
          </Badge>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <div className="flex items-center gap-2 p-4">
          <Shield className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Activity</h2>
        </div>
        <Separator />
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">When</TableHead>
                <TableHead className="w-44">Actor</TableHead>
                <TableHead className="w-44">Action</TableHead>
                <TableHead className="w-44">Entity</TableHead>
                <TableHead>Context</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => {
                const ctx = formatContext(log.context);
                return (
                  <TableRow key={log._id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.actor ? (
                        <div className="flex flex-col">
                          <span className="truncate font-medium" title={log.actor.fullName ?? ""}>
                            {log.actor.fullName ?? "—"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {log.actor.role ? roleLabel(log.actor.role) : "—"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px]">
                        {log.action}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium">{log.entityType}</span>
                        {log.entityId ? (
                          <span
                            className="font-mono text-[10px] text-muted-foreground"
                            title={log.entityId}
                          >
                            #{log.entityId.slice(-6)}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "min-w-0 max-w-0 text-[11px] text-muted-foreground",
                        "whitespace-normal",
                      )}
                    >
                      <span className="block truncate" title={ctx.full}>
                        {ctx.display}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-xs text-muted-foreground">
                    No audit events match your filter.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
