"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Building2, Mail, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/kpi";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
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

import { formatDate, roleLabel } from "@/lib/utils";

import { useMe } from "@/components/dashboard/dashboard-layout-shell";

type University = {
  _id: Id<"universities">;
  name: string;
  code: string;
  allowedEmailDomains: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export default function UniversitiesPage() {
  const me = useMe();
  const universities = useQuery(api.tenants.listUniversities, {}) ?? [];
  const createUniversity = useMutation(api.bootstrap.createUniversity);
  const updateAllowedEmailDomains = useMutation(api.tenants.updateAllowedEmailDomains);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [domains, setDomains] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<Id<"universities"> | null>(null);
  const [editDomains, setEditDomains] = useState("");
  const [savingDomains, setSavingDomains] = useState(false);

  if (me.role !== "super_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        You need super-admin access to manage universities.
      </div>
    );
  }

  async function handleCreate() {
    if (!name || !code || !domains) {
      toast.error("Name, code, and at least one email domain are required");
      return;
    }
    setCreating(true);
    try {
      await createUniversity({
        universityName: name,
        universityCode: code.toUpperCase(),
        allowedEmailDomains: domains
          .split(",")
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean),
      });
      toast.success("University created");
      setName("");
      setCode("");
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Universities"
        description="Tenant administration — create universities, set email domains, deactivate tenants."
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
              <Label htmlFor="uni-code">Code</Label>
              <Input
                id="uni-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. KNU"
                maxLength={8}
              />
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
          <Badge variant="secondary">{universities.length}</Badge>
        </div>
        <Separator />
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email domains</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-44">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {universities.map((u) => (
                <TableRow key={u._id}>
                  <TableCell className="font-mono text-xs">{u.code}</TableCell>
                  <TableCell className="text-xs font-medium">{u.name}</TableCell>
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
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => startEdit(u)}
                      disabled={editingId === u._id}
                    >
                      <Mail className="mr-1 size-3" />
                      Edit domains
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {universities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-xs text-muted-foreground">
                    No universities yet. Use “New university” to create the first one.
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
