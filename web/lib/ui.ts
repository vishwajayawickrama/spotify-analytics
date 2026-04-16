export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const pageShell =
  "relative mx-auto max-w-[1180px] px-7 pb-24 pt-9 sm:px-5 sm:pb-20 sm:pt-6";

export const aurora =
  "pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(600px_400px_at_20%_20%,rgba(29,185,84,0.18),transparent_60%),radial-gradient(500px_380px_at_80%_30%,rgba(92,225,255,0.12),transparent_60%),radial-gradient(700px_500px_at_60%_90%,rgba(149,76,233,0.10),transparent_60%)] blur-[20px]";

export const auroraSoft = "opacity-55";

export const cardBase =
  "rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] shadow-card";

export const elevatedCard =
  "rounded-[22px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(20,26,29,0.85),rgba(20,26,29,0.6))] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-[20px]";

export const sectionTitle =
  "text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--fg-muted)]";

export const statLabel =
  "mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--fg-muted)]";

export const statValue =
  "flex items-baseline gap-1 text-[28px] font-bold tracking-[-0.02em] text-[color:var(--fg)] sm:text-2xl";

export const statSub = "mt-2 text-xs leading-5 text-[color:var(--fg-dim)]";

export const brandDot =
  "h-3 w-3 rounded-full bg-[color:var(--accent)] shadow-[0_0_0_4px_rgba(29,185,84,0.12),0_0_18px_var(--accent)]";

export const primaryButton =
  "inline-flex items-center justify-center rounded-full border-0 bg-[color:var(--accent)] px-7 py-3.5 text-[15px] font-bold text-black shadow-[0_8px_24px_rgba(29,185,84,0.35)] transition hover:-translate-y-0.5 hover:bg-[color:var(--accent-hover)] hover:shadow-[0_12px_30px_rgba(29,185,84,0.45)] disabled:cursor-default disabled:opacity-60 disabled:shadow-none";

export function ghostButton(active = false) {
  return cx(
    "inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-[13px] transition",
    active
      ? "border-[color:var(--accent)] bg-[color:var(--bg-elevated)] text-[color:var(--fg)]"
      : "border-[color:var(--border)] bg-transparent text-[color:var(--fg-muted)] hover:border-[color:var(--fg-muted)] hover:bg-white/[0.02] hover:text-[color:var(--fg)]"
  );
}

export const banner =
  "rounded-xl border border-[rgba(92,225,255,0.25)] bg-[linear-gradient(135deg,rgba(92,225,255,0.06),rgba(29,185,84,0.06))] px-[18px] py-[14px] text-sm text-[color:var(--fg)]";

export const errorBanner =
  "my-4 rounded-xl border border-[color:var(--danger)] bg-[rgba(241,90,90,0.08)] px-[18px] py-[14px] text-sm text-[color:var(--danger)]";

export const loadingState = "py-[60px] text-center text-[color:var(--fg-muted)]";
