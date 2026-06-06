"use client";

import { useClerk } from "@clerk/nextjs";
import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Doc } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { createContext, useContext } from "react";

import { Sidebar } from "./sidebar";
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

export type ActiveUniversity = {
  id: Doc<"universities">["_id"];
  name: string;
  code: string;
};

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  const me = useQuery(api.bootstrap.me);
  const clerk = useClerk();

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

  return (
    <MeContext.Provider value={{ me: meWithUniversity }}>
      <div className="mx-auto flex w-full max-w-7xl gap-4 px-4 py-6 sm:px-6">
        <Sidebar
          role={role}
          userName={me.fullName}
          userEmail={me.email ?? undefined}
        />
        <div className="min-w-0 flex-1 space-y-4">{children}</div>
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid min-h-[50vh] place-items-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto size-8 animate-spin border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium">{message}</p>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function DashboardSignIn() {
  const clerk = useClerk();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid min-h-[50vh] place-items-center">
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
    </div>
  );
}
