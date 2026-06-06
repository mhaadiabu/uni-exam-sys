"use client";

import { Wallet } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function InvigilatorPaymentsSection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="Invigilator Payments"
      description="Process invigilation payments — set rates, approve hours, process payroll."
      icon={Wallet}
      plannedFeatures={[
        "Per-invigilator rate configuration (per hour / per exam)",
        "Approved hours rollup (auto from finalized attendance)",
        "Generate payslips for the period",
        "Approve and mark as paid",
        "Export to payroll system",
      ]}
    />
  );
}
