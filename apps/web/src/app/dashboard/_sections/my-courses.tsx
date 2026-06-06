"use client";

import { BookOpen } from "lucide-react";

import { SectionStub } from "./section-stub";

export function MyCoursesSection() {
  return (
    <SectionStub
      title="My Courses"
      description="Courses assigned to you this semester — exam schedules, enrolled students, grading workspace."
      icon={BookOpen}
      plannedFeatures={[
        "List of courses you instruct with semester / program",
        "Per-course student roster and section breakdown",
        "Quick link to exam schedule and room",
        "Pending grade submission status per course",
        "Bulk actions: email all students, export roster",
      ]}
    />
  );
}
