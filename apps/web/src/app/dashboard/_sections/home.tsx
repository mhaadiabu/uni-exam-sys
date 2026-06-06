"use client";

import { Home } from "lucide-react";

import { SectionStub } from "./section-stub";

export function HomeSection() {
  return (
    <SectionStub
      title="Home"
      description="Your dashboard overview — KPIs, notifications, and quick actions tailored to your role."
      icon={Home}
      plannedFeatures={[
        "Role-tailored KPIs (universities, students, exams, payments, etc.)",
        "Active university selector (super admin only)",
        "Recent notifications inbox",
        "Quick-action shortcuts per role",
        "Live metric snapshots with sparkline trends",
      ]}
    />
  );
}
