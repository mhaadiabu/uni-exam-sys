"use client";

import { Building2 } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function UniversitiesSection({
  me,
  selectedUniversityId: _selectedUniversityId,
  setSelectedUniversityId: _setSelectedUniversityId,
}: {
  me: {
    role: string;
    university?: { _id: Id<"universities">; name: string; code: string } | null;
  };
  selectedUniversityId: Id<"universities"> | "";
  setSelectedUniversityId: (v: Id<"universities"> | "") => void;
}) {
  return (
    <SectionStub
      title="Universities"
      description="Tenant administration — create universities, set email domains, deactivate tenants."
      icon={Building2}
      plannedFeatures={[
        "List of all universities with code, status, and student count",
        "Create new university (code, name, email domains)",
        "Edit allowed email domains (controls auto-assignment)",
        "Deactivate / reactivate tenant (preserves data)",
        "Audit log scoped to this university",
      ]}
    />
  );
}
