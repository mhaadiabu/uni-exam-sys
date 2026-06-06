"use client";

import { Search } from "lucide-react";

import { SectionStub } from "./section-stub";

export function VerifyStudentsSection({ me: _me }: { me: { role: string } }) {
  return (
    <SectionStub
      title="Verify Students"
      description="ID checks at the exam hall — search students, log verifications, apply penalties."
      icon={Search}
      plannedFeatures={[
        "Search by name, student ID, or index number",
        "Pull up student photo and details from platform",
        "Log verification (reason, photo evidence)",
        "Apply penalty points (configurable per university)",
        "View your verification history",
      ]}
    />
  );
}
