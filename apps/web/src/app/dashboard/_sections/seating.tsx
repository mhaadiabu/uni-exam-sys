"use client";

import { LayoutGrid } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function SeatingSection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="Seating"
      description="Generate and manage seating arrangements — assign seats, download registers, reprint for changes."
      icon={LayoutGrid}
      plannedFeatures={[
        "Generate seating for a published schedule (auto by program)",
        "Per-room seating map with row/column visualization",
        "Download register PDF (student name, ID, seat, signature line)",
        "Manual seat swap with audit log",
        "Bulk regenerate on timetable change",
      ]}
    />
  );
}
