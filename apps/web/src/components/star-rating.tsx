"use client";

import { Star } from "lucide-react";
import { cn } from "@uni-exam-sys/ui/lib/utils";

/**
 * Render a 5-star rating control that can be interactive or read-only.
 *
 * @param value - Current rating value (1–5) used to determine which stars are filled
 * @param onChange - Optional callback invoked with the selected star index (1–5) when a star is clicked
 * @param readOnly - When true, disables interaction and exposes the container as an image for assistive tech
 * @param size - Pixel size passed to each star icon
 * @param ariaLabel - Optional accessible label applied to the container
 * @returns The rendered star-rating React element
 */
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
