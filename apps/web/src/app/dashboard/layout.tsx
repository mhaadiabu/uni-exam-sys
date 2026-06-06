"use client";

import { Authenticated, AuthLoading, Unauthenticated, useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";

import {
  DashboardLayoutShell,
  DashboardSignIn,
} from "@/components/dashboard/dashboard-layout-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthLoading>
        <DashboardSignIn />
      </AuthLoading>
      <Unauthenticated>
        <DashboardSignIn />
      </Unauthenticated>
      <Authenticated>
        <AuthBootstrap>
          <DashboardLayoutShell>{children}</DashboardLayoutShell>
        </AuthBootstrap>
      </Authenticated>
    </>
  );
}

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const syncCurrentUser = useMutation(api.bootstrap.syncCurrentUser);
  const attemptedRef = useRef(false);
  const failedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (attemptedRef.current) return;
    if (failedRef.current) return;
    attemptedRef.current = true;
    syncCurrentUser({})
      .catch((error: unknown) => {
        attemptedRef.current = false;
        failedRef.current = true;
        const message =
          error instanceof Error ? error.message : "Failed to link your account";
        toast.error(message);
      });
  }, [isAuthenticated, syncCurrentUser]);

  return <>{children}</>;
}
