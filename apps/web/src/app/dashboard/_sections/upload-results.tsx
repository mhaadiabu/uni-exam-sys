"use client";

import { FileCheck } from "lucide-react";

import { SectionStub } from "./section-stub";

export function UploadResultsSection({ me: _me }: { me: { role: string } }) {
  return (
    <SectionStub
      title="Upload Results"
      description="Upload scores for your courses — bulk paste, per-student entry, or CSV import."
      icon={FileCheck}
      plannedFeatures={[
        "Pick from your assigned courses",
        "Per-student score entry with auto-grade calculation",
        "Bulk paste from spreadsheet (copy/paste)",
        "CSV import with validation",
        "Save as draft, submit to admin for approval",
      ]}
    />
  );
}
