export type Role = "student" | "interviewer" | "team";
export type Outcome = "PASS" | "FAIL" | "RETAKE_LATER";
export interface Actor {
  role: Role;
  id: string;
}
export interface Badge {
  id: string;
  track: string;
  tier: string;
  previous?: string;
  skills: string[];
}
export interface Student {
  id: string;
  name: string;
  cohort: string;
  progress: Record<string, number>;
  restricted: boolean;
}
export interface Slot {
  id: string;
  interviewerId: string;
  start: string;
  end: string;
}
export interface Attempt {
  id: string;
  studentId: string;
  badgeId: string;
  slotId: string;
  number: number;
  status: "BOOKED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  outcome?: Outcome;
  notes?: string;
  resultAt?: string;
  createdAt: string;
  updatedAt: string;
  retryAuthorized?: boolean;
}
export interface Award {
  id: string;
  studentId: string;
  badgeId: string;
  attemptId: string;
  status: "VALID" | "INVALIDATED";
  reason?: string;
  invalidatedAt?: string;
  createdAt: string;
}
export interface Audit {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  reason?: string;
}
export interface State {
  version: 1;
  students: Student[];
  badges: Badge[];
  interviewers: { id: string; name: string; specialty: string }[];
  slots: Slot[];
  attempts: Attempt[];
  awards: Award[];
  audit: Audit[];
  scenario: string;
}
export type Journey =
  | "LOCKED"
  | "ELIGIBLE_UNBOOKED"
  | "BOOKED"
  | "AWAITING_RESULT"
  | "PASSED"
  | "FAILED"
  | "RETAKE_REQUIRED"
  | "CANCELLED"
  | "NO_SHOW"
  | "BADGE_INVALIDATED";
