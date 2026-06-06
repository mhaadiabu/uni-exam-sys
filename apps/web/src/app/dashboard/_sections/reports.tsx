"use client";

import { FileText } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function ReportsSection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="Reports"
      description="Generate and download reports — attendance, results, finance, seating, compliance."
      icon={FileText}
      plannedFeatures={[
        "Attendance report per exam (PDF / CSV)",
        "Results report per program / semester (PDF / CSV)",
        "Finance ledger (paid / outstanding / refunds)",
        "Seating arrangements (PDF)",
        "Compliance report (audit trail, ID checks)",
      ]}
    />
  );
}
