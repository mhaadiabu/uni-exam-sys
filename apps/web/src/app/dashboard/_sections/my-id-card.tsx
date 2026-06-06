"use client";

import { IdCard } from "lucide-react";

import { SectionStub } from "./section-stub";

export function MyIdCardSection({ me: _me }: { me: { role: string } }) {
  return (
    <SectionStub
      title="My ID Card"
      description="Your digital student ID — view, download, and request a reprint if damaged."
      icon={IdCard}
      plannedFeatures={[
        "Front and back view of your digital ID card",
        "Download as PDF or save to wallet (Apple / Google)",
        "Status indicator: generated, reprint requested, dispatched",
        "Request reprint with reason and supporting photo",
        "QR / barcode for exam-hall scanning",
      ]}
    />
  );
}
