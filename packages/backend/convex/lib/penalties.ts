import type { Doc } from "../_generated/dataModel";

type ThresholdState = {
  warning: boolean;
  adminReview: boolean;
  disciplinary: boolean;
};

type PenaltyRecord = Pick<
  Doc<"studentPenalties">,
  "warningSent" | "adminReviewTriggered" | "disciplinaryFlag"
>;

export function getThresholdState(points: number, previous?: PenaltyRecord): ThresholdState {
  const warningReached = points >= 3;
  const adminReviewReached = points >= 5;
  const disciplinaryReached = points >= 10;

  return {
    warning: warningReached || Boolean(previous?.warningSent),
    adminReview: adminReviewReached || Boolean(previous?.adminReviewTriggered),
    disciplinary: disciplinaryReached || Boolean(previous?.disciplinaryFlag),
  };
}
