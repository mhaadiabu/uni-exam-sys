"use client";

import type { ComponentType } from "react";

export function Kpi({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-md border bg-background/60 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1 text-lg font-semibold leading-none">{value.toLocaleString()}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

export function QuickMetric({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background/60 p-3 shadow-sm">
      <div>
        <p className="text-[11px] text-muted-foreground">{title}</p>
        <p className="text-sm font-semibold">{value.toLocaleString()}</p>
      </div>
      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </div>
    </div>
  );
}

export function MiniStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-md border bg-background/60 p-3 shadow-sm">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-base font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

export function ReportPane({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/60 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground">{value}</p>
    </div>
  );
}
