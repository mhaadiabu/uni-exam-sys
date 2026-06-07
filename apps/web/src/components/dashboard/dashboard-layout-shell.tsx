"use client";

import { useClerk } from "@clerk/nextjs";
import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Doc } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { createContext, useContext, useState } from "react";

import { Button } from "@uni-exam-sys/ui/components/button";
import {
  Dialog,
  DialogContent,
} from "@uni-exam-sys/ui/components/dialog";
import { cn } from "@uni-exam-sys/ui/lib/utils";

import { ModeToggle } from "@/components/mode-toggle";
import { UserAvatar } from "@/components/user-avatar";

import { SidebarNav } from "./sidebar";
import type { AppRole } from "./sections";

type MeUser = Doc<"users"> & { university?: Doc<"universities"> | null };

type MeContextValue = {
  me: MeUser;
};

const MeContext = createContext<MeContextValue | null>(null);

export function useMe(): MeUser {
  const ctx = useContext(MeContext);
  if (!ctx) {
    throw new Error("useMe must be used inside <DashboardLayout>");
  }
  return ctx.me;
}

export function useMeOptional(): MeUser | null {
  return useContext(MeContext)?.me ?? null;
}

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  const me = useQuery(api.bootstrap.me);
  const clerk = useClerk();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (me === undefined) {
    return <DashboardLoading message="Preparing your workspace" />;
  }

  if (me === null) {
    return (
      <DashboardLoading
        message="Linking your account"
        description="Verifying your identity with the platform. This usually takes a moment."
      />
    );
  }

  const role = me.role as AppRole;
  const meWithUniversity: MeUser = me;

  const sidebarWidth = collapsed ? "4rem" : "16rem";

  return (
    <MeContext.Provider value={{ me: meWithUniversity }}>
      <div className="flex min-h-svh">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden h-svh shrink-0 flex-col border-r bg-sidebar transition-all duration-200 ease-in-out lg:flex",
          )}
          style={{ width: sidebarWidth }}
        >
          <SidebarNav
            role={role}
            userName={me.fullName}
            userEmail={me.email ?? undefined}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
            modeToggle={<ModeToggle />}
            avatar={<UserAvatar name={me.fullName} className="size-8" />}
            onSignOut={() => void clerk.signOut()}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile header */}
          <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </Button>
            <span className="text-sm font-semibold tracking-tight">AcademeX</span>
            <div className="ml-auto flex items-center gap-1">
              <ModeToggle />
              <UserAvatar name={me.fullName} className="size-8" />
            </div>
          </div>

          {/* Content */}
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>

        {/* Mobile sidebar overlay */}
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogContent
            className="left-0 top-0 h-svh w-64 -translate-x-0 -translate-y-0 rounded-none border-r p-0"
            showCloseButton={false}
          >
            <aside className="flex h-full w-full flex-col bg-sidebar">
              <SidebarNav
                role={role}
                userName={me.fullName}
                userEmail={me.email ?? undefined}
                collapsed={false}
                onToggleCollapse={() => setMobileOpen(false)}
                onNavClick={() => setMobileOpen(false)}
                modeToggle={<ModeToggle />}
                avatar={<UserAvatar name={me.fullName} className="size-8" />}
                onSignOut={() => {
                  setMobileOpen(false);
                  void clerk.signOut();
                }}
                mobile
              />
            </aside>
          </DialogContent>
        </Dialog>
      </div>
    </MeContext.Provider>
  );
}

function DashboardLoading({
  message,
  description,
}: {
  message: string;
  description?: string;
}) {
  return (
    <div className="grid min-h-svh place-items-center px-4 py-6 sm:px-6">
      <div className="space-y-3 text-center">
        <div className="mx-auto size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm font-medium">{message}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardSignIn() {
  const clerk = useClerk();
  return (
    <div className="grid min-h-svh place-items-center px-4 py-6 sm:px-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-sm font-medium">Please sign in to continue.</p>
        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => void clerk.signOut()}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
