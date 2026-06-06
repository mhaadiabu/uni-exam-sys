import type { ComponentType } from "react";

import { cn } from "@uni-exam-sys/ui/lib/utils";

type Icon = ComponentType<{ className?: string }>;

export function Kpi({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: number;
  icon: Icon;
  hint?: string;
}) {
  return (
    <div className="rounded-md border bg-background/60 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1 text-lg font-semibold leading-none">{value.toLocaleString()}</p>
          {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

export function QuickMetric({ title, value, icon: Icon }: { title: string; value: number; icon: Icon }) {
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

export function MiniStat({ title, value, className }: { title: string; value: number; className?: string }) {
  return (
    <div className={cn("rounded-md border bg-background/60 p-3 shadow-sm", className)}>
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-base font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

export function ReportPane({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/60 p-4 shadow-sm">
      <p className="text-xs font-medium">{title}</p>
      <p className="mt-1 line-clamp-4 text-[11px] text-muted-foreground">{value}</p>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
