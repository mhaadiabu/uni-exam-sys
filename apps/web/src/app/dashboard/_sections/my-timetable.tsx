"use client";

import { CalendarClock } from "lucide-react";

import { SectionStub } from "./section-stub";

export function MyTimetableSection() {
  return (
    <SectionStub
      title="My Timetable"
      description="Your personal exam timetable — date, time, course, room for every upcoming exam."
      icon={CalendarClock}
      plannedFeatures={[
        "Chronological list of all upcoming exams",
        "Calendar view (week / month) with one-click export to .ics",
        "Push / email reminder 24h and 1h before each exam",
        "Conflict detection (two exams same day)",
        "Quick link to seating, results, and complaints",
      ]}
    />
  );
}
