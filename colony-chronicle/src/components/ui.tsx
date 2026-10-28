import type { ReactNode } from "react";

export function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-lg border border-line bg-surface/70 ${className}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h2 className="text-sm font-medium tracking-wide text-accent">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** A labelled meter. `tone` carries the meaning; the number stays visible. */
export function Meter({
  label,
  value,
  max = 100,
  tone = "accent",
  hint,
}: {
  label: string;
  value: number;
  max?: number;
  tone?: "accent" | "good" | "warn" | "danger" | "water";
  hint?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1e-6)) * 100));
  const fill = {
    accent: "var(--accent)",
    good: "var(--good)",
    warn: "var(--warn)",
    danger: "var(--danger)",
    water: "var(--water)",
  }[tone];
  return (
    <div title={hint}>
      <div className="flex items-baseline justify-between gap-1 text-[11px] text-muted">
        <span>{label}</span>
        <span className="font-mono text-foreground/80">{Math.round(value)}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-black/40">
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: fill }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col" title={hint}>
      <span className="text-[11px] text-muted">{label}</span>
      <span className="font-mono text-sm text-foreground">{value}</span>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
        active
          ? "border-accent/70 bg-accent/20 text-accent"
          : "border-line text-muted hover:border-accent/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function Button({
  onClick,
  disabled,
  children,
  title,
  variant = "plain",
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  title?: string;
  variant?: "plain" | "primary";
}) {
  const look =
    variant === "primary"
      ? "border-accent/60 bg-accent/15 text-accent hover:bg-accent/25"
      : "border-line text-foreground/85 hover:border-accent/40 hover:text-accent";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded border px-2.5 py-1 text-xs transition-colors disabled:opacity-35 disabled:hover:border-line disabled:hover:text-foreground/85 ${look}`}
    >
      {children}
    </button>
  );
}
