"use client";

import { Shield } from "lucide-react";

import { SectionStub } from "./section-stub";

export function AuditSection() {
  return (
    <SectionStub
      title="Audit Log"
      description="System-wide activity and security audit trail across all tenants."
      icon={Shield}
      plannedFeatures={[
        "Cross-tenant event log (sign-ins, role changes, deletions)",
        "Filter by user, role, university, action type, and date range",
        "Export to CSV / PDF for compliance reviews",
        "Anomaly detection: impossible travel, mass role flips, etc.",
        "Webhook to external SIEM (Datadog, Splunk, Elastic)",
      ]}
    />
  );
}
