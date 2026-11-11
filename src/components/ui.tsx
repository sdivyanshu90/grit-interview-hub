import type { ReactNode } from "react";
import { X, ArrowUpRight, Award } from "lucide-react";
export function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  danger = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  danger?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`button ${secondary ? "secondary" : ""} ${danger ? "danger" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const els = e.currentTarget.querySelectorAll<HTMLElement>(
              "button:not(:disabled), input, select, textarea",
            );
            const first = els[0],
              last = els[els.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header>
          <h2>{title}</h2>
          <button
            autoFocus
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function BadgeArt({
  earned = false,
  invalid = false,
  small = false,
  tier = "Novice",
}: {
  earned?: boolean;
  invalid?: boolean;
  small?: boolean;
  tier?: string;
}) {
  return (
    <div
      className={`badge-art ${earned ? "earned" : ""} ${invalid ? "invalid" : ""} ${small ? "small" : ""}`}
    >
      <div className="badge-orbit" />
      <div className="badge-shield">
        <Award size={small ? 30 : 56} strokeWidth={1.3} />
        <span>GRIT</span>
      </div>
      {!small && (
        <div className="badge-ribbon">
          {tier.toUpperCase().split("").join(" ")}
        </div>
      )}
    </div>
  );
}
export function LinkArrow() {
  return <ArrowUpRight size={16} />;
}
