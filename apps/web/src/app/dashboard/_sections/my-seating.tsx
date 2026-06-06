"use client";

import { LayoutGrid } from "lucide-react";

import { SectionStub } from "./section-stub";

export function MySeatingSection() {
  return (
    <SectionStub
      title="My Seating"
      description="Your assigned seat for every upcoming exam, with downloadable admit cards."
      icon={LayoutGrid}
      plannedFeatures={[
        "Per-exam seat number, room, row, column",
        "Adjacent seat map (sanity check for friends)",
        "Download admit card as PDF (with photo, signature, barcode)",
        "Notification when seating is published",
        "Request relocation with reason (admin review)",
      ]}
    />
  );
}
