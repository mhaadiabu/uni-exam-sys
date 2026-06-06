"use client";

import { MessageSquare } from "lucide-react";

import { SectionStub } from "./section-stub";

export function EvaluateLecturersSection() {
  return (
    <SectionStub
      title="Evaluate Lecturers"
      description="Anonymous end-of-semester feedback for your course instructors."
      icon={MessageSquare}
      plannedFeatures={[
        "Per-course evaluation form (teaching, materials, fairness)",
        "Anonymous by default — instructor cannot trace back",
        "Configurable rubric per university admin",
        "Auto-close when semester ends; results released to admin only",
        "View your past submissions and statuses",
      ]}
    />
  );
}
