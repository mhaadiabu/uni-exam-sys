"use client";

import { ClipboardCheck } from "lucide-react";

import { SectionStub } from "./section-stub";

export function MarkAttendanceSection({ me: _me }: { me: { role: string } }) {
  return (
    <SectionStub
      title="Mark Attendance"
      description="Your invigilation attendance work — pick an assignment, mark students, finalize register."
      icon={ClipboardCheck}
      plannedFeatures={[
        "Pick from your assigned exams (today + upcoming)",
        "Mark each student as present / absent / late / excused",
        "Capture typed signature before finalizing",
        "Live counters: present, absent, late, excused",
        "Finalize and submit to admin review",
      ]}
    />
  );
}
