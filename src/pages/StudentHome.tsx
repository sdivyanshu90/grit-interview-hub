import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  BookOpen,
  Award,
  CalendarDays,
  Sparkles,
  Check,
  LockKeyhole,
  Video,
  Globe2,
} from "lucide-react";
import type { Student, Badge, Journey, Slot } from "../domain/types";
import { date, time, message } from "../domain/messages";
import { BadgeArt, Button, Pill } from "../components/ui";
import { labels, tones } from "../components/journey";
type Props = {
  student: Student;
  badge: Badge;
  status: Journey;
  slot?: Slot;
  earned: number;
  primary: () => void;
  primaryText: string;
  go: (page: string) => void;
};
export function StudentHome({
  student,
  badge,
  status,
  slot,
  earned,
  primary,
  primaryText,
  go,
}: Props) {
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">YOUR NEXT CHAPTER</div>
        <h1>
          Keep the momentum, {student.name.split(" ")[0]}
          <span className="wave">✳</span>
        </h1>
        <p>
          Every skill you clear brings your next milestone closer. Let’s make it
          count.
        </p>
      </div>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-kicker">
            <span /> THE NEXT STEP IS YOURS
          </div>
          <h2>
            {status === "PASSED"
              ? "A milestone worth celebrating."
              : status === "BADGE_INVALIDATED"
                ? "Your badge needs a review."
                : status === "BOOKED"
                  ? "You’re on the calendar."
                  : status === "LOCKED"
                    ? "Build skills. Go further."
                    : status === "AWAITING_RESULT"
                      ? "Great work showing up."
                      : "You’ve built the skills.\nNow, show your GRIT."}
          </h2>
          <p>
            {status === "ELIGIBLE_UNBOOKED"
              ? "Your " +
                badge.tier +
                " badge is one conversation away. Take the next step in your " +
                badge.track +
                " journey."
              : message(status, badge.track, badge.tier, slot?.start)}
          </p>
          <Button onClick={primary}>
            {primaryText}
            <ArrowRight size={17} />
          </Button>
          <div className="hero-foot">
            <ShieldCheck size={14} /> Track Badge interview · Not the final
            selection interview
          </div>
        </div>
        <div className="hero-visual">
          <span className="orbital-text">SKILL · CONFIDENCE · OPPORTUNITY</span>
          <BadgeArt
            tier={badge.tier}
            earned={status === "PASSED"}
            invalid={status === "BADGE_INVALIDATED"}
          />
          <span className="floating-star star-one">✦</span>
          <span className="floating-star star-two">✧</span>
          <div className="hero-badge-caption">
            {badge.track}
            <strong>{badge.tier} Track Badge</strong>
          </div>
        </div>
      </section>
      <div className="stat-grid">
        <div>
          <span className="stat-icon mint">
            <BookOpen size={20} />
          </span>
          <div>
            <span>Required skills cleared</span>
            <strong>
              {Math.min(student.progress[badge.id] || 0, badge.skills.length)}{" "}
              <small>/ {badge.skills.length}</small>
            </strong>
          </div>
          <Pill tone="green">
            {Math.round(
              (Math.min(student.progress[badge.id] || 0, badge.skills.length) /
                badge.skills.length) *
                100,
            )}
            %
          </Pill>
        </div>
        <div>
          <span className="stat-icon lavender">
            <Award size={21} />
          </span>
          <div>
            <span>Track Badges earned</span>
            <strong>
              {earned.toString().padStart(2, "0")}{" "}
              <small>milestones unlocked</small>
            </strong>
          </div>
        </div>
        <div>
          <span className="stat-icon peach">
            <CalendarDays size={20} />
          </span>
          <div>
            <span>Your next milestone</span>
            <strong className="stat-word">
              {status === "PASSED" ? "Specialist badge" : "Badge interview"}
            </strong>
          </div>
          <ArrowUpRight size={18} />
        </div>
      </div>
      <div className="section-heading">
        <div>
          <h2>Your track, your progress</h2>
          <p>A clear path from skills to recognition.</p>
        </div>
        <button className="text-button" onClick={() => go("badges")}>
          View all badges <ArrowRight size={16} />
        </button>
      </div>
      <div className="dashboard-grid">
        <section className="card track-card">
          <div className="card-top">
            <div className="track-icon">
              <Sparkles size={23} />
            </div>
            <div>
              <small>MASTERY TRACK</small>
              <h3>{badge.track}</h3>
            </div>
            <Pill>{badge.tier}</Pill>
          </div>
          <div className="progress-label">
            <span>Your badge requirements</span>
            <strong>
              {Math.min(student.progress[badge.id] || 0, badge.skills.length)}{" "}
              of {badge.skills.length} skills cleared
            </strong>
          </div>
          <div className="progress-bar">
            <span
              style={{
                width: `${(Math.min(student.progress[badge.id] || 0, badge.skills.length) / badge.skills.length) * 100}%`,
              }}
            />
          </div>
          <div className="skills">
            {badge.skills.map((skill, i) => (
              <div key={skill}>
                <span
                  className={
                    i < (student.progress[badge.id] || 0)
                      ? "skill-check"
                      : "skill-lock"
                  }
                >
                  {i < (student.progress[badge.id] || 0) ? (
                    <Check size={13} />
                  ) : (
                    <LockKeyhole size={12} />
                  )}
                </span>
                <span>{skill.split(" · ")[0]}</span>
                <span className="skill-level">{skill.split(" · ")[1]}</span>
              </div>
            ))}
          </div>
          <div className="interview-requirement">
            <span className="interview-icon">
              <Video size={18} />
            </span>
            <div>
              <strong>Level Clearance Interview</strong>
              <small>{labels[status]}</small>
            </div>
            <Pill tone={tones[status]}>
              {status === "PASSED" ? "Cleared" : "Required"}
            </Pill>
          </div>
        </section>
        <section className="card next-step">
          <div className="eyebrow">
            <span className="tiny-dot" /> YOUR NEXT MOVE
          </div>
          <h3>{labels[status]}</h3>
          <p>{message(status, badge.track, badge.tier, slot?.start)}</p>
          {slot && ["BOOKED", "AWAITING_RESULT"].includes(status) && (
            <div className="mini-detail">
              <CalendarDays size={18} />
              <div>
                <strong>
                  {date(slot.start)} · {time(slot.start)} IST
                </strong>
                <small>30 minutes · Online interview</small>
              </div>
            </div>
          )}
          <Button onClick={primary}>
            {primaryText}
            <ArrowRight size={16} />
          </Button>
          <div className="next-tip">
            <ShieldCheck size={18} />
            <span>
              {status === "BADGE_INVALIDATED"
                ? "Historical outcomes remain on record."
                : "Your skill progress stays with you, every step of the way."}
            </span>
          </div>
        </section>
      </div>
      <div className="bottom-callout">
        <div className="callout-icon">
          <Globe2 size={28} />
        </div>
        <div>
          <strong>Skills that take you places.</strong>
          <p>
            Build your mastery. Earn your badges. Open a world of possibilities.
          </p>
        </div>
        <span>THE GRIT JOURNEY ↗</span>
      </div>
    </>
  );
}
