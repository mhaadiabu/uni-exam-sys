"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@uni-exam-sys/ui/components/card";
import { AlertCircle } from "lucide-react";

export default function EvaluateLecturersPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 text-primary" />
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight">
              Evaluate Lecturers
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Submit anonymous feedback for your lecturers and courses.
            </p>
          </div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            The evaluation form is not yet enabled. You will be able to rate teaching quality,
            course content, and engagement anonymously.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
