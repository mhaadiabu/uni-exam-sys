"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Building2,
  History,
  Mail,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

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
import { Separator } from "@uni-exam-sys/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@uni-exam-sys/ui/components/table";

import { formatDate } from "@/lib/utils";

type University = {
  _id: Id<"universities">;
  name: string;
  code?: string;
  prefix?: string;
  allowedEmailDomains: string[];
  isActive: boolean;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export default function UniversitiesPage() {
  const me = useMe();
  const universities = useQuery(api.tenants.listUniversities, {}) ?? [];
  const deletedUniversities = useQuery(api.tenants.listUniversities, { includeDeleted: true }) ?? [];
  const createUniversity = useMutation(api.bootstrap.createUniversity);
  const updateAllowedEmailDomains = useMutation(api.tenants.updateAllowedEmailDomains);
  const softDeleteUniversity = useMutation(api.tenants.softDeleteUniversity);
  const restoreUniversity = useMutation(api.tenants.restoreUniversity);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [domains, setDomains] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<Id<"universities"> | null>(null);
  const [editDomains, setEditDomains] = useState("");
  const [savingDomains, setSavingDomains] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<University | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [restoringId, setRestoringId] = useState<Id<"universities"> | null>(null);

  if (me.role !== "super_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        You need super-admin access to manage universities.
      </div>
    );
  }

  async function handleCreate() {
    if (!name || !domains) {
      toast.error("Name and at least one email domain are required");
      return;
    }
    setCreating(true);
    try {
      await createUniversity({
        universityName: name,
        universityPrefix: prefix.trim() || undefined,
        allowedEmailDomains: domains
          .split(",")
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean),
      });
      toast.success("University created");
      setName("");
      setPrefix("");
      setDomains("");
      setShowCreate(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create university");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveDomains(id: Id<"universities">) {
    const list = editDomains
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    if (list.length === 0) {
      toast.error("At least one domain is required");
      return;
    }
    setSavingDomains(true);
    try {
      await updateAllowedEmailDomains({ universityId: id, allowedEmailDomains: list });
      toast.success("Email domains updated");
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update domains");
    } finally {
      setSavingDomains(false);
    }
  }

  function startEdit(u: University) {
    setEditingId(u._id);
    setEditDomains((u.allowedEmailDomains ?? []).join(", "));
  }

  function openDelete(u: University) {
    setConfirmDelete(u);
    setConfirmText("");
  }

  function closeDelete() {
    if (deleting) return;
    setConfirmDelete(null);
    setConfirmText("");
  }

  async function confirmDeleteNow() {
    if (!confirmDelete) return;
    if (confirmText.trim() !== confirmDelete.name) {
      toast.error("Confirmation name does not match");
      return;
    }
    setDeleting(true);
    try {
      await softDeleteUniversity({
        universityId: confirmDelete._id,
        confirmationName: confirmText,
      });
      toast.success(`${confirmDelete.name} deleted (recoverable from “Deleted”)`);
      setConfirmDelete(null);
      setConfirmText("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  async function handleRestore(id: Id<"universities">) {
    setRestoringId(id);
    try {
      await restoreUniversity({ universityId: id });
      toast.success("University restored");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore");
    } finally {
      setRestoringId(null);
    }
  }

  const active = universities.filter((u) => !u.deletedAt);
  const deleted = deletedUniversities.filter((u) => u.deletedAt);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Universities"
        description="Tenant administration — create universities, set email domains, soft-delete tenants."
        actions={
          <Button onClick={() => setShowCreate((v) => !v)}>
            <Plus className="mr-1 size-3.5" />
            New university
          </Button>
        }
      />

      {showCreate ? (
        <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Create university</h2>
          </div>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="uni-name">Name</Label>
              <Input
                id="uni-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kwame Nkrumah University"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uni-prefix">
                Student ID prefix <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="uni-prefix"
                value={prefix}
                onChange={(e) =>
                  setPrefix(e.target.value.toUpperCase().replace(/\s+/g, ""))
                }
                placeholder="e.g. KNU"
                maxLength={16}
              />
              <p className="text-[10px] text-muted-foreground">
                Prepended automatically to every student ID created under this university. Include
                a separator in the prefix if you want one (e.g. <code>KNU-</code>).
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="uni-domains">Allowed email domains</Label>
              <Input
                id="uni-domains"
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
                placeholder="knu.edu, knu.ac.uk"
              />
              <p className="text-[10px] text-muted-foreground">
                Comma-separated. Sign-ups with these email domains are auto-assigned to this tenant.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create university"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-2 p-4">
          <h2 className="text-sm font-semibold">All universities</h2>
          <Badge variant="secondary">{active.length}</Badge>
        </div>
        <Separator />
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email domains</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-56">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((u) => (
                <TableRow key={u._id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{u.name}</span>
                      {u.prefix ? (
                        <span className="text-[10px] text-muted-foreground">
                          ID prefix: <span className="font-mono">{u.prefix}</span>
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {editingId === u._id ? (
                      <div className="flex flex-col gap-1.5">
                        <Input
                          value={editDomains}
                          onChange={(e) => setEditDomains(e.target.value)}
                          placeholder="domain1.edu, domain2.edu"
                          className="h-7 text-xs"
                        />
                        <div className="flex gap-1">
                          <Button
                            size="xs"
                            onClick={() => void handleSaveDomains(u._id)}
                            disabled={savingDomains}
                          >
                            Save
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {(u.allowedEmailDomains ?? []).join(", ") || "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge variant="default" className="text-[10px]">Active</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => startEdit(u)}
                        disabled={editingId === u._id}
                      >
                        <Mail className="mr-1 size-3" />
                        Domains
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => openDelete(u)}
                      >
                        <Trash2 className="mr-1 size-3" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {active.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-xs text-muted-foreground">
                    No universities yet. Use “New university” to create the first one.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <details className="rounded-md border bg-card shadow-sm group">
        <summary className="flex cursor-pointer items-center justify-between gap-2 p-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <span>Deleted</span>
            <span className="text-xs text-muted-foreground">(soft-deleted, recoverable)</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {deleted.length}
          </Badge>
        </summary>
        <Separator />
        {deleted.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground">No deleted universities.</div>
        ) : (
          <ScrollArea className="max-h-[40vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deleted.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium">{u.name}</span>
                        {u.prefix ? (
                          <span className="text-[10px] text-muted-foreground">
                            prefix <span className="font-mono">{u.prefix}</span>
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.deletedAt ? formatDate(u.deletedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => void handleRestore(u._id)}
                        disabled={restoringId === u._id}
                      >
                        <RotateCcw className="mr-1 size-3" />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </details>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) closeDelete();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              Delete {confirmDelete?.name}?
            </DialogTitle>
            <DialogDescription>
              This is a <strong>soft delete</strong>. The university, its users, and all
              associated data are hidden from views and no new sign-ins are accepted. You can
              restore it later from the “Deleted” list below.
            </DialogDescription>
          </DialogHeader>

          {confirmDelete ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <p className="text-muted-foreground">Type the name to confirm:</p>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                  {confirmDelete.name}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-name">University name</Label>
                <Input
                  id="confirm-name"
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmDelete.name}
                  className="h-9 text-xs"
                />
                {confirmText.trim() && confirmText.trim() !== confirmDelete.name ? (
                  <p className="text-[10px] text-destructive">Name does not match.</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDelete} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteNow()}
              disabled={
                deleting ||
                !confirmDelete ||
                confirmText.trim() !== (confirmDelete?.name ?? "")
              }
            >
              {deleting ? "Deleting…" : "Delete university"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
