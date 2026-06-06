"use client";

import { MessageSquare } from "lucide-react";

import { SectionStub } from "./section-stub";

export function LecturerEvalsSection() {
  return (
    <SectionStub
      title="Lecturer Evaluations"
      description="Aggregated student feedback across all courses and semesters."
      icon={MessageSquare}
      plannedFeatures={[
        "Course-level ratings (teaching, clarity, fairness, materials)",
        "Semester / year / program filters",
        "Compare lecturers and flag outliers",
        "Drill into anonymized comment threads (admin-only)",
        "Export aggregated CSV / PDF for HR",
      ]}
    />
  );
}
