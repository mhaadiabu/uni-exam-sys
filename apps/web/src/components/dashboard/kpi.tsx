import type { ComponentType } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@uni-exam-sys/ui/components/card";
import { cn } from "@uni-exam-sys/ui/lib/utils";

type Icon = ComponentType<{ className?: string }>;

export function Kpi({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: Icon;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-xs font-normal text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

export function QuickMetric({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: Icon;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card p-3">
      <div>
        <p className="text-[11px] text-muted-foreground">{title}</p>
        <p className="text-sm font-semibold">{value.toLocaleString()}</p>
      </div>
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
    </div>
  );
}

export function MiniStat({
  title,
  value,
  className,
}: {
  title: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border bg-card p-3", className)}>
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-base font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

export function ReportPane({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
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
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
