"use client";

import { FileCheck } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function ResultsSection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="Results"
      description="Finalize and publish exam results — review, approve, release to students."
      icon={FileCheck}
      plannedFeatures={[
        "Per-course results pending approval",
        "Drill into score distribution and outliers",
        "Approve / reject submitted results with note",
        "Bulk publish by program / semester",
        "Generate transcripts (per-student, signed PDF)",
      ]}
    />
  );
}
