"use client";

import { School } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function SetupSection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="Setup"
      description="Foundation data — programs, courses, and rooms. Build the academic structure before scheduling exams."
      icon={School}
      plannedFeatures={[
        "Manage programs (code, name, duration in semesters)",
        "Manage courses (program, code, name, semester, credit hours)",
        "Manage rooms (code, name, capacity, location, type)",
        "Bulk import from CSV",
        "Archive vs delete (archive preserves history)",
      ]}
    />
  );
}
