"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { Button } from "@uni-exam-sys/ui/components/button";

import { ModeToggle } from "./mode-toggle";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const isDashboard = pathname?.startsWith("/dashboard") ?? false;

  if (!isLoaded) {
    return <div className="min-h-svh bg-background">{children}</div>;
  }

  return (
    <div className="min-h-svh bg-background">
      {!isDashboard ? (
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GraduationCap className="size-4" />
              </div>
              <span className="text-sm font-semibold tracking-tight">AcademeX</span>
            </Link>

            <div className="flex items-center gap-1">
              <ModeToggle />
              {isSignedIn ? (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href={"/dashboard" as Route} />}
                >
                  Open dashboard
                </Button>
              ) : (
                <>
                  <SignInButton>
                    <Button variant="ghost" size="sm">
                      Sign in
                    </Button>
                  </SignInButton>
                  <SignUpButton>
                    <Button size="sm">Get started</Button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        </header>
      ) : null}

      {children}
    </div>
  );
}
