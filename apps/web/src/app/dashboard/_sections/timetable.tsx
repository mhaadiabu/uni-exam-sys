"use client";

import { CalendarClock } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function TimetableSection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="Timetable"
      description="Exam scheduling — assign courses to dates, times, rooms, and invigilators."
      icon={CalendarClock}
      plannedFeatures={[
        "Schedule grid: courses × dates with room and time slots",
        "Conflict detection (room double-booked, invigilator overlap)",
        "Bulk schedule by program / semester",
        "Publish / unpublish schedule (controls what students see)",
        "Export to PDF / ICS for distribution",
      ]}
    />
  );
}
