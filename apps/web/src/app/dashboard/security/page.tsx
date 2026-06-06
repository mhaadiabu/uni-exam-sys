"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  KeyRound,
  Loader2,
  Lock,
  ScrollText,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@uni-exam-sys/ui/components/card";
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

import { formatDateTime } from "@/lib/utils";

type AuditRow = {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
  actorRole?: string;
  universityId?: string;
  context?: Record<string, unknown>;
  createdAt: number;
  actor?: { _id: string; fullName: string | null; role: string | null } | null;
};

const SECURITY_PREFIXES = [
  "user.",
  "verification.",
  "penalty.",
  "branding.",
  "university.",
];

function isSecurityAction(action: string) {
  return SECURITY_PREFIXES.some((prefix) => action.startsWith(prefix));
}

export default function SecurityPage() {
  const me = useMe();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<"security" | "all">("security");

  if (me.role !== "university_admin" && me.role !== "super_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only university admins can access security settings.
      </div>
    );
  }

  const logs = useQuery(api.dashboard.listAuditLogs, { limit: 200 }) as AuditRow[] | undefined;

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs
      .filter((row) => (actionFilter === "security" ? isSecurityAction(row.action) : true))
      .filter((row) => {
        if (!search.trim()) return true;
        const term = search.trim().toLowerCase();
        return (
          row.action.toLowerCase().includes(term) ||
          row.entityType.toLowerCase().includes(term) ||
          (row.actor?.fullName ?? "").toLowerCase().includes(term) ||
          (row.context ? JSON.stringify(row.context).toLowerCase().includes(term) : false)
        );
      });
  }, [logs, search, actionFilter]);

  const todayCount = useMemo(() => {
    if (!logs) return 0;
    const todayKey = new Date().toDateString();
    return logs.filter(
      (l) => isSecurityAction(l.action) && new Date(l.createdAt).toDateString() === todayKey,
    ).length;
  }, [logs]);

  const verificationCount = useMemo(
    () => logs?.filter((l) => l.action === "verification.logged").length ?? 0,
    [logs],
  );

  const userChanges = useMemo(
    () => logs?.filter((l) => l.action === "user.role_changed" || l.action === "user.deactivated").length ?? 0,
    [logs],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Security"
        description="Authentication posture, identity events, and privileged actions."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">Security events today</p>
          <p className="mt-1 text-lg font-semibold text-primary">{todayCount}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">ID verifications logged</p>
          <p className="mt-1 text-lg font-semibold">{verificationCount}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-[11px] uppercase text-muted-foreground">User role / deactivation events</p>
          <p className="mt-1 text-lg font-semibold">{userChanges}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              <CardTitle className="text-sm">Two-factor authentication</CardTitle>
            </div>
            <CardDescription>
              2FA, session management, and password resets are handled by Clerk. Use the user
              button in the top-right of the app to enable 2FA, manage active sessions, or sign out
              of other devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-xs">
              <ShieldCheck className="size-4 text-primary" />
              <span>Clerk-backed authentication is enforced for all roles.</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCog className="size-4 text-primary" />
              <CardTitle className="text-sm">Identity &amp; access</CardTitle>
            </div>
            <CardDescription>
              Manage who has access and what they can do from the People page. Deactivate users
              there to revoke access immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-xs">
              <Lock className="size-4 text-primary" />
              <span>Role changes are audit-logged. Review the table below.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ScrollText className="size-4 text-primary" />
            <CardTitle className="text-sm">Activity log</CardTitle>
          </div>
          <CardDescription>
            Recent privileged actions: user changes, verifications, penalty resets, branding
            changes, university config. All times are server-local.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Search action, actor, or context…"
              className="h-8 flex-1 min-w-[200px] text-xs"
            />
            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as typeof actionFilter)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue>
                  {actionFilter === "security" ? "Security events" : "All events"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="security">Security events</SelectItem>
                <SelectItem value="all">All events</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {logs === undefined ? (
            <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading activity…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5" /> No events match the current filter.
            </div>
          ) : (
            <ScrollArea className="max-h-[55vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Context</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {row.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {row.entityType}
                      </TableCell>
                      <TableCell className="text-[11px]">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {row.actor?.fullName ?? "—"}
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {row.actor?.role ?? row.actorRole ?? ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-[10px] text-muted-foreground">
                        {row.context ? JSON.stringify(row.context) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
