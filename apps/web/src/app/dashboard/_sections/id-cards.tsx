"use client";

import { IdCard } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function IdCardsSection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="ID Cards"
      description="Generate digital ID cards for students — print-ready PDFs with photo, signature, and barcode."
      icon={IdCard}
      plannedFeatures={[
        "Bulk generate ID cards for a program / semester",
        "Customize card template (logo, university name, fields)",
        "Print-ready PDF layout (front + back)",
        "Reprint request workflow (student → admin approval)",
        "QR / barcode encodes student ID for verification",
      ]}
    />
  );
}
