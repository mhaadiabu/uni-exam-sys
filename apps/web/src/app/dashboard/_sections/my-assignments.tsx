"use client";

import { CalendarClock } from "lucide-react";

import { SectionStub } from "./section-stub";

export function MyAssignmentsSection({ me: _me }: { me: { role: string } }) {
  return (
    <SectionStub
      title="My Assignments"
      description="All exams you've been assigned to invigilate — date, room, course, status."
      icon={CalendarClock}
      plannedFeatures={[
        "Today / Upcoming / History tabs",
        "Per-assignment status: pending register, in progress, finalized",
        "Quick link to Mark Attendance",
        "Notification reminders 30 minutes before",
        "Decline assignment (with reason, admin review)",
      ]}
    />
  );
}
