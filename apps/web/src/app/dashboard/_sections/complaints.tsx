"use client";

import { MessageSquare } from "lucide-react";

import { SectionStub } from "./section-stub";

export function ComplaintsSection({ me: _me }: { me: { role: string } }) {
  return (
    <SectionStub
      title="Complaints"
      description="Submit and track complaints — wrong seat, payment issue, schedule conflict, and more."
      icon={MessageSquare}
      plannedFeatures={[
        "Submit new complaint with category and description",
        "Track status: open, in review, resolved, rejected",
        "Reply thread with admin (in-app)",
        "Auto-routing based on category (seating → admin, payment → finance)",
        "Attach evidence (photo / PDF)",
      ]}
    />
  );
}
