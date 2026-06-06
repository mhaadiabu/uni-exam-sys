"use client";

import { MessageSquare } from "lucide-react";

import { SectionStub } from "./section-stub";

export function MyEvaluationsSection() {
  return (
    <SectionStub
      title="My Evaluations"
      description="Anonymous student feedback submitted for your courses."
      icon={MessageSquare}
      plannedFeatures={[
        "Per-course rating summary (overall, teaching, materials)",
        "Read anonymized comment highlights",
        "Compare against your department average",
        "Download your evaluation history as PDF",
        "Acknowledge feedback (visible to admin only)",
      ]}
    />
  );
}
