import type { Journey } from "../domain/types";
export const labels: Record<Journey, string> = {
  LOCKED: "Skills in progress",
  ELIGIBLE_UNBOOKED: "Ready for interview",
  BOOKED: "Interview scheduled",
  AWAITING_RESULT: "Result pending",
  PASSED: "Badge earned",
  FAILED: "Not passed",
  RETAKE_REQUIRED: "Retake available",
  CANCELLED: "Cancelled",
  NO_SHOW: "Missed interview",
  BADGE_INVALIDATED: "Badge invalidated",
};
export const tones: Record<Journey, string> = {
  LOCKED: "neutral",
  ELIGIBLE_UNBOOKED: "green",
  BOOKED: "blue",
  AWAITING_RESULT: "amber",
  PASSED: "green",
  FAILED: "red",
  RETAKE_REQUIRED: "amber",
  CANCELLED: "neutral",
  NO_SHOW: "amber",
  BADGE_INVALIDATED: "red",
};
