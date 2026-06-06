"use client";

import { Shield } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function SecuritySection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="Security"
      description="Tenant security settings — 2FA enforcement, session policies, suspicious activity."
      icon={Shield}
      plannedFeatures={[
        "Require 2FA for all users (or just admins)",
        "Session timeout policy (minutes of inactivity)",
        "IP allowlist for admin sign-in",
        "Recent suspicious activity (impossible travel, mass failures)",
        "Force sign-out of all sessions",
      ]}
    />
  );
}
