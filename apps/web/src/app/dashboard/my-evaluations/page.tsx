"use client";

import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Button } from "@uni-exam-sys/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@uni-exam-sys/ui/components/card";
import { AlertCircle, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

export default function MyEvaluationsPage() {
  const me = useMe();
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Evaluations</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Anonymous student feedback for {me.fullName ?? "you"}.
            </p>
          </div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            The lecturer evaluation feature is not yet enabled for your university. Aggregated,
            anonymous feedback will appear here once students start submitting evaluations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="sm"
            className="h-8 text-xs"
            nativeButton={false}
            render={<Link href={"/dashboard/my-courses" as Route} />}
          >
            <MessageSquarePlus className="mr-1 size-3" /> View your courses
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
