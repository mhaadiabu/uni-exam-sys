"use client";

import { ClipboardCheck } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function AttendanceSection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="Attendance"
      description="Review finalized attendance registers — present, absent, late, excused counts per exam."
      icon={ClipboardCheck}
      plannedFeatures={[
        "Per-exam attendance summary (present / absent / late / excused)",
        "Drill into the register with student signatures",
        "Compare against expected roster to find no-shows",
        "Export finalized register as PDF for records",
        "Mark late arrivals and excused absences with reason",
      ]}
    />
  );
}
