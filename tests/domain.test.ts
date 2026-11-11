import { describe, it, expect } from "vitest";
import { seed } from "../src/data/seed";
import * as r from "../src/domain/rules";
import { load, save } from "../src/data/storage";
import type { State, Actor, Outcome } from "../src/domain/types";
const student: Actor = { role: "student", id: "s0" },
  team: Actor = { role: "team", id: "team" },
  interviewer: Actor = { role: "interviewer", id: "i0" };
const badge = "product-novice";
const fresh = () => seed();
const book = (s: State = fresh()) =>
  r.book(s, student, "s0", badge, "slot-1-0-0");
const finish = (outcome: Outcome) => {
  const s = book();
  const id = s.attempts.at(-1)!.id;
  return r.record(
    r.complete(s, interviewer, id, true),
    interviewer,
    id,
    outcome,
    "Reviewed",
  );
};
describe("reservation guards", () => {
  it("rejects incomplete skills", () =>
    expect(() => book(seed("LOCKED"))).toThrow(/required skills/));
  it("requires the previous badge even if all higher skills are cleared", () => {
    const s = fresh();
    s.students[0].progress["product-specialist"] = 6;
    expect(() =>
      r.book(s, student, "s0", "product-specialist", "slot-1-0-0"),
    ).toThrow();
  });
  it("books an available future slot", () =>
    expect(r.journey(book(), "s0", badge)).toBe("BOOKED"));
  it("rejects duplicate active badge reservations", () =>
    expect(() => r.book(book(), student, "s0", badge, "slot-2-0-0")).toThrow(
      /active/,
    ));
  it("rejects reusing an occupied slot", () =>
    expect(() =>
      r.book(book(), { role: "student", id: "s1" }, "s1", badge, "slot-1-0-0"),
    ).toThrow(/conflicts/));
  it("rejects past slots", () => {
    const s = fresh();
    s.slots[0].start = new Date(Date.now() - 10000).toISOString();
    expect(() => book(s)).toThrow(/passed/);
  });
  it("appears in the assigned interviewer schedule", () => {
    const s = book();
    expect(
      s.attempts
        .filter(
          (a) => s.slots.find((x) => x.id === a.slotId)?.interviewerId === "i0",
        )
        .some((a) => a.studentId === "s0"),
    ).toBe(true);
  });
  it("reschedules atomically and preserves cancelled history", () => {
    const s = book(),
      old = s.attempts.at(-1)!;
    const n = r.book(s, student, "s0", badge, "slot-2-0-0", old.id);
    expect(n.attempts.find((a) => a.id === old.id)?.status).toBe("CANCELLED");
    expect(n.attempts.at(-1)?.number).toBe(2);
    expect(
      n.attempts.filter((a) => a.studentId === "s0" && r.active(a)),
    ).toHaveLength(1);
  });
  it("failed reschedule retains original reservation", () => {
    const s = book(),
      old = s.attempts.at(-1)!;
    expect(() =>
      r.book(s, student, "s0", badge, "slot-1-1-1", old.id),
    ).toThrow();
    expect(s.attempts.at(-1)?.status).toBe("BOOKED");
  });
  it("cancellation releases the slot for another student", () => {
    const s = book();
    const n = r.cancel(s, student, s.attempts.at(-1)!.id);
    expect(() =>
      r.book(n, { role: "student", id: "s1" }, "s1", badge, "slot-1-0-0"),
    ).not.toThrow();
  });
  it("protects availability with appointment history", () => {
    const s = book();
    expect(() => r.availability(s, interviewer, "DELETE", s.slots[0])).toThrow(
      /protected/,
    );
  });
  it("prevents overlapping interviewer availability", () => {
    const s = fresh();
    expect(() =>
      r.availability(s, interviewer, "ADD", { ...s.slots[0], id: "new" }),
    ).toThrow(/overlaps/);
  });
  it("permits editing and removing unbooked availability", () => {
    const s = fresh();
    const x = {
      ...s.slots[0],
      start: new Date(Date.parse(s.slots[0].start) + 15 * 60000).toISOString(),
      end: new Date(Date.parse(s.slots[0].end) + 15 * 60000).toISOString(),
    };
    const n = r.availability(s, interviewer, "EDIT", x);
    expect(n.slots[0].start).toBe(x.start);
    expect(
      r
        .availability(n, interviewer, "DELETE", x)
        .slots.find((z) => z.id === x.id),
    ).toBeUndefined();
  });
  it("prevents overlapping student appointments across tracks and interviewers", () => {
    let s = book();
    s.students[0].progress["systems-novice"] = 5;
    s = r.availability(s, { role: "interviewer", id: "i1" }, "ADD", {
      ...s.slots[0],
      id: "overlap",
      interviewerId: "i1",
    });
    expect(() => r.book(s, student, "s0", "systems-novice", "overlap")).toThrow(
      /conflicts/,
    );
  });
  it("restricts another student and unrelated interviewer", () => {
    expect(() =>
      r.book(fresh(), { role: "student", id: "s1" }, "s0", badge, "slot-1-0-0"),
    ).toThrow();
    const s = book();
    expect(() =>
      r.complete(
        s,
        { role: "interviewer", id: "i2" },
        s.attempts.at(-1)!.id,
        true,
      ),
    ).toThrow();
  });
  it("revalidates integrity before booking", () => {
    const s = fresh();
    s.students[0].restricted = true;
    expect(() => book(s)).toThrow();
  });
});
describe("outcomes and award integrity", () => {
  it("PASS awards the matching badge", () => {
    const s = finish("PASS");
    expect(s.awards.find((a) => a.studentId === "s0")?.badgeId).toBe(badge);
    expect(r.journey(s, "s0", badge)).toBe("PASSED");
  });
  it("FAIL preserves the attempt without an award", () => {
    const s = finish("FAIL");
    expect(s.awards.some((a) => a.studentId === "s0")).toBe(false);
    expect(() => book(s)).toThrow(/authorization/);
  });
  it("RETAKE_LATER permits a fresh attempt while preserving history", () => {
    const s = finish("RETAKE_LATER");
    const n = r.book(s, student, "s0", badge, "slot-2-0-0");
    expect(r.history(n, "s0", badge)).toHaveLength(2);
    expect(r.history(n, "s0", badge)[1].outcome).toBe("RETAKE_LATER");
  });
  it("invalidates an award and retains historical PASS", () => {
    const s = finish("PASS");
    const a = s.awards.find((a) => a.studentId === "s0")!;
    const n = r.teamAction(
      s,
      team,
      a.id,
      "INVALIDATE",
      "Confirmed contest malpractice",
    );
    expect(r.journey(n, "s0", badge)).toBe("BADGE_INVALIDATED");
    expect(r.history(n, "s0", badge)[0].outcome).toBe("PASS");
    expect(n.audit[0].action).toBe("INVALIDATE");
  });
  it("restores an overturned finding with an audit event", () => {
    const s = seed("BADGE_INVALIDATED");
    const n = r.teamAction(
      s,
      team,
      "award-s0",
      "RESTORE",
      "Appeal verified and flag overturned",
    );
    expect(r.journey(n, "s0", badge)).toBe("PASSED");
    expect(n.audit[0].reason).toContain("Appeal");
  });
  it("invalidated prerequisites block higher tiers", () => {
    const s = seed("BADGE_INVALIDATED");
    s.students[0].progress["product-specialist"] = 6;
    expect(r.eligible(s, "s0", "product-specialist")).toBe(false);
  });
  it("does not allow awarded badges to be booked again", () =>
    expect(() => book(finish("PASS"))).toThrow(/award/));
  it("rejects duplicate result submissions", () => {
    const s = finish("PASS");
    expect(() => r.record(s, team, s.attempts.at(-1)!.id, "FAIL", "")).toThrow(
      /overwritten/,
    );
  });
  it("rejects student outcome recording", () => {
    const s = book();
    const id = s.attempts.at(-1)!.id;
    expect(() =>
      r.record(r.complete(s, team, id, true), student, id, "PASS", ""),
    ).toThrow(/assigned/);
  });
  it("rejects premature real-time completion and audits demo simulation", () => {
    const s = book(),
      id = s.attempts.at(-1)!.id;
    expect(() => r.complete(s, interviewer, id)).toThrow(/not ended/);
    expect(r.complete(s, interviewer, id, true).audit[0].action).toBe(
      "DEMO_SIMULATE_COMPLETION",
    );
  });
  it("requires team retry authorization after no-show", () => {
    const s = book(),
      id = s.attempts.at(-1)!.id;
    const missed = r.teamAction(
      s,
      team,
      id,
      "NO_SHOW",
      "Reviewer simulated a missed appointment",
      true,
    );
    expect(() => r.book(missed, student, "s0", badge, "slot-2-0-0")).toThrow();
    expect(() =>
      r.book(
        r.teamAction(missed, team, id, "RETRY", "Approved a second chance"),
        student,
        "s0",
        badge,
        "slot-2-0-0",
      ),
    ).not.toThrow();
  });
  it("rechecks eligibility before results without deleting a reservation", () => {
    const s = book(),
      id = s.attempts.at(-1)!.id;
    s.students[0].restricted = true;
    expect(r.journey(s, "s0", badge)).toBe("BOOKED");
    expect(() =>
      r.record(r.complete(s, team, id, true), team, id, "PASS", ""),
    ).toThrow(/Eligibility/);
  });
  it("derives the eligible unbooked count from journeys", () => {
    const s = fresh();
    const unbooked = (n: State) =>
      r
        .queue(n)
        .filter((x) =>
          ["ELIGIBLE_UNBOOKED", "CANCELLED", "RETAKE_REQUIRED"].includes(
            x.status,
          ),
        ).length;
    expect(unbooked(book(s))).toBe(unbooked(s) - 1);
    expect(r.queue(s).some((x) => x.student.id === "s9")).toBe(false);
  });
  it("persists state and history across reload", () => {
    const values = new Map<string, string>();
    const port = {
      getItem: (k: string) => values.get(k) || null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
    };
    const s = finish("PASS");
    save(port, s);
    expect(load(port)).toEqual(s);
  });
  it("recovers from malformed persisted data", () =>
    expect(
      load({ getItem: () => "{broken", setItem: () => {} }).students,
    ).toHaveLength(12));
});
