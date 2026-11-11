import type { Journey } from "./types";
export const date = (v: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(v));
export const time = (v: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(v));
export function message(
  status: Journey,
  track: string,
  tier: string,
  start?: string,
): string {
  switch (status) {
    case "ELIGIBLE_UNBOOKED":
      return "You're ready for your Track Badge interview! You've cleared all required skills. Book your interview to take the final step toward earning your badge.";
    case "BOOKED":
      return `Your interview is booked for ${date(start!)} at ${time(start!)} IST. You can view the details or reschedule from your dashboard.`;
    case "PASSED":
      return `Congratulations! You've passed your interview and earned the ${track} — ${tier} Track Badge.`;
    case "LOCKED":
      return "Keep building your skills. Clear every required Skill Level and earn the previous badge to unlock this interview.";
    case "AWAITING_RESULT":
      return "Your interview is complete. The interview team is reviewing your result. Check back here for an update.";
    case "FAILED":
      return "You did not pass this attempt. Your progress is saved. Contact the interview team to discuss next steps; another attempt needs their approval.";
    case "RETAKE_REQUIRED":
      return "Another attempt is available. Take time to prepare, then book a new interview when you feel ready.";
    case "BADGE_INVALIDATED":
      return "This Track Badge has been invalidated following a confirmed malpractice finding. Your interview history is preserved. Contact the interview team if you believe this is an error.";
    case "CANCELLED":
      return "Your interview was cancelled and the slot released. You can book a new time when you are ready.";
    case "NO_SHOW":
      return "The team marked this interview as missed. Contact them to request authorization for another attempt.";
  }
}
