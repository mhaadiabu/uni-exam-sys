"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@uni-exam-sys/ui/components/card";
import { AlertCircle } from "lucide-react";

export default function LecturerEvalsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 text-primary" />
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight">
              Lecturer Evaluations
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Aggregated anonymous feedback from students.
            </p>
          </div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Once students submit evaluations, this page will surface aggregated scores,
            per-course trends, and free-text comments. Backend support is pending.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
