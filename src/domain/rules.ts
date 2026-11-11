import type { Actor, Attempt, Journey, Outcome, Slot, State } from "./types";
function guard(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export const overlaps = (a: Slot, b: Slot) =>
  a.start < b.end && b.start < a.end;
export const active = (a: Attempt) =>
  a.status === "BOOKED" || (a.status === "COMPLETED" && !a.outcome);
export const history = (s: State, studentId: string, badgeId: string) =>
  s.attempts
    .filter((a) => a.studentId === studentId && a.badgeId === badgeId)
    .sort((a, b) => b.number - a.number);
export function eligible(
  s: State,
  studentId: string,
  badgeId: string,
): boolean {
  const student = s.students.find((x) => x.id === studentId),
    badge = s.badges.find((x) => x.id === badgeId);
  return (
    !!student &&
    !!badge &&
    !student.restricted &&
    student.progress[badgeId] >= badge.skills.length &&
    (!badge.previous ||
      s.awards.some(
        (a) =>
          a.studentId === studentId &&
          a.badgeId === badge.previous &&
          a.status === "VALID",
      ))
  );
}
export function journey(s: State, studentId: string, badgeId: string): Journey {
  const award = s.awards.find(
    (a) => a.studentId === studentId && a.badgeId === badgeId,
  );
  if (award) return award.status === "VALID" ? "PASSED" : "BADGE_INVALIDATED";
  const a = history(s, studentId, badgeId)[0];
  if (a && active(a))
    return a.status === "BOOKED" ? "BOOKED" : "AWAITING_RESULT";
  if (!eligible(s, studentId, badgeId)) return "LOCKED";
  if (!a) return "ELIGIBLE_UNBOOKED";
  if (a.retryAuthorized || a.outcome === "RETAKE_LATER")
    return "RETAKE_REQUIRED";
  if (a.outcome === "FAIL") return "FAILED";
  return a.status === "CANCELLED"
    ? "CANCELLED"
    : a.status === "NO_SHOW"
      ? "NO_SHOW"
      : "ELIGIBLE_UNBOOKED";
}
function audit(
  s: State,
  actor: Actor,
  action: string,
  target: string,
  reason?: string,
) {
  s.audit.unshift({
    id: crypto.randomUUID(),
    actor: `${actor.role}:${actor.id}`,
    action,
    target,
    reason,
    at: new Date().toISOString(),
  });
  s.scenario = "Custom workflow";
}
function owner(actor: Actor, studentId: string) {
  guard(
    actor.role === "team" ||
      (actor.role === "student" && actor.id === studentId),
    "Only the student or interview team can change this reservation.",
  );
}
function examiner(s: State, actor: Actor, a: Attempt) {
  guard(
    actor.role === "team" ||
      (actor.role === "interviewer" &&
        s.slots.find((x) => x.id === a.slotId)?.interviewerId === actor.id),
    "Only the assigned interviewer or team can record this action.",
  );
}
export function book(
  s: State,
  actor: Actor,
  studentId: string,
  badgeId: string,
  slotId: string,
  previousId?: string,
  now = Date.now(),
): State {
  owner(actor, studentId);
  const n = structuredClone(s);
  const slot = n.slots.find((x) => x.id === slotId);
  guard(slot, "This slot no longer exists. Choose another time.");
  guard(
    eligible(n, studentId, badgeId),
    "Complete all required skills and the previous badge before booking. Integrity restrictions must be resolved.",
  );
  guard(
    !n.awards.some((a) => a.studentId === studentId && a.badgeId === badgeId),
    "This badge already has an award. Contact the team for review.",
  );
  guard(
    Date.parse(slot.start) > now,
    "This time has passed. Choose a future slot.",
  );
  const previous = previousId
    ? n.attempts.find((a) => a.id === previousId)
    : undefined;
  if (previousId) {
    guard(
      previous &&
        previous.studentId === studentId &&
        previous.badgeId === badgeId &&
        previous.status === "BOOKED",
      "Only an active booking can be rescheduled.",
    );
    guard(
      Date.parse(n.slots.find((x) => x.id === previous.slotId)!.start) > now,
      "This interview has already started. Contact the team.",
    );
    guard(previous.slotId !== slotId, "Choose a different slot to reschedule.");
  }
  guard(
    !n.attempts.some(
      (a) =>
        a.id !== previousId &&
        a.studentId === studentId &&
        a.badgeId === badgeId &&
        active(a),
    ),
    "You already have an active interview for this badge.",
  );
  const latest = history(n, studentId, badgeId)[0];
  guard(
    !latest ||
      latest.id === previousId ||
      latest.status === "CANCELLED" ||
      latest.outcome === "RETAKE_LATER" ||
      latest.retryAuthorized,
    "A new attempt needs interview team authorization.",
  );
  for (const a of n.attempts.filter(
    (a) => a.id !== previousId && a.status === "BOOKED",
  )) {
    const other = n.slots.find((x) => x.id === a.slotId)!;
    guard(
      !(
        overlaps(slot, other) &&
        (other.interviewerId === slot.interviewerId ||
          a.studentId === studentId)
      ),
      "That slot conflicts with an existing reservation. Choose another time.",
    );
  }
  if (previous) {
    previous.status = "CANCELLED";
    previous.updatedAt = new Date(now).toISOString();
  }
  const at = new Date(now).toISOString();
  const attempt: Attempt = {
    id: crypto.randomUUID(),
    studentId,
    badgeId,
    slotId,
    number: (latest?.number || 0) + 1,
    status: "BOOKED",
    createdAt: at,
    updatedAt: at,
  };
  n.attempts.push(attempt);
  audit(n, actor, previous ? "RESCHEDULE" : "BOOK", attempt.id);
  return n;
}
export function cancel(
  s: State,
  actor: Actor,
  id: string,
  now = Date.now(),
): State {
  const n = structuredClone(s),
    a = n.attempts.find((x) => x.id === id);
  guard(a, "Interview not found.");
  owner(actor, a.studentId);
  guard(a.status === "BOOKED", "Only scheduled interviews can be cancelled.");
  guard(
    actor.role === "team" ||
      Date.parse(n.slots.find((x) => x.id === a.slotId)!.start) > now,
    "This interview has started. Contact the team.",
  );
  a.status = "CANCELLED";
  a.updatedAt = new Date(now).toISOString();
  audit(n, actor, "CANCEL", id);
  return n;
}
export function complete(
  s: State,
  actor: Actor,
  id: string,
  simulate = false,
  now = Date.now(),
): State {
  const n = structuredClone(s),
    a = n.attempts.find((x) => x.id === id);
  guard(a, "Interview not found.");
  examiner(n, actor, a);
  guard(a.status === "BOOKED", "Only a booked interview can be completed.");
  guard(
    simulate || Date.parse(n.slots.find((x) => x.id === a.slotId)!.end) <= now,
    "The interview has not ended. Use the explicit demo completion control.",
  );
  a.status = "COMPLETED";
  a.updatedAt = new Date(now).toISOString();
  audit(n, actor, simulate ? "DEMO_SIMULATE_COMPLETION" : "COMPLETE", id);
  return n;
}
export function record(
  s: State,
  actor: Actor,
  id: string,
  outcome: Outcome,
  notes: string,
): State {
  const n = structuredClone(s),
    a = n.attempts.find((x) => x.id === id);
  guard(a, "Interview not found.");
  examiner(n, actor, a);
  guard(
    ["PASS", "FAIL", "RETAKE_LATER"].includes(outcome),
    "Choose a valid outcome.",
  );
  guard(
    a.status === "COMPLETED" && !a.outcome,
    "Complete the interview before recording a result. A saved result cannot be overwritten.",
  );
  guard(
    eligible(n, a.studentId, a.badgeId),
    "Eligibility changed. Team must resolve the exception before recording a result.",
  );
  a.outcome = outcome;
  a.notes = notes;
  a.resultAt = new Date().toISOString();
  a.updatedAt = a.resultAt;
  if (outcome === "PASS")
    n.awards.push({
      id: crypto.randomUUID(),
      studentId: a.studentId,
      badgeId: a.badgeId,
      attemptId: a.id,
      status: "VALID",
      createdAt: a.resultAt,
    });
  audit(n, actor, `RESULT_${outcome}`, id);
  return n;
}
export function teamAction(
  s: State,
  actor: Actor,
  id: string,
  action: "INVALIDATE" | "RESTORE" | "RETRY" | "NO_SHOW",
  reason: string,
  simulate = false,
  now = Date.now(),
): State {
  guard(
    actor.role === "team",
    "Only the interview team can perform this action.",
  );
  guard(
    reason.trim().length >= 8,
    "Provide a reason of at least 8 characters.",
  );
  const n = structuredClone(s);
  if (action === "INVALIDATE" || action === "RESTORE") {
    const a = n.awards.find((x) => x.id === id);
    guard(a, "Award not found.");
    guard(
      a.status === (action === "INVALIDATE" ? "VALID" : "INVALIDATED"),
      "This award is already in the requested state.",
    );
    a.status = action === "INVALIDATE" ? "INVALIDATED" : "VALID";
    a.reason = reason;
    a.invalidatedAt =
      action === "INVALIDATE" ? new Date(now).toISOString() : undefined;
  } else {
    const a = n.attempts.find((x) => x.id === id);
    guard(a, "Attempt not found.");
    if (action === "RETRY") {
      guard(
        a.outcome === "FAIL" || a.status === "NO_SHOW",
        "Retry authorization applies to a failed or missed attempt.",
      );
      guard(!a.retryAuthorized, "Retry is already authorized.");
      a.retryAuthorized = true;
    } else {
      guard(
        a.status === "BOOKED",
        "Only a scheduled interview can be marked no-show.",
      );
      guard(
        simulate ||
          Date.parse(n.slots.find((x) => x.id === a.slotId)!.end) <= now,
        "The interview has not ended.",
      );
      a.status = "NO_SHOW";
    }
    a.updatedAt = new Date(now).toISOString();
  }
  audit(n, actor, simulate ? `DEMO_${action}` : action, id, reason);
  return n;
}
export function availability(
  s: State,
  actor: Actor,
  action: "ADD" | "EDIT" | "DELETE",
  slot: Slot,
  now = Date.now(),
): State {
  guard(
    actor.role === "team" ||
      (actor.role === "interviewer" && actor.id === slot.interviewerId),
    "You can only manage your own availability.",
  );
  const n = structuredClone(s);
  const old = n.slots.find((x) => x.id === slot.id);
  if (action !== "ADD") {
    guard(old, "Slot not found.");
    guard(
      old.interviewerId === slot.interviewerId,
      "The interviewer cannot be changed.",
    );
    guard(
      !n.attempts.some((a) => a.slotId === slot.id),
      "Availability with interview history is protected. Add a new slot instead.",
    );
  }
  if (action !== "DELETE") {
    guard(
      n.interviewers.some((i) => i.id === slot.interviewerId),
      "Unknown interviewer.",
    );
    guard(
      Date.parse(slot.start) > now &&
        Date.parse(slot.end) - Date.parse(slot.start) === 1800000,
      "Availability must be a future 30-minute slot.",
    );
    guard(
      !n.slots.some(
        (x) =>
          x.id !== slot.id &&
          x.interviewerId === slot.interviewerId &&
          overlaps(slot, x),
      ),
      "This overlaps existing interviewer availability.",
    );
  }
  if (action === "DELETE") n.slots = n.slots.filter((x) => x.id !== slot.id);
  else if (action === "EDIT") Object.assign(old!, slot);
  else {
    guard(!old, "Slot already exists.");
    n.slots.push(slot);
  }
  audit(n, actor, `AVAILABILITY_${action}`, slot.id);
  return n;
}
export const queue = (s: State) =>
  s.students.flatMap((student) =>
    s.badges
      .filter((b) => eligible(s, student.id, b.id))
      .map((badge) => ({
        student,
        badge,
        status: journey(s, student.id, badge.id),
      })),
  );
