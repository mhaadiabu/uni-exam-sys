"use client";

import { BookOpen } from "lucide-react";

import { SectionStub } from "./section-stub";

export function RegisterCoursesSection() {
  return (
    <SectionStub
      title="Register Courses"
      description="Course registration for the upcoming semester — pick courses, pay fees, get exam eligibility."
      icon={BookOpen}
      plannedFeatures={[
        "Browse courses by program / semester / elective bucket",
        "Check credit-hour load vs allowed maximum",
        "Prerequisite validation before adding",
        "Mock schedule preview (avoid exam clashes)",
        "Submit registration → triggers finance clearance workflow",
      ]}
    />
  );
}
