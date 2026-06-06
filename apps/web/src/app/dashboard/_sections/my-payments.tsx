"use client";

import { Wallet } from "lucide-react";

import { SectionStub } from "./section-stub";

export function MyPaymentsSection({ me: _me }: { me: { role: string } }) {
  return (
    <SectionStub
      title="My Payments"
      description="Your fee and payment history — outstanding balance, paid receipts, upcoming dues."
      icon={Wallet}
      plannedFeatures={[
        "Outstanding balance with deadline",
        "Payment history with downloadable receipts",
        "Pay online (gateway integration) or upload bank slip",
        "Course reg payments separate from tuition",
        "Auto-clear exam eligibility on payment",
      ]}
    />
  );
}
