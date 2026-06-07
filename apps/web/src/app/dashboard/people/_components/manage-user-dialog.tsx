"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, Loader2, UserCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Label } from "@uni-exam-sys/ui/components/label";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@uni-exam-sys/ui/components/select";

import { roleLabel } from "@/lib/utils";

import {
  ASSIGNABLE_ROLES,
  CREATABLE_ROLES,
  type ClerkUser,
  type Role,
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

type DialogMode = "create" | "changeRole" | "transfer" | "reactivate";

function deriveMode(
  user: ClerkUser,
  me: MeLike,
  currentUniversityId: string | undefined,
): DialogMode {
  if (user.existingUser === null) return "create";
  if (!user.existingUser.isActive) return "reactivate";
  if (user.existingUser.isPlatformUniversity) return "transfer";
  if (
    me.role === "super_admin" &&
    currentUniversityId !== undefined &&
    user.existingUser.universityId !== currentUniversityId
  ) {
    return "transfer";
  }
  return "changeRole";
}

export function ManageUserDialog({
  open,
  onOpenChange,
  me,
  currentUniversityId,
  clerkUser,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  me: MeLike;
  currentUniversityId: string | undefined;
  clerkUser: ClerkUser | null;
  onSuccess?: () => void;
}) {
  const createUser = useMutation(api.users.createUser);
  const updateUserRole = useMutation(api.users.updateUserRole);
  const reactivateUser = useMutation(api.users.reactivateUser);
  const universities = useQuery(api.tenants.listUniversities, {}) ?? [];

  const isSuperAdmin = me.role === "super_admin";

  const mode: DialogMode = useMemo(
    () => (clerkUser ? deriveMode(clerkUser, me, currentUniversityId) : "create"),
    [clerkUser, me, currentUniversityId],
  );

  const [selectedRole, setSelectedRole] = useState<Role>("university_admin");
  const [selectedUniversityId, setSelectedUniversityId] = useState<
    string | undefined
  >(undefined);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [staffId, setStaffId] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!clerkUser) return;
    setSelectedUniversityId(currentUniversityId);
    setFullName(clerkUser.fullName);
    setEmail(clerkUser.email ?? "");
    setPhone(clerkUser.phone ?? "");
    setStaffId("");
    setTitle("");
    setDepartment("");
    setSubmitError(null);

    if (mode === "create") {
      setSelectedRole("university_admin");
    } else if (clerkUser.existingUser) {
      setSelectedRole(clerkUser.existingUser.role as Role);
      if (mode === "transfer") {
        setSelectedUniversityId(currentUniversityId);
      } else {
        setSelectedUniversityId(clerkUser.existingUser.universityId);
      }
    }
  }, [clerkUser, mode, currentUniversityId]);

  if (!clerkUser) return null;

  const isSelf = clerkUser.existingUser?._id === me._id;
  const lecturerRequiresMeta = selectedRole === "lecturer";
  const showUniversityTransfer = mode === "transfer" && isSuperAdmin;
  const titleCopy: Record<DialogMode, { title: string; description: string }> = {
    create: {
      title: "Add new user",
      description: "Create a new platform user from this Clerk account.",
    },
    changeRole: {
      title: "Change role",
      description: clerkUser.existingUser?.isActive
        ? "Reassign this user's role. The change takes effect immediately."
        : "This user is currently inactive. Saving will reactivate them and assign the new role.",
    },
    transfer: {
      title: "Transfer & reassign role",
      description:
        "Move this user to another university and optionally change their role.",
    },
    reactivate: {
      title: "Reactivate user",
      description:
        "Re-enable this user and optionally change their role. Linked records will be reactivated.",
    },
  };

  function reset() {
    setSubmitError(null);
    setSubmitting(false);
  }

  async function handleCreate() {
    if (!clerkUser) return;
    if (!fullName || !email) {
      setSubmitError("Full name and email are required");
      return;
    }
    if (selectedRole === "super_admin" && !isSuperAdmin) {
      setSubmitError("Only super admins can create super admins");
      return;
    }
    if (
      selectedRole !== "student" &&
      selectedRole !== "super_admin" &&
      !me.universityId &&
      !isSuperAdmin
    ) {
      setSubmitError("Select a university to assign this user to");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const targetUniversityId =
        selectedRole === "super_admin"
          ? undefined
          : me.role === "super_admin"
            ? ((selectedUniversityId ?? currentUniversityId) as
                | Id<"universities">
                | undefined)
            : (me.universityId as Id<"universities"> | undefined);

      await createUser({
        universityId: targetUniversityId,
        role: selectedRole,
        externalId: clerkUser.id,
        fullName,
        email,
        phone: phone || undefined,
        staffId: staffId || undefined,
        title: selectedRole === "lecturer" ? title || undefined : undefined,
        department: selectedRole === "lecturer" ? department || undefined : undefined,
      });
      toast.success(`${roleLabel(selectedRole)} created`);
      reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChangeRole() {
    if (!clerkUser?.existingUser) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const universityId =
        mode === "transfer" && isSuperAdmin
          ? (selectedUniversityId as Id<"universities"> | undefined)
          : undefined;
      await updateUserRole({
        userId: clerkUser.existingUser._id as Id<"users">,
        newRole: selectedRole,
        universityId,
        staffId: staffId || undefined,
        title: selectedRole === "lecturer" ? title || undefined : undefined,
        department: selectedRole === "lecturer" ? department || undefined : undefined,
      });
      toast.success(
        mode === "transfer"
          ? "User transferred and role updated"
          : mode === "reactivate"
            ? "User reactivated"
            : "Role updated",
      );
      reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReactivateOnly() {
    if (!clerkUser?.existingUser) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await reactivateUser({ userId: clerkUser.existingUser._id as Id<"users"> });
      toast.success("User reactivated");
      reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to reactivate user");
    } finally {
      setSubmitting(false);
    }
  }

  const submit = () => {
    if (mode === "create") return handleCreate();
    if (mode === "reactivate" && selectedRole === clerkUser.existingUser?.role) {
      return handleReactivateOnly();
    }
    return handleChangeRole();
  };

  const availableRoles = mode === "create" ? CREATABLE_ROLES : ASSIGNABLE_ROLES;

  const submitLabel = (() => {
    if (mode === "create") return "Create user";
    if (mode === "transfer") return "Transfer & save";
    if (
      mode === "reactivate" &&
      selectedRole === clerkUser.existingUser?.role
    ) {
      return "Reactivate";
    }
    return "Save changes";
  })();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="size-4 text-primary" />
            {titleCopy[mode].title}
          </DialogTitle>
          <DialogDescription>{titleCopy[mode].description}</DialogDescription>
        </DialogHeader>

        <UserHeader clerkUser={clerkUser} mode={mode} />

        <ScrollArea className="max-h-[60vh]">
          <form
            className="space-y-3 p-4 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {showUniversityTransfer ? (
              <div className="space-y-1.5">
                <Label>Target university</Label>
                <Select
                  value={selectedUniversityId ?? ""}
                  onValueChange={(v) =>
                    setSelectedUniversityId(v ? v : undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a university">
                      {universities.find((u) => u._id === selectedUniversityId)?.name ??
                        "Select a university"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map((u) => (
                      <SelectItem key={u._id} value={u._id}>
                        {u.name}
                        {u.code ? ` (${u.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  The user will be moved to this university. Linked lecturer /
                  invigilator / finance records will follow.
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as Role)}
              >
                <SelectTrigger>
                  <SelectValue>{roleLabel(selectedRole)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin ? (
                    <SelectItem value="super_admin">Super admin</SelectItem>
                  ) : null}
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole === "super_admin" && !isSuperAdmin ? (
                <p className="text-[10px] text-destructive">
                  Only super admins can promote users to super admin.
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={mode !== "create"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={mode !== "create"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Staff ID</Label>
                <Input
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              {lecturerRequiresMeta ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Dr., Prof., etc."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                </>
              ) : null}
            </div>

            {isSelf ? (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <AlertCircle className="size-3" />
                You cannot change your own role from this dialog.
              </p>
            ) : null}

            {submitError ? (
              <p className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{submitError}</span>
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || isSelf}>
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function UserHeader({
  clerkUser,
  mode,
}: {
  clerkUser: ClerkUser;
  mode: DialogMode;
}) {
  const isPlatformTenant = clerkUser.existingUser?.isPlatformUniversity ?? false;

  return (
    <div className="flex items-start gap-3 border-b px-4 py-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
        {clerkUser.fullName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("")}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{clerkUser.fullName}</p>
        {clerkUser.email ? (
          <p className="truncate text-xs text-muted-foreground">{clerkUser.email}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] font-mono">
            {clerkUser.id}
          </Badge>
          {clerkUser.existingUser ? (
            <Badge
              variant={clerkUser.existingUser.isActive ? "secondary" : "destructive"}
              className="text-[10px]"
            >
              {clerkUser.existingUser.isActive
                ? `${roleLabel(clerkUser.existingUser.role)}`
                : `Inactive • ${roleLabel(clerkUser.existingUser.role)}`}
            </Badge>
          ) : (
            <Badge variant="default" className="text-[10px]">
              New user
            </Badge>
          )}
          {clerkUser.existingUser && !isPlatformTenant ? (
            <Badge variant="outline" className="text-[10px]">
              {clerkUser.existingUser.universityName ?? "No university"}
            </Badge>
          ) : null}
          {mode === "transfer" ? (
            <Badge variant="destructive" className="text-[10px]">
              Cross-tenant
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
