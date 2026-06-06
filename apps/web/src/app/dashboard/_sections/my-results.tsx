"use client";

import { FileCheck } from "lucide-react";

import { SectionStub } from "./section-stub";

export function MyResultsSection() {
  return (
    <SectionStub
      title="My Results"
      description="Your grades, GPA, and official transcripts across all semesters."
      icon={FileCheck}
      plannedFeatures={[
        "Per-course grades with letter grade and GPA points",
        "Semester GPA and cumulative CGPA",
        "Grade-change history (audit trail)",
        "Download transcript as PDF (signed, with verification code)",
        "Request re-mark or grade review",
      ]}
    />
  );
}
