"use client";

import { Settings } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function SettingsSection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="Settings"
      description="University branding and policy — name, logo, colors, exam policies, email templates."
      icon={Settings}
      plannedFeatures={[
        "University name and code",
        "Logo upload (used on ID cards, PDFs, emails)",
        "Primary / accent colors (custom theme)",
        "Exam policies (late arrival, ID requirements, calculator rules)",
        "Email templates (welcome, payment, results)",
      ]}
    />
  );
}
