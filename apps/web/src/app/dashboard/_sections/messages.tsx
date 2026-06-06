"use client";

import { Megaphone } from "lucide-react";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { SectionStub } from "./section-stub";

export function MessagesSection({
  me: _me,
  selectedUniversityId: _selectedUniversityId,
}: {
  me: { role: string; universityId?: Id<"universities"> };
  selectedUniversityId: Id<"universities"> | "";
}) {
  return (
    <SectionStub
      title="Messages"
      description="Broadcasts and direct messages — reach all students, lecturers, or individuals."
      icon={Megaphone}
      plannedFeatures={[
        "Compose broadcast (title, body, audience filter)",
        "Schedule messages for future delivery",
        "Direct messages (DMs) to individuals",
        "Read receipts and delivery status",
        "Auto-reminder for upcoming exams and fee deadlines",
      ]}
    />
  );
}
