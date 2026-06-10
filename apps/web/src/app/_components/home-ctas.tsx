"use client";

import { useClerk } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

import { Button } from "@uni-exam-sys/ui/components/button";

export function HomeCtas() {
  const clerk = useClerk();

  return (
    <>
      <Button
        size="lg"
        className="w-full gap-2 sm:w-auto rounded-full font-semibold"
        onClick={() => clerk.openSignUp()}
      >
        Start orchestrating
        <ArrowRight className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="w-full sm:w-auto rounded-full font-semibold"
        onClick={() => clerk.openSignIn()}
      >
        Sign in to workspace
      </Button>
    </>
  );
}
