"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

import { Button } from "@uni-exam-sys/ui/components/button";
import { Separator } from "@uni-exam-sys/ui/components/separator";

export function SectionStub({
  title,
  description,
  icon: Icon = Construction,
  plannedFeatures,
  onBackToHome,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  plannedFeatures?: string[];
  onBackToHome?: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-md bg-amber-500/10 text-amber-600">
            <Icon className="size-6" />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif text-2xl font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="max-w-2xl text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>

        <Separator className="my-5" />

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            This section is being built
          </p>
          <p className="max-w-2xl text-sm text-muted-foreground">
            We&apos;re reworking the dashboard to give each role a focused, dedicated
            workspace. This page is reserved for the following features and will go live
            in a follow-up.
          </p>
          {plannedFeatures && plannedFeatures.length > 0 ? (
            <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
              {plannedFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-6 flex gap-2">
          {onBackToHome ? (
            <Button onClick={onBackToHome}>Back to Home</Button>
          ) : null}
          <Button variant="outline" render={<Link href="/" />}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
