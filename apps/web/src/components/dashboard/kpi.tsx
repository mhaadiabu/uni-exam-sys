import type { ComponentType, ReactNode } from "react";

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

export function Pulse({ className }: { className?: string }) {
  return <span className={cn("inline-block h-3 animate-pulse rounded-sm bg-muted", className)} />;
}

export function KpiSkeleton({
  title,
  icon: Icon,
}: {
  title: string;
  icon: Icon;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-xs font-normal text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <Pulse className="h-7 w-16" />
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  const widths = ["w-24", "w-32", "w-20", "w-16", "w-28", "w-24", "w-20", "w-28"];
  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-4 border-b px-3 py-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Pulse key={`h-${i}`} className={cn("h-3 flex-1", widths[i % widths.length])} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b px-3 py-3 last:border-b-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Pulse
              key={`c-${r}-${c}`}
              className={cn("h-3 flex-1", widths[(r + c) % widths.length])}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2 rounded-md border bg-card p-4", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Pulse
          key={i}
          className={cn("h-3", i === 0 ? "w-2/3" : i === rows - 1 ? "w-1/2" : "w-full")}
        />
      ))}
    </div>
  );
}

export function GridSkeleton({
  count = 6,
  columns = 3,
  item,
  className,
}: {
  count?: number;
  columns?: 2 | 3 | 4;
  item?: (i: number) => ReactNode;
  className?: string;
}) {
  const colsClass = columns === 2 ? "sm:grid-cols-2" : columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={cn("grid gap-3", colsClass, className)}>
      {Array.from({ length: count }).map((_, i) =>
        item ? item(i) : <CardSkeleton key={i} />,
      )}
    </div>
  );
}
