"use client";

import { Show, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@uni-exam-sys/ui/components/button";
import { cn } from "@uni-exam-sys/ui/lib/utils";

import { ModeToggle } from "./mode-toggle";

const links = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Operations" },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const isOpsShell = isSignedIn || pathname !== "/";

  return (
    <div className={cn("min-h-svh bg-background", isOpsShell && "app-shell--ops")}>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              AcademeX
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <Show when="signed-in">
              <nav className="mr-2 hidden items-center gap-0.5 sm:flex">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "inline-flex h-8 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors",
                      pathname === link.href
                        ? "bg-muted text-foreground"
                        : "hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </Show>
            <ModeToggle />
            <Show when="signed-out">
              <SignInButton>
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button size="sm">Get started</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <GraduationCap className="size-3" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">AcademeX</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built for reliable exam-day operations.
          </p>
        </div>
      </footer>
    </div>
  );
}
