import { useState, useEffect } from "react";
import {
  ArrowRight,
  LayoutDashboard,
  CalendarDays,
  Award,
  BookOpen,
  Users,
  Clock3,
  Check,
  ChevronRight,
  Globe2,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  LogOut,
  CircleHelp,
  CheckCircle2,
  Map,
  LockKeyhole,
  Video,
  ArrowUpRight,
} from "lucide-react";
import type {
  Actor,
  State,
  Journey,
  Outcome,
  Slot,
  Attempt,
} from "./domain/types";
import * as rules from "./domain/rules";
import { date, time, message } from "./domain/messages";
import { load, save } from "./data/storage";
import { seed, scenarios } from "./data/seed";
import { BadgeArt, Button, Modal, Pill } from "./components/ui";
import { labels, tones } from "./components/journey";
import { StudentHome } from "./pages/StudentHome";
const dayKey = (v: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(v));
export default function App() {
  const [state, setState] = useState<State>(() => load(localStorage));
  const [actor, setActor] = useState<Actor>(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("grit-persona") || "null",
      ) as Actor | null;
      if (
        saved &&
        (saved.role === "team" ||
          (saved.role === "student" &&
            state.students.some((s) => s.id === saved.id)) ||
          (saved.role === "interviewer" &&
            state.interviewers.some((i) => i.id === saved.id)))
      )
        return saved;
    } catch {
      /* Session preferences are optional. */
    }
    return { role: "student", id: "s0" };
  });
  const [page, setPage] = useState(location.hash.slice(1) || "home");
  const [badgeId, setBadgeId] = useState("product-novice");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<null | {
    title: string;
    body: string;
    run: () => void;
  }>(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [reschedule, setReschedule] = useState(false);
  const [resultId, setResultId] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("PASS");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("10:00");
  const [editSlot, setEditSlot] = useState("");
  useEffect(() => {
    try {
      save(localStorage, state);
    } catch {
      setError(
        "Browser storage is unavailable or full. Changes will only last until this page closes.",
      );
    }
  }, [state]);
  useEffect(() => {
    const fn = () => setPage(location.hash.slice(1) || "home");
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    if (!dialog && !resultId) return;
    const prev = document.activeElement as HTMLElement;
    return () => prev?.focus();
  }, [dialog, resultId]);
  const go = (p: string) => {
    setPage(p);
    location.hash = p;
    setError("");
    setSelectedSlot("");
    setSelectedDay("");
  };
  useEffect(() => {
    try {
      sessionStorage.setItem("grit-persona", JSON.stringify(actor));
    } catch {
      /* Keep the demo usable without session preferences. */
    }
    const allowed =
      actor.role === "student"
        ? ["home", "booking", "details", "badges", "demo"]
        : actor.role === "interviewer"
          ? ["schedule", "availability", "demo"]
          : ["operations", "schedule", "audit", "demo"];
    if (!allowed.includes(page))
      go(
        actor.role === "student"
          ? "home"
          : actor.role === "interviewer"
            ? "schedule"
            : "operations",
      );
  }, [actor, page]);
  const mutate = (fn: (s: State) => State, success = "Changes saved.") => {
    try {
      setState(fn(state));
      setNotice(success);
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  const confirm = (title: string, body: string, run: () => void) =>
    setDialog({ title, body, run });
  const changeRole = (role: Actor["role"]) => {
    setActor({
      role,
      id: role === "student" ? "s0" : role === "interviewer" ? "i0" : "team",
    });
    go(
      role === "student"
        ? "home"
        : role === "interviewer"
          ? "schedule"
          : "operations",
    );
    setReschedule(false);
  };
  const student = state.students.find(
    (x) => x.id === (actor.role === "student" ? actor.id : "s0"),
  )!;
  const badge = state.badges.find((x) => x.id === badgeId)!;
  const status = rules.journey(state, student.id, badgeId);
  const attempts = rules.history(state, student.id, badgeId);
  const latest = attempts[0];
  const slot = latest
    ? state.slots.find((x) => x.id === latest.slotId)
    : undefined;
  const canBook = [
    "ELIGIBLE_UNBOOKED",
    "CANCELLED",
    "RETAKE_REQUIRED",
  ].includes(status);
  const earned = state.awards.filter(
    (x) => x.studentId === student.id && x.status === "VALID",
  ).length;
  const nav =
    actor.role === "student"
      ? [
          ["home", "Overview", LayoutDashboard],
          ["booking", "Interviews", CalendarDays],
          ["badges", "My badges", Award],
        ]
      : actor.role === "interviewer"
        ? [
            ["schedule", "My schedule", CalendarDays],
            ["availability", "Availability", Clock3],
          ]
        : [
            ["operations", "Interview operations", Users],
            ["schedule", "All interviews", CalendarDays],
            ["audit", "Activity log", ShieldCheck],
          ];
  const countQueue = rules.queue(state);
  const unbooked = countQueue.filter((x) =>
    ["ELIGIBLE_UNBOOKED", "CANCELLED", "RETAKE_REQUIRED"].includes(x.status),
  );
  const available = state.slots
    .filter(
      (x) =>
        Date.parse(x.start) > Date.now() &&
        !state.attempts.some((a) => a.status === "BOOKED" && a.slotId === x.id),
    )
    .sort((a, b) => a.start.localeCompare(b.start));
  const days = [...new Set(available.map((x) => dayKey(x.start)))];
  const chosenDay = selectedDay || days[0];
  const primary = () => {
    if (canBook) {
      setReschedule(false);
      go("booking");
    } else if (status === "PASSED") go("badges");
    else if (status === "BOOKED" || status === "AWAITING_RESULT") go("details");
    else go("badges");
  };
  const primaryText = canBook
    ? "Book Interview"
    : status === "PASSED"
      ? "View My Badge"
      : status === "BOOKED"
        ? "View Interview"
        : status === "AWAITING_RESULT"
          ? "View Interview"
          : "View progress";
  function appointment(a: Attempt) {
    const t = state.slots.find((x) => x.id === a.slotId)!;
    const b = state.badges.find((x) => x.id === a.badgeId)!;
    const st = state.students.find((x) => x.id === a.studentId)!;
    const auth = actor.role === "team" || t.interviewerId === actor.id;
    return (
      <article className="appointment" key={a.id}>
        <div className="time-block">
          <strong>{time(t.start)}</strong>
          <span>{date(t.start)}</span>
        </div>
        <div className="appointment-main">
          <strong>{st.name}</strong>
          <p>
            {b.track} <span>· {b.tier}</span>
          </p>
          <small>
            {state.interviewers.find((x) => x.id === t.interviewerId)?.name} ·
            Attempt {a.number}
          </small>
          {a.outcome && (
            <small>
              Result saved {date(a.resultAt!)} · Internal notes:{" "}
              {a.notes || "None"}
            </small>
          )}
        </div>
        <Pill
          tone={
            a.outcome === "PASS"
              ? "green"
              : a.outcome === "FAIL"
                ? "red"
                : "blue"
          }
        >
          {a.outcome?.replaceAll("_", " ") || a.status.replaceAll("_", " ")}
        </Pill>
        <div className="action-group">
          {auth && a.status === "BOOKED" && (
            <Button
              secondary
              onClick={() =>
                confirm(
                  "Simulate interview completion?",
                  "Demo time control: marks this interview complete immediately and records a demo event in the activity log.",
                  () =>
                    mutate(
                      (s) => rules.complete(s, actor, a.id, true),
                      "Interview complete. Record the outcome.",
                    ),
                )
              }
            >
              Demo: complete interview
            </Button>
          )}
          {auth && a.status === "COMPLETED" && !a.outcome && (
            <Button
              onClick={() => {
                setResultId(a.id);
                setNotes("");
                setOutcome("PASS");
              }}
            >
              Record outcome
            </Button>
          )}
          {actor.role === "team" && a.status === "BOOKED" && (
            <Button
              secondary
              onClick={() =>
                confirm(
                  "Cancel this appointment?",
                  "Team cancellation releases the slot and preserves the attempt.",
                  () =>
                    mutate(
                      (s) => rules.cancel(s, actor, a.id),
                      "Interview cancelled.",
                    ),
                )
              }
            >
              Cancel
            </Button>
          )}
          {actor.role === "team" && a.status === "BOOKED" && (
            <Button
              secondary
              onClick={() =>
                confirm(
                  "Simulate a missed interview?",
                  "Demo exception control: this records a no-show before real interview time. The student will need retry authorization.",
                  () =>
                    mutate((s) =>
                      rules.teamAction(
                        s,
                        actor,
                        a.id,
                        "NO_SHOW",
                        "Reviewer simulated a missed interview",
                        true,
                      ),
                    ),
                )
              }
            >
              Demo: no-show
            </Button>
          )}
          {actor.role === "team" &&
            (a.outcome === "FAIL" || a.status === "NO_SHOW") &&
            !a.retryAuthorized && (
              <Button
                secondary
                onClick={() =>
                  confirm(
                    "Authorize one new attempt?",
                    "The previous outcome stays unchanged. This administrative authorization will be audited.",
                    () =>
                      mutate((s) =>
                        rules.teamAction(
                          s,
                          actor,
                          a.id,
                          "RETRY",
                          "Team approved one additional attempt",
                        ),
                      ),
                  )
                }
              >
                Authorize retry
              </Button>
            )}
        </div>
      </article>
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#home"
          onClick={() =>
            go(
              actor.role === "student"
                ? "home"
                : actor.role === "interviewer"
                  ? "schedule"
                  : "operations",
            )
          }
        >
          GRIT<span className="brand-dot">✳</span>
        </a>
        <div className="brand-caption">YOUR SKILLS. YOUR WORLD.</div>
        <div className="workspace">
          <span className="workspace-symbol">N</span>
          <div>
            <strong>NIAT workspace</strong>
            <small>2026–27 programme</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <div className="nav-label">
          {actor.role === "student" ? "MY JOURNEY" : "WORKSPACE"}
        </div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={String(id)}
              className={page === id ? "nav-item active" : "nav-item"}
              onClick={() => go(String(id))}
            >
              {typeof Icon !== "string" && <Icon size={19} />}
              <span>{String(label)}</span>
              {id === "booking" && <span className="nav-dot" />}
            </button>
          ))}
          <button
            className={page === "demo" ? "nav-item active" : "nav-item"}
            onClick={() => go("demo")}
          >
            <Map size={19} />
            Reviewer guide
            <ArrowUpRight size={15} />
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="journey-note">
            <Globe2 size={25} />
            <strong>
              Big journeys start
              <br />
              with small milestones.
            </strong>
            <p>
              Your next one is closer
              <br />
              than you think.
            </p>
            <span>KEEP GOING ↗</span>
          </div>
          <button className="nav-item" onClick={() => go("demo")}>
            <CircleHelp size={19} />
            Prototype help
          </button>
          <div className="profile">
            <div className="avatar">
              {actor.role === "student"
                ? student.name
                    .split(" ")
                    .map((x) => x[0])
                    .join("")
                : actor.role === "team"
                  ? "IT"
                  : "AI"}
            </div>
            <div>
              <strong>
                {actor.role === "student"
                  ? student.name
                  : actor.role === "team"
                    ? "Interview team"
                    : state.interviewers.find((x) => x.id === actor.id)?.name}
              </strong>
              <small>
                {actor.role === "student"
                  ? "Student · NIAT 2025"
                  : actor.role === "team"
                    ? "Team administrator"
                    : "Interviewer"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>
              {actor.role === "student"
                ? "My journey"
                : actor.role === "team"
                  ? "Interview team"
                  : "Interviewer"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="prototype">
              <span /> ASSIGNMENT PROTOTYPE
            </span>
            <span className="timezone">
              <Globe2 size={14} /> Asia/Kolkata
            </span>
          </div>
        </header>
        <div className="demo-bar">
          <div>
            <SlidersHorizontal size={16} />
            <strong>Explore the demo</strong>
            <span className="hide-small">
              Changes sync across personas in this browser.
            </span>
          </div>
          <div className="demo-controls">
            <label>
              Persona
              <select
                aria-label="Demo persona"
                value={actor.role}
                onChange={(e) => changeRole(e.target.value as Actor["role"])}
              >
                <option value="student">Student</option>
                <option value="interviewer">Interviewer</option>
                <option value="team">Interview team</option>
              </select>
            </label>
            <label>
              Scenario
              <select
                aria-label="Demo scenario"
                value={
                  state.scenario === "Custom workflow"
                    ? "custom"
                    : scenarios.find((x) => x.label === state.scenario)
                        ?.state || "custom"
                }
                onChange={(e) => {
                  const scenario = e.target.value as Journey;
                  confirm(
                    "Load a demo scenario?",
                    "This replaces browser data, including your workflow changes, with a fresh scenario. Role switching preserves your work.",
                    () => {
                      setState(seed(scenario));
                      setBadgeId("product-novice");
                      setSelectedDay("");
                      setSelectedSlot("");
                      setReschedule(false);
                      setNotice("Scenario loaded.");
                    },
                  );
                }}
              >
                <option value="custom" disabled>
                  Custom workflow
                </option>
                {scenarios.map((x) => (
                  <option key={x.state} value={x.state}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="reset"
              onClick={() =>
                confirm(
                  "Reset the demo?",
                  "Restore the initial eligible student and seeded records. This replaces your browser changes.",
                  () => {
                    setState(seed());
                    setBadgeId("product-novice");
                    setSelectedSlot("");
                    setSelectedDay("");
                    setReschedule(false);
                    setNotice("Demo reset.");
                  },
                )
              }
            >
              <RotateCcw size={15} />
              Reset
            </button>
          </div>
        </div>
        <main>
          {notice && (
            <div role="status" className="notice">
              <CheckCircle2 size={17} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="error">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}
          {actor.role === "student" && (
            <div className="context-picker">
              <label>
                Track journey
                <select
                  aria-label="Track journey"
                  value={badgeId}
                  onChange={(e) => {
                    setBadgeId(e.target.value);
                    setSelectedSlot("");
                    setReschedule(false);
                  }}
                >
                  {state.badges.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.track} — {b.tier}
                    </option>
                  ))}
                </select>
              </label>
              <label className="student-picker">
                Demo student
                <select
                  aria-label="Demo student"
                  value={actor.id}
                  onChange={(e) => {
                    setActor({ ...actor, id: e.target.value });
                    setReschedule(false);
                  }}
                >
                  {state.students.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {page === "home" && actor.role === "student" && (
            <StudentHome
              student={student}
              badge={badge}
              status={status}
              slot={slot}
              earned={earned}
              primary={primary}
              primaryText={primaryText}
              go={go}
            />
          )}
          {page === "booking" && actor.role === "student" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">MAKE YOUR NEXT MOVE</div>
                <h1>
                  {reschedule ? "Find a new time" : "Book your interview"}
                </h1>
                <p>
                  {badge.track} — {badge.tier} · 30 minutes · All times in IST
                  (Asia/Kolkata)
                </p>
              </div>
              {!canBook && !reschedule ? (
                <section className="card empty">
                  <LockKeyhole />
                  <h2>{labels[status]}</h2>
                  <p>{message(status, badge.track, badge.tier, slot?.start)}</p>
                  <Button onClick={() => go(latest ? "details" : "home")}>
                    {latest ? "View Interview" : "Back to overview"}
                  </Button>
                </section>
              ) : (
                <div className="booking-grid">
                  <section className="card calendar-card">
                    <div className="section-heading">
                      <h2>Choose a date & time</h2>
                      <Pill tone="green">
                        {reschedule ? "Rescheduling" : "Eligible"}
                      </Pill>
                    </div>
                    <p>Pick a time that gives you space to prepare.</p>
                    <div className="date-options">
                      {days.map((d) => (
                        <button
                          key={d}
                          className={chosenDay === d ? "selected" : ""}
                          onClick={() => {
                            setSelectedDay(d);
                            setSelectedSlot("");
                          }}
                        >
                          <span>
                            {new Intl.DateTimeFormat("en-IN", {
                              weekday: "short",
                              timeZone: "Asia/Kolkata",
                            }).format(new Date(d + "T12:00:00+05:30"))}
                          </span>
                          <strong>{d.slice(-2)}</strong>
                          <span>
                            {new Intl.DateTimeFormat("en-IN", {
                              month: "short",
                              timeZone: "Asia/Kolkata",
                            }).format(new Date(d + "T12:00:00+05:30"))}
                          </span>
                        </button>
                      ))}
                    </div>
                    <h3>
                      Available times <small>· IST</small>
                    </h3>
                    <div className="slot-options">
                      {available
                        .filter((x) => dayKey(x.start) === chosenDay)
                        .map((x) => (
                          <button
                            key={x.id}
                            className={selectedSlot === x.id ? "selected" : ""}
                            onClick={() => setSelectedSlot(x.id)}
                          >
                            <strong>{time(x.start)}</strong>
                            <span>
                              {
                                state.interviewers.find(
                                  (i) => i.id === x.interviewerId,
                                )?.name
                              }
                            </span>
                          </button>
                        ))}
                    </div>
                    {!available.length && (
                      <div className="empty">
                        <CalendarDays />
                        <h3>No available slots right now.</h3>
                        <p>
                          The interview team hasn’t added any future
                          availability. Your eligibility is saved. Please check
                          back later.
                        </p>
                      </div>
                    )}
                  </section>
                  <section className="card booking-summary">
                    <BadgeArt small tier={badge.tier} />
                    <h2>{badge.track}</h2>
                    <Pill>{badge.tier} Track Badge</Pill>
                    <hr />
                    <p>
                      <Clock3 size={17} />
                      30-minute conversation
                    </p>
                    <p>
                      <Video size={17} />
                      Online · joining details not configured
                    </p>
                    <p>
                      <Globe2 size={17} />
                      Asia/Kolkata (IST, UTC+05:30)
                    </p>
                    {selectedSlot && (
                      <div className="selected-summary">
                        <strong>
                          {date(
                            state.slots.find((x) => x.id === selectedSlot)!
                              .start,
                          )}
                        </strong>
                        <span>
                          {time(
                            state.slots.find((x) => x.id === selectedSlot)!
                              .start,
                          )}{" "}
                          IST
                        </span>
                      </div>
                    )}
                    <Button
                      disabled={!selectedSlot}
                      onClick={() => {
                        const chosen = state.slots.find(
                          (x) => x.id === selectedSlot,
                        )!;
                        confirm(
                          reschedule
                            ? "Confirm reschedule"
                            : "Confirm your interview",
                          `${badge.track} — ${badge.tier}. ${date(chosen.start)}, ${time(chosen.start)} IST with ${state.interviewers.find((x) => x.id === chosen.interviewerId)?.name}. ${reschedule ? "Your previous reservation will be released only if the new booking succeeds." : ""}`,
                          () => {
                            if (
                              mutate(
                                (s) =>
                                  rules.book(
                                    s,
                                    actor,
                                    student.id,
                                    badgeId,
                                    selectedSlot,
                                    reschedule ? latest?.id : undefined,
                                  ),
                                "Interview booked. You’re all set!",
                              )
                            ) {
                              setReschedule(false);
                              go("details");
                            }
                          },
                        );
                      }}
                    >
                      {reschedule ? "Confirm new time" : "Confirm booking"}
                      <ArrowRight size={16} />
                    </Button>
                    <small>
                      Demo rule: cancel or reschedule before the interview
                      starts. No penalty is simulated.
                    </small>
                  </section>
                </div>
              )}
            </>
          )}
          {page === "details" && actor.role === "student" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">YOUR INTERVIEW</div>
                <h1>One conversation. A new milestone.</h1>
                <p>
                  {badge.track} — {badge.tier}
                </p>
              </div>
              {latest && slot ? (
                <>
                  <section className="card detail-card">
                    <Pill tone={tones[status]}>{labels[status]}</Pill>
                    <h2>
                      {message(status, badge.track, badge.tier, slot.start)}
                    </h2>
                    <div className="detail-grid">
                      <div>
                        <small>DATE & TIME</small>
                        <strong>
                          {date(slot.start)} · {time(slot.start)} IST
                        </strong>
                      </div>
                      <div>
                        <small>INTERVIEWER</small>
                        <strong>
                          {
                            state.interviewers.find(
                              (x) => x.id === slot.interviewerId,
                            )?.name
                          }
                        </strong>
                      </div>
                      <div>
                        <small>DURATION</small>
                        <strong>30 minutes</strong>
                      </div>
                      <div>
                        <small>ATTEMPT</small>
                        <strong>
                          #{latest.number} ·{" "}
                          {latest.status.replaceAll("_", " ")}
                        </strong>
                      </div>
                    </div>
                    <div className="info-box">
                      <Video size={20} />
                      <span>
                        Joining details are not configured in this demo. In
                        production, confirmed meeting details would appear here.
                      </span>
                    </div>
                    <div className="action-group">
                      {status === "BOOKED" && (
                        <>
                          <Button
                            onClick={() => {
                              setReschedule(true);
                              go("booking");
                            }}
                          >
                            Reschedule interview
                          </Button>
                          <Button
                            secondary
                            onClick={() =>
                              confirm(
                                "Cancel your interview?",
                                "Your slot will be released. The cancelled attempt remains in your history and you can book again.",
                                () =>
                                  mutate(
                                    (s) => rules.cancel(s, actor, latest.id),
                                    "Your interview was cancelled and the slot released. You can book a new time when you are ready.",
                                  ),
                              )
                            }
                          >
                            Cancel interview
                          </Button>
                        </>
                      )}
                      {canBook && (
                        <Button
                          onClick={() => {
                            setReschedule(false);
                            go("booking");
                          }}
                        >
                          Book Interview
                        </Button>
                      )}
                      <Button secondary onClick={() => go("home")}>
                        Back to overview
                      </Button>
                    </div>
                  </section>
                  <h2 className="history-title">Your attempt history</h2>
                  <section className="card">
                    {attempts.map((a) => (
                      <div className="history-row" key={a.id}>
                        <span>Attempt {a.number}</span>
                        <span>
                          {date(
                            state.slots.find((x) => x.id === a.slotId)!.start,
                          )}
                        </span>
                        <Pill tone={a.outcome === "PASS" ? "green" : "neutral"}>
                          {a.outcome?.replaceAll("_", " ") ||
                            a.status.replaceAll("_", " ")}
                        </Pill>
                      </div>
                    ))}
                  </section>
                </>
              ) : (
                <section className="card empty">
                  <CalendarDays />
                  <h2>Your interview journey starts here.</h2>
                  <p>{message(status, badge.track, badge.tier)}</p>
                  <Button onClick={primary}>{primaryText}</Button>
                </section>
              )}
            </>
          )}
          {page === "badges" && actor.role === "student" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">PROOF OF YOUR PROGRESS</div>
                <h1>Small steps. Meaningful milestones.</h1>
                <p>
                  Track Badges are earned through cleared skills and a passed
                  Level Clearance Interview.
                </p>
              </div>
              <div className="badge-grid">
                {state.badges.map((b) => {
                  const j = rules.journey(state, student.id, b.id);
                  return (
                    <section
                      className={`card badge-card ${j === "BADGE_INVALIDATED" ? "invalidated-card" : ""}`}
                      key={b.id}
                    >
                      <BadgeArt
                        tier={b.tier}
                        earned={j === "PASSED"}
                        invalid={j === "BADGE_INVALIDATED"}
                      />
                      <h2>{b.track}</h2>
                      <h3>{b.tier}</h3>
                      <Pill tone={tones[j]}>{labels[j]}</Pill>
                      <p>
                        {message(
                          j,
                          b.track,
                          b.tier,
                          state.slots.find(
                            (x) =>
                              x.id ===
                              rules.history(state, student.id, b.id)[0]?.slotId,
                          )?.start,
                        )}
                      </p>
                      {b.previous && (
                        <small>
                          Requires a valid Novice award and all six Specialist
                          skills.
                        </small>
                      )}
                      <Button
                        secondary
                        onClick={() => {
                          setBadgeId(b.id);
                          setReschedule(false);
                          go(
                            j === "PASSED" || j === "BADGE_INVALIDATED"
                              ? "details"
                              : "booking",
                          );
                        }}
                      >
                        View journey
                        <ArrowRight size={15} />
                      </Button>
                    </section>
                  );
                })}
              </div>
              <section className="card progression">
                <h2>The mastery path</h2>
                <div>
                  {[
                    "Novice",
                    "Specialist",
                    "Expert",
                    "Master",
                    "Grand Master",
                  ].map((x, i) => (
                    <span key={x}>
                      {i < 2 ? <Award size={20} /> : <LockKeyhole size={19} />}
                      <strong>{x}</strong>
                      <small>
                        {i < 2
                          ? "Sequential progression"
                          : "Criteria announced by NIAT"}
                      </small>
                    </span>
                  ))}
                </div>
                <p>
                  No Miles or leaderboard changes are simulated. Higher tier
                  rules remain subject to NIAT’s published criteria.
                </p>
              </section>
            </>
          )}
          {page === "schedule" && actor.role !== "student" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">
                  INTERVIEW WORKSPACE · {date(new Date().toISOString())}
                </div>
                <h1>
                  {actor.role === "team"
                    ? "Every interview, in view."
                    : "Make room for someone’s next step."}
                </h1>
                <p>
                  Upcoming appointments and completed conversations. All times
                  in IST.
                </p>
              </div>
              <div className="toolbar">
                {actor.role === "interviewer" && (
                  <label>
                    Interviewer
                    <select
                      aria-label="Interviewer"
                      value={actor.id}
                      onChange={(e) =>
                        setActor({ ...actor, id: e.target.value })
                      }
                    >
                      {state.interviewers.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Schedule view
                  <select
                    aria-label="Schedule view"
                    value={scheduleFilter}
                    onChange={(e) => setScheduleFilter(e.target.value)}
                  >
                    <option value="all">All appointments</option>
                    <option value="today">Today</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed & history</option>
                    <option value="pending">Awaiting outcome</option>
                  </select>
                </label>
              </div>
              <section className="card schedule-list">
                {(() => {
                  const list = state.attempts
                    .filter(
                      (a) =>
                        actor.role === "team" ||
                        state.slots.find((x) => x.id === a.slotId)
                          ?.interviewerId === actor.id,
                    )
                    .filter(
                      (a) =>
                        scheduleFilter === "all" ||
                        (scheduleFilter === "today" &&
                          dayKey(
                            state.slots.find((x) => x.id === a.slotId)!.start,
                          ) === dayKey(new Date().toISOString())) ||
                        (scheduleFilter === "upcoming" &&
                          a.status === "BOOKED") ||
                        (scheduleFilter === "completed" &&
                          a.status !== "BOOKED") ||
                        (scheduleFilter === "pending" &&
                          a.status === "COMPLETED" &&
                          !a.outcome),
                    )
                    .sort((a, b) =>
                      state.slots
                        .find((x) => x.id === a.slotId)!
                        .start.localeCompare(
                          state.slots.find((x) => x.id === b.slotId)!.start,
                        ),
                    );
                  return list.length ? (
                    list.map(appointment)
                  ) : (
                    <div className="empty">
                      <CalendarDays />
                      <h2>A little breathing room.</h2>
                      <p>
                        No interviews in this view. Future bookings appear here
                        automatically.
                      </p>
                    </div>
                  );
                })()}
              </section>
              <div className="info-box">
                Demo completion controls are explicit, audited time simulations.
                Production completion requires the interview end time.
              </div>
            </>
          )}
          {page === "availability" && actor.role === "interviewer" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">YOUR AVAILABILITY</div>
                <h1>A little planning. A lot of possibility.</h1>
                <p>
                  Offer 30-minute slots. Confirmed and historical appointments
                  stay protected.
                </p>
              </div>
              <div className="toolbar">
                <label>
                  Interviewer
                  <select
                    aria-label="Interviewer"
                    value={actor.id}
                    onChange={(e) => {
                      setActor({ ...actor, id: e.target.value });
                      setEditSlot("");
                    }}
                  >
                    {state.interviewers.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <section className="card">
                <h2>{editSlot ? "Modify availability" : "Add availability"}</h2>
                <form
                  className="availability-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const start = new Date(`${slotDate}T${slotTime}:00+05:30`);
                    if (Number.isNaN(+start)) {
                      setError("Choose a valid date and time.");
                      return;
                    }
                    const x: Slot = {
                      id: editSlot || crypto.randomUUID(),
                      interviewerId: actor.id,
                      start: start.toISOString(),
                      end: new Date(+start + 1800000).toISOString(),
                    };
                    if (
                      mutate(
                        (s) =>
                          rules.availability(
                            s,
                            actor,
                            editSlot ? "EDIT" : "ADD",
                            x,
                          ),
                        "Availability saved.",
                      )
                    ) {
                      setEditSlot("");
                      setSlotDate("");
                    }
                  }}
                >
                  <label>
                    Date (IST)
                    <input
                      aria-label="Availability date"
                      type="date"
                      required
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                    />
                  </label>
                  <label>
                    Start time (IST)
                    <input
                      aria-label="Availability time"
                      type="time"
                      required
                      value={slotTime}
                      onChange={(e) => setSlotTime(e.target.value)}
                    />
                  </label>
                  <Button type="submit">
                    {editSlot ? "Save change" : "Add 30-minute slot"}
                  </Button>
                  {editSlot && (
                    <Button secondary onClick={() => setEditSlot("")}>
                      Discard edit
                    </Button>
                  )}
                </form>
              </section>
              <section className="card availability-list">
                <h2>Upcoming availability</h2>
                {state.slots
                  .filter(
                    (x) =>
                      x.interviewerId === actor.id &&
                      Date.parse(x.start) > Date.now(),
                  )
                  .sort((a, b) => a.start.localeCompare(b.start))
                  .map((x) => {
                    const history = state.attempts.some(
                      (a) => a.slotId === x.id,
                    );
                    const booked = state.attempts.some(
                      (a) => a.slotId === x.id && a.status === "BOOKED",
                    );
                    return (
                      <div className="availability-row" key={x.id}>
                        <CalendarDays size={18} />
                        <strong>{date(x.start)}</strong>
                        <span>
                          {time(x.start)} – {time(x.end)} IST
                        </span>
                        <Pill tone={booked ? "blue" : "green"}>
                          {booked
                            ? "Booked"
                            : history
                              ? "Free · history protected"
                              : "Available"}
                        </Pill>
                        <div className="action-group">
                          <button
                            disabled={history}
                            className="text-button"
                            onClick={() => {
                              setEditSlot(x.id);
                              setSlotDate(dayKey(x.start));
                              setSlotTime(
                                new Intl.DateTimeFormat("en-GB", {
                                  timeZone: "Asia/Kolkata",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                }).format(new Date(x.start)),
                              );
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            disabled={history}
                            className="text-button red-text"
                            onClick={() =>
                              confirm(
                                "Remove this free slot?",
                                `${date(x.start)} at ${time(x.start)} IST will no longer be offered to students.`,
                                () =>
                                  mutate(
                                    (s) =>
                                      rules.availability(s, actor, "DELETE", x),
                                    "Availability removed.",
                                  ),
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </section>
            </>
          )}
          {page === "operations" && actor.role === "team" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">INTERVIEW TEAM</div>
                <h1>See the queue. Keep it moving.</h1>
                <p>
                  Eligibility is per student and badge. Only skill-ready
                  journeys with valid prerequisites appear below.
                </p>
              </div>
              <div className="ops-stats">
                {[
                  [
                    "Eligible students",
                    new Set(countQueue.map((x) => x.student.id)).size,
                  ],
                  ["Eligible, unbooked", unbooked.length],
                  [
                    "Booked",
                    countQueue.filter((x) => x.status === "BOOKED").length,
                  ],
                  [
                    "Awaiting outcome",
                    countQueue.filter((x) => x.status === "AWAITING_RESULT")
                      .length,
                  ],
                  [
                    "Results recorded",
                    state.attempts.filter((x) => x.outcome).length,
                  ],
                ].map(([label, value]) => (
                  <div className="card" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="toolbar">
                <label className="search-label">
                  Search students
                  <input
                    placeholder="Search by name…"
                    aria-label="Search students"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <label>
                  Status
                  <select
                    aria-label="Filter status"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="unbooked">Eligible, unbooked</option>
                    {Object.entries(labels)
                      .filter(([k]) => k !== "LOCKED")
                      .map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Track & badge
                  <select
                    aria-label="Filter track and badge"
                    value={trackFilter}
                    onChange={(e) => setTrackFilter(e.target.value)}
                  >
                    <option value="all">All journeys</option>
                    {state.badges.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.track} — {b.tier}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <section className="card table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>STUDENT</th>
                      <th>TRACK / BADGE</th>
                      <th>INTERVIEW STATUS</th>
                      <th>NEXT ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countQueue
                      .filter(
                        (x) =>
                          x.student.name
                            .toLowerCase()
                            .includes(search.toLowerCase()) &&
                          (trackFilter === "all" ||
                            x.badge.id === trackFilter) &&
                          (filter === "all" ||
                            filter === x.status ||
                            (filter === "unbooked" &&
                              [
                                "ELIGIBLE_UNBOOKED",
                                "CANCELLED",
                                "RETAKE_REQUIRED",
                              ].includes(x.status))),
                      )
                      .map((x) => (
                        <tr key={x.student.id + x.badge.id}>
                          <td>
                            <strong>{x.student.name}</strong>
                            <small>{x.student.cohort}</small>
                          </td>
                          <td>
                            {x.badge.track}
                            <small>{x.badge.tier}</small>
                          </td>
                          <td>
                            <Pill tone={tones[x.status]}>
                              {labels[x.status]}
                            </Pill>
                          </td>
                          <td>
                            <button
                              className="text-button"
                              onClick={() => {
                                setBadgeId(x.badge.id);
                                setActor({ role: "student", id: x.student.id });
                                go("home");
                              }}
                            >
                              View as student <ArrowUpRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!countQueue.some(
                  (x) =>
                    x.student.name
                      .toLowerCase()
                      .includes(search.toLowerCase()) &&
                    (trackFilter === "all" || x.badge.id === trackFilter) &&
                    (filter === "all" ||
                      filter === x.status ||
                      (filter === "unbooked" &&
                        [
                          "ELIGIBLE_UNBOOKED",
                          "CANCELLED",
                          "RETAKE_REQUIRED",
                        ].includes(x.status))),
                ) && (
                  <div className="empty">
                    No eligible journeys match these filters.
                  </div>
                )}
              </section>
              <section className="card integrity">
                <div>
                  <ShieldCheck size={25} />
                  <h2>Badge integrity & corrections</h2>
                  <p>
                    Confirmed findings affect the award. The original interview
                    result remains in history. Restoring an overturned flag is
                    audited.
                  </p>
                </div>
                <label>
                  Decision reason
                  <input
                    aria-label="Integrity decision reason"
                    placeholder="Document the confirmed finding or reversal…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                {state.awards.map((a) => (
                  <div className="integrity-row" key={a.id}>
                    <div>
                      <strong>
                        {state.students.find((x) => x.id === a.studentId)?.name}
                      </strong>
                      <small>
                        {state.badges.find((x) => x.id === a.badgeId)?.track} —{" "}
                        {state.badges.find((x) => x.id === a.badgeId)?.tier}
                      </small>
                      {a.reason && <small>Last decision: {a.reason}</small>}
                    </div>
                    <Pill tone={a.status === "VALID" ? "green" : "red"}>
                      {a.status}
                    </Pill>
                    <Button
                      secondary
                      danger={a.status === "VALID"}
                      onClick={() =>
                        confirm(
                          a.status === "VALID"
                            ? "Confirm malpractice & invalidate?"
                            : "Overturn finding & restore badge?",
                          `${state.students.find((x) => x.id === a.studentId)?.name}. ${reason || "A reason of at least 8 characters is required."} Historical PASS will remain unchanged.`,
                          () =>
                            mutate(
                              (s) =>
                                rules.teamAction(
                                  s,
                                  actor,
                                  a.id,
                                  a.status === "VALID"
                                    ? "INVALIDATE"
                                    : "RESTORE",
                                  reason,
                                ),
                              "Badge decision saved and audited.",
                            ),
                        )
                      }
                    >
                      {a.status === "VALID"
                        ? "Invalidate badge"
                        : "Restore award"}
                    </Button>
                  </div>
                ))}
              </section>
              <section className="card">
                <h2>Policy & booking exceptions</h2>
                <p>
                  Failed or missed interviews require explicit team
                  authorization for a new attempt. Wrong outcomes are escalated
                  for a reviewed correction in production; this demo never
                  overwrites a saved result.
                </p>
                <Button secondary onClick={() => go("schedule")}>
                  Manage interviews & retry authorizations
                  <ArrowRight size={15} />
                </Button>
              </section>
            </>
          )}
          {page === "audit" && actor.role === "team" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">ACCOUNTABILITY BY DESIGN</div>
                <h1>A clear record of every decision.</h1>
                <p>
                  Administrative actions, scheduling changes and demo time
                  simulations. Browser-local records are inspectable, not
                  tamper-proof.
                </p>
              </div>
              <section className="card">
                {state.audit.length ? (
                  state.audit.map((a) => (
                    <div className="audit-row" key={a.id}>
                      <ShieldCheck size={18} />
                      <div>
                        <strong>{a.action.replaceAll("_", " ")}</strong>
                        <small>
                          {a.actor} · {date(a.at)} {time(a.at)} IST
                        </small>
                        <small>Record: {a.target}</small>
                        {a.reason && <p>{a.reason}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty">
                    No actions yet. Book an interview to start the activity log.
                  </div>
                )}
              </section>
            </>
          )}
          {page === "demo" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">A FIVE-MINUTE PRODUCT TOUR</div>
                <h1>One journey. Three perspectives.</h1>
                <p>
                  Independent assignment prototype. All names are fictional. No
                  login required.
                </p>
              </div>
              <section className="card guide">
                {[
                  [
                    "Start with a clean slate",
                    "Reset the demo. The main student, Aarav Mehta, has cleared all four AI Product Mastery — Novice skills.",
                  ],
                  [
                    "Book your next milestone",
                    "As Student, open Interviews, pick a date and time, then confirm. Refresh to verify persistence.",
                  ],
                  [
                    "See it from the other side",
                    "Switch to Interviewer. Select the assigned interviewer shown in your booking; the appointment is in their schedule.",
                  ],
                  [
                    "Complete & record PASS",
                    "Use “Demo: complete interview”, confirm, then “Record outcome”. Choose PASS and confirm the result.",
                  ],
                  [
                    "Celebrate the badge",
                    "Switch to Student. The dashboard and My badges now show an earned Novice Track Badge. Specialist still requires its own skills.",
                  ],
                  [
                    "Work the operational queue",
                    "Switch to Interview team. Filter “Eligible, unbooked” to see students ready for outreach. Counts come from actual records.",
                  ],
                  [
                    "Demonstrate the integrity flow",
                    "In Badge integrity, enter a reason and invalidate Aarav’s award. Switch to Student: the award is invalidated and the original PASS remains in attempt history.",
                  ],
                  [
                    "Explore the before & after",
                    "Use Scenario to load incomplete, scheduled, pending, passed, failed, retake, and invalidated states. Confirming replaces demo data; switching personas preserves it.",
                  ],
                ].map(([title, body], i) => (
                  <div className="guide-step" key={title}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={() => {
                    changeRole("student");
                  }}
                >
                  Start the walkthrough
                  <ArrowRight size={16} />
                </Button>
              </section>
              <section className="card">
                <h2>Prototype assumptions & boundaries</h2>
                <p>
                  30-minute interviews. Times shown in IST; UTC in storage.
                  Students can cancel or reschedule before start. Retake later
                  allows another attempt; failure and no-show require team
                  approval. Skill/integrity changes are rechecked before booking
                  and results. Existing reservations are preserved for team
                  review if eligibility changes.
                </p>
                <p>
                  The persona switcher is a demo tool, not authentication.
                  Browser storage is not cross-user synchronization. Production
                  requires server authorization, transactions, exclusion
                  constraints, idempotency and durable audit records. No meeting
                  links, Miles or final-selection outcomes are simulated.
                </p>
                <p>
                  Open NIAT questions: cancellation notice, retry limits,
                  student feedback, extended pending-result escalation,
                  downstream invalidation, appeal authority and outcome
                  correction approvals.
                </p>
                <a
                  className="text-button"
                  href="/assignment-writeup.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the two-page assignment write-up
                  <ArrowUpRight size={16} />
                </a>
              </section>
            </>
          )}
          <footer>
            <span>GRIT · Global Readiness Immersion Trip</span>
            <span>Independent prototype for NIAT · Browser-local demo</span>
          </footer>
        </main>
      </div>
      {dialog && (
        <Modal title={dialog.title} onClose={() => setDialog(null)}>
          <p>{dialog.body}</p>
          <div className="modal-actions">
            <Button secondary onClick={() => setDialog(null)}>
              Go back
            </Button>
            <Button
              onClick={() => {
                dialog.run();
                setDialog(null);
              }}
            >
              Confirm
            </Button>
          </div>
        </Modal>
      )}
      {resultId && (
        <Modal title="Record interview outcome" onClose={() => setResultId("")}>
          <p>
            {
              state.students.find(
                (x) =>
                  x.id ===
                  state.attempts.find((a) => a.id === resultId)?.studentId,
              )?.name
            }{" "}
            ·{" "}
            {
              state.badges.find(
                (x) =>
                  x.id ===
                  state.attempts.find((a) => a.id === resultId)?.badgeId,
              )?.track
            }
          </p>
          <label>
            Interview outcome
            <select
              aria-label="Interview outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as Outcome)}
            >
              <option value="PASS">Pass — award Track Badge</option>
              <option value="FAIL">
                Fail — team approval required to retry
              </option>
              <option value="RETAKE_LATER">
                Retake later — allow a fresh attempt
              </option>
            </select>
          </label>
          <label>
            Internal notes (optional)
            <textarea
              aria-label="Internal notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="For the interview team only"
            />
          </label>
          <div className="info-box">
            Saved results cannot be overwritten. Confirm the student and outcome
            before saving.
          </div>
          <div className="modal-actions">
            <Button secondary onClick={() => setResultId("")}>
              Go back
            </Button>
            <Button
              onClick={() => {
                const id = resultId;
                setResultId("");
                confirm(
                  "Confirm interview result",
                  `Save ${outcome.replaceAll("_", " ")}? ${outcome === "PASS" ? "This awards the matching Track Badge." : outcome === "FAIL" ? "No badge is awarded. Another attempt needs team approval." : "The student can book a fresh attempt."}`,
                  () =>
                    mutate(
                      (s) => rules.record(s, actor, id, outcome, notes),
                      "Outcome recorded. Student dashboard updated.",
                    ),
                );
              }}
            >
              Review & save
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
