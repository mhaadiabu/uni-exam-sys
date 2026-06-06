"use client";

import { Wallet } from "lucide-react";

import { SectionStub } from "./section-stub";

export function MyPaymentsInvSection({ me: _me }: { me: { role: string } }) {
  return (
    <SectionStub
      title="My Payments"
      description="Your invigilation pay — rate, hours worked this period, approved and pending payments."
      icon={Wallet}
      plannedFeatures={[
        "Your hourly / per-exam rate",
        "Hours worked this period (auto from finalized attendance)",
        "Pending vs approved vs paid status",
        "Download payslip PDF",
        "Tax and deduction summary",
      ]}
    />
  );
}
