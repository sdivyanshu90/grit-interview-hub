import type { State, Journey, Outcome } from "../domain/types";
export const scenarios: { label: string; state: Journey }[] = [
  { label: "Skills incomplete", state: "LOCKED" },
  { label: "Ready to book", state: "ELIGIBLE_UNBOOKED" },
  { label: "Interview booked", state: "BOOKED" },
  { label: "Awaiting result", state: "AWAITING_RESULT" },
  { label: "Badge earned", state: "PASSED" },
  { label: "Failed", state: "FAILED" },
  { label: "Retake required", state: "RETAKE_REQUIRED" },
  { label: "Badge invalidated", state: "BADGE_INVALIDATED" },
];
export function seed(
  scenario: Journey = "ELIGIBLE_UNBOOKED",
  now = new Date(),
): State {
  const skills = [
    "Computational Thinking · L1",
    "CS Fundamentals · L1",
    "Applied Gen AI Development · L1",
    "UI Engineering · L2",
  ];
  const s: State = {
    version: 1,
    scenario: scenarios.find((x) => x.state === scenario)!.label,
    badges: [
      {
        id: "product-novice",
        track: "AI Product Mastery",
        tier: "Novice",
        skills,
      },
      {
        id: "systems-novice",
        track: "AI Systems Mastery",
        tier: "Novice",
        skills: [
          ...skills.slice(0, 3),
          "Quantitative Reasoning · L1",
          "Critical Thinking & Communication · L1",
        ],
      },
      {
        id: "product-specialist",
        track: "AI Product Mastery",
        tier: "Specialist",
        previous: "product-novice",
        skills: [
          "Computational Thinking · L2",
          "CS Fundamentals · L1",
          "Applied Gen AI Development · L2",
          "UI Engineering · L2",
          "Server Side Engineering · L1",
          "SQL · L1",
        ],
      },
    ],
    students: [
      "Aarav Mehta",
      "Isha Rao",
      "Kabir Shah",
      "Nila Sen",
      "Rohan Das",
      "Tara Nair",
      "Vivaan Roy",
      "Zoya Kapoor",
      "Dev Sethi",
      "Mira Bose",
      "Anay Jain",
      "Sana Iyer",
    ].map((name, i) => ({
      id: `s${i}`,
      name,
      cohort: "NIAT · 2025 batch",
      progress: {
        "product-novice": i === 9 || i === 11 ? 2 : 4,
        "systems-novice": i === 10 ? 5 : 2,
        "product-specialist": i === 11 ? 6 : 1,
      },
      restricted: false,
    })),
    interviewers: [
      { id: "i0", name: "Ananya Iyer", specialty: "Product & engineering" },
      { id: "i1", name: "Arjun Menon", specialty: "Systems & problem solving" },
      { id: "i2", name: "Priya Sharma", specialty: "AI & development" },
    ],
    slots: [],
    attempts: [],
    awards: [],
    audit: [],
  };
  // Construct local calendar days explicitly in IST, then persist UTC.
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const midnight = Date.parse(`${day}T00:00:00+05:30`);
  for (let d = 1; d <= 7; d++)
    for (let i = 0; i < 3; i++)
      for (let h = 0; h < 3; h++) {
        const start = new Date(
          midnight + d * 86400000 + (10 + h + i * 2) * 3600000,
        );
        s.slots.push({
          id: `slot-${d}-${i}-${h}`,
          interviewerId: `i${i}`,
          start: start.toISOString(),
          end: new Date(+start + 1800000).toISOString(),
        });
      }
  const add = (studentId: string, state: Journey, index: number) => {
    if (state === "LOCKED") {
      s.students.find((x) => x.id === studentId)!.progress["product-novice"] =
        2;
      return;
    }
    if (state === "ELIGIBLE_UNBOOKED") return;
    const finished = !["BOOKED"].includes(state);
    const slot = finished
      ? {
          id: `past-${studentId}`,
          interviewerId: `i${index % 3}`,
          start: new Date(
            midnight - 86400000 + 10 * 3600000 + index * 1800000,
          ).toISOString(),
          end: new Date(
            midnight - 86400000 + 10 * 3600000 + index * 1800000 + 1800000,
          ).toISOString(),
        }
      : s.slots[index];
    if (finished) s.slots.push(slot);
    const outcome: Outcome | undefined =
      state === "PASSED" || state === "BADGE_INVALIDATED"
        ? "PASS"
        : state === "FAILED"
          ? "FAIL"
          : state === "RETAKE_REQUIRED"
            ? "RETAKE_LATER"
            : undefined;
    const a = {
      id: `attempt-${studentId}`,
      studentId,
      badgeId: "product-novice",
      slotId: slot.id,
      number: 1,
      status: finished ? ("COMPLETED" as const) : ("BOOKED" as const),
      outcome,
      createdAt: slot.start,
      updatedAt: slot.end,
      resultAt: outcome ? slot.end : undefined,
    };
    s.attempts.push(a);
    if (outcome === "PASS")
      s.awards.push({
        id: `award-${studentId}`,
        studentId,
        badgeId: "product-novice",
        attemptId: a.id,
        status: state === "BADGE_INVALIDATED" ? "INVALIDATED" : "VALID",
        createdAt: slot.end,
        reason:
          state === "BADGE_INVALIDATED"
            ? "Confirmed malpractice in a required skill contest."
            : undefined,
        invalidatedAt:
          state === "BADGE_INVALIDATED" ? now.toISOString() : undefined,
      });
  };
  add("s0", scenario, 0);
  add("s2", "BOOKED", 4);
  add("s3", "AWAITING_RESULT", 2);
  add("s4", "PASSED", 3);
  add("s5", "FAILED", 4);
  add("s6", "RETAKE_REQUIRED", 5);
  add("s7", "BADGE_INVALIDATED", 6);
  add("s8", "BOOKED", 8);
  return s;
}
