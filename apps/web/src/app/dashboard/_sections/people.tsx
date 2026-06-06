"use client";

import { Users } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function PeopleSection({ me: _me }: { me: { role: string; universityId?: Id<"universities"> } }) {
  return (
    <SectionStub
      title="People"
      description="Manage users — students, lecturers, invigilators, finance officers, university admins."
      icon={Users}
      plannedFeatures={[
        "Tabbed view by role (Students / Lecturers / Invigilators / Finance / Admins)",
        "Search Clerk user pool and link to platform account",
        "Create new user with role and university assignment",
        "Edit user details, change role, deactivate account",
        "Bulk import from CSV with email-domain validation",
      ]}
    />
  );
}
