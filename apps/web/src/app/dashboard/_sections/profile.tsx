"use client";

import { LogOut, User } from "lucide-react";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { Separator } from "@uni-exam-sys/ui/components/separator";

import { formatDateTime, roleLabel } from "@/lib/utils";

import type { Doc } from "@uni-exam-sys/backend/convex/_generated/dataModel";

export function ProfileSection({
  me,
  onSignOut,
}: {
  me: Doc<"users"> & { university?: Doc<"universities"> | null };
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-xs text-muted-foreground">
          Your account information and access details.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-md border bg-card p-4 shadow-sm">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="grid size-20 place-items-center rounded-full bg-primary/10 text-primary">
              <User className="size-9" />
            </div>
            <div className="space-y-0.5 text-center">
              <p className="text-base font-medium">{me.fullName}</p>
              <p className="text-xs text-muted-foreground">{me.email}</p>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
              {roleLabel(me.role)}
            </Badge>
            {me.university ? (
              <Badge className="text-[10px]">{me.university.name}</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Cross-university</Badge>
            )}
          </div>
          <Separator className="my-3" />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void onSignOut()}
          >
            <LogOut className="mr-2 size-3.5" />
            Sign out
          </Button>
        </div>

        <div className="rounded-md border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Account details</h2>
          <Separator className="mb-3" />
          <dl className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Full name</dt>
              <dd className="font-medium">{me.fullName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{me.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium">{roleLabel(me.role)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">University</dt>
              <dd className="font-medium">
                {me.university?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Clerk ID</dt>
              <dd className="font-mono text-[11px] text-muted-foreground">
                {me.externalId}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last updated</dt>
              <dd className="font-medium">{formatDateTime(me.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Joined</dt>
              <dd className="font-medium">{formatDateTime(me.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                {me.isActive ? (
                  <Badge variant="default" className="text-[10px]">Active</Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
