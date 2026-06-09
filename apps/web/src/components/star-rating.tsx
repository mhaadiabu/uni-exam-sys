"use client";

import { Star } from "lucide-react";
import { cn } from "@uni-exam-sys/ui/lib/utils";

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 18,
  ariaLabel,
}: {
  value: number;
  onChange?: (next: number) => void;
  readOnly?: boolean;
  size?: number;
  ariaLabel?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5",
        readOnly ? "" : "cursor-pointer",
      )}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={ariaLabel}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            className={cn(
              "transition-colors",
              readOnly ? "cursor-default" : "hover:scale-110",
              "rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            )}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            aria-pressed={!readOnly ? filled : undefined}
          >
            <Star
              size={size}
              className={cn(
                "transition-colors",
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
