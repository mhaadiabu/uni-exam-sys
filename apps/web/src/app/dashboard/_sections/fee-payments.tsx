"use client";

import { CreditCard } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function FeePaymentsSection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="Fee Payments"
      description="Student tuition fee clearance — set fee status, view outstanding balances, process payments."
      icon={CreditCard}
      plannedFeatures={[
        "Per-student fee status (cleared / outstanding / partial)",
        "Bulk update by program / semester",
        "Record manual payment with reference number",
        "Auto-receipt generation",
        "Export to finance system (CSV / ledger)",
      ]}
    />
  );
}
