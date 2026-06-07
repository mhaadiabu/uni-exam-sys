"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@uni-exam-sys/ui/components/dialog";
import { Input } from "@uni-exam-sys/ui/components/input";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import { Separator } from "@uni-exam-sys/ui/components/separator";

import {
  actionLabel,
  canActOn,
  type ClerkUser,
  describeStatus,
  statusBadgeLabel,
  type UserStatus,
} from "./people-types";

type MeLike = {
  _id: string;
  role:
    | "super_admin"
    | "university_admin"
    | "lecturer"
    | "student"
    | "invigilator"
    | "finance";
  universityId?: string;
};

const DEBOUNCE_MS = 300;

export function ClerkUserPicker({
  open,
  onOpenChange,
  me,
  currentUniversityId,
  onPickUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  me: MeLike;
  currentUniversityId: string | undefined;
  onPickUser: (clerkUser: ClerkUser) => void;
}) {
  const listClerkUsers = useAction(api.clerkUsers.listClerkUsers);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ClerkUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestSeq = useRef(0);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setResults(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      listClerkUsers({ limit: 50, query: search.trim() || undefined })
        .then((res) => {
          if (seq !== requestSeq.current) return;
          setResults(res.users);
        })
        .catch((err: unknown) => {
          if (seq !== requestSeq.current) return;
          setError(err instanceof Error ? err.message : "Failed to load Clerk users");
        })
        .finally(() => {
          if (seq !== requestSeq.current) return;
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, search, listClerkUsers]);

  const grouped = useMemo(() => {
    const out: Record<UserStatus, ClerkUser[]> = {
      available: [],
      same: [],
      other: [],
      inactive: [],
      self: [],
    };
    if (!results) return out;
    for (const u of results) {
      const status = describeStatus(u, me, currentUniversityId);
      out[status].push(u);
    }
    return out;
  }, [results, me, currentUniversityId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle>Pick a user from Clerk</DialogTitle>
          <DialogDescription>
            Search any Clerk account. New users get added to{" "}
            <span className="font-medium">
              {me.universityId ? "your university" : "the selected tenant"}
            </span>
            . Existing users can have their role reassigned from here.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or username"
              className="h-8 pl-7 pr-7 text-sm"
            />
            {loading ? (
              <Loader2 className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          {error ? (
            <div className="flex items-start gap-2 p-4 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <p className="font-medium">Could not load Clerk users</p>
                <p className="text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : results === null ? (
            <div className="flex items-center justify-center gap-2 p-6 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading Clerk users…
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <p className="font-medium">No matches</p>
              <p className="mt-1">
                Try a different name, email, or username. If the user has not
                signed up yet, invite them to your Clerk application first.
              </p>
            </div>
          ) : (
            <PickerGroups
              grouped={grouped}
              me={me}
              onPickUser={onPickUser}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function PickerGroups({
  grouped,
  me,
  onPickUser,
}: {
  grouped: Record<UserStatus, ClerkUser[]>;
  me: MeLike;
  onPickUser: (user: ClerkUser) => void;
}) {
  return (
    <div className="space-y-3 p-2">
      <PickerSection
        title="Available"
        description="Not yet on the platform. Adding will create a new user record."
        users={grouped.available}
        me={me}
        onPickUser={onPickUser}
      />
      <PickerSection
        title="In this university"
        description="Already on the platform. You can change or reassign their role."
        users={grouped.same}
        me={me}
        onPickUser={onPickUser}
      />
      <PickerSection
        title="Inactive"
        description="Deactivated users. Reactivating will also let you change their role."
        users={grouped.inactive}
        me={me}
        onPickUser={onPickUser}
      />
      <PickerSection
        title="In another university"
        description={
          me.role === "super_admin"
            ? "Cross-tenant transfer and role change is available for super admins."
            : "Only super admins can reassign users across universities."
        }
        users={grouped.other}
        me={me}
        onPickUser={onPickUser}
      />
      <PickerSection
        title="You"
        description="Your own account. Self-edits are blocked for safety."
        users={grouped.self}
        me={me}
        onPickUser={onPickUser}
      />
    </div>
  );
}

function PickerSection({
  title,
  description,
  users,
  me,
  onPickUser,
}: {
  title: string;
  description: string;
  users: ClerkUser[];
  me: MeLike;
  onPickUser: (user: ClerkUser) => void;
}) {
  if (users.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="px-2 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title} <span className="font-normal">({users.length})</span>
        </p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <ul className="space-y-1">
        {users.map((u) => (
          <li key={u.id}>
            <PickerRow user={u} me={me} onPickUser={onPickUser} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PickerRow({
  user,
  me,
  onPickUser,
}: {
  user: ClerkUser;
  me: MeLike;
  onPickUser: (user: ClerkUser) => void;
}) {
  const status = describeStatus(user, me, me.universityId);
  const enabled = canActOn(status, me);
  const label = actionLabel(status, me);

  return (
    <div
      className={
        "flex items-start gap-3 rounded-md border bg-card p-2.5 transition-colors " +
        (enabled ? "hover:bg-muted/40" : "opacity-70")
      }
    >
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {initials(user.fullName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.fullName}</p>
        {user.email ? (
          <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={status} user={user} />
          {user.username && user.username !== user.id ? (
            <span className="text-[10px] text-muted-foreground">@{user.username}</span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0">
        <Button
          size="xs"
          variant={status === "available" ? "default" : "outline"}
          disabled={!enabled}
          onClick={() => onPickUser(user)}
        >
          {label ?? "Not editable"}
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status, user }: { status: UserStatus; user: ClerkUser }) {
  const variant =
    status === "available"
      ? "default"
      : status === "same"
        ? "secondary"
        : status === "inactive"
          ? "outline"
          : status === "other"
            ? "destructive"
            : "outline";

  return (
    <Badge variant={variant} className="text-[10px]">
      {statusBadgeLabel(status, user)}
    </Badge>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
