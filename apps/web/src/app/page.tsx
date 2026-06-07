"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { ArrowRight, BookOpen, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@uni-exam-sys/ui/components/button";

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto w-full max-w-3xl text-center">
        <div className="mx-auto mb-8 flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:size-16">
          <GraduationCap className="size-6 sm:size-8" />
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          AcademeX
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          The ultimate engine for university examinations. Scheduling, seating, attendance, and verification—orchestrated with absolute precision.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <SignUpButton>
            <Button size="lg" className="w-full gap-2 sm:w-auto rounded-full font-semibold">
              Start orchestrating
              <ArrowRight className="size-4" />
            </Button>
          </SignUpButton>
          <SignInButton>
            <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full font-semibold">
              Sign in to workspace
            </Button>
          </SignInButton>
        </div>

        <p className="mt-16 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground/80">
          <BookOpen className="size-3.5" />
          Reliability at scale
        </p>
      </div>
    </section>
  );
}
