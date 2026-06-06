"use client";

import { CreditCard } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function CourseRegPaymentsSection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="Course Reg Payments"
      description="Process course registration payments — clear course reg fees, mark students as eligible for exams."
      icon={CreditCard}
      plannedFeatures={[
        "Pending course registration payments queue",
        "Per-student outstanding course reg balance",
        "Mark as paid, generate receipt",
        "Auto-trigger exam eligibility on payment",
        "Refund workflow for cancelled registrations",
      ]}
    />
  );
}
