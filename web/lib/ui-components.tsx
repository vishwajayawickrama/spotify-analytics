import type { ReactNode } from "react";
import { ArtBlock } from "@/lib/dashboardShared";
import { aurora, brandDot, cardBase, cx, elevatedCard, ghostButton, primaryButton, sectionTitle } from "@/lib/ui";

type AuthScreenProps = {
  title: string;
  description: string;
  buttonLabel: string;
  onSubmit: () => void;
  buttonDisabled?: boolean;
  footer?: ReactNode;
  titleAccent?: ReactNode;
};

export function AuthScreen({
  title,
  description,
  buttonLabel,
  onSubmit,
  buttonDisabled = false,
  footer,
  titleAccent
}: AuthScreenProps) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-6">
      <div className={aurora} aria-hidden />
      <div className={`${elevatedCard} relative max-w-[480px] px-11 py-12 text-center sm:px-7 sm:py-9`}>
        <div className="mb-[22px] inline-flex items-center gap-2.5 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[color:var(--fg-muted)]">
          <span className={brandDot} />
          Spotify Analytics
        </div>
        <h1 className="mb-4 text-[38px] font-extrabold leading-tight tracking-[-0.02em] sm:text-3xl">
          {title}
          {titleAccent}
        </h1>
        <p className="mb-7 text-[15px] leading-7 text-[color:var(--fg-muted)]">{description}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:flex-col sm:items-stretch">
          <button className={primaryButton} onClick={onSubmit} disabled={buttonDisabled}>
            {buttonLabel}
          </button>
        </div>
        {footer ? <div className="mt-[18px] text-xs text-[color:var(--fg-dim)]">{footer}</div> : null}
      </div>
    </div>
  );
}

type AppHeaderProps = {
  brand: ReactNode;
  userLabel: string;
  initial: string;
  backLabel?: string;
  onBack?: () => void;
  action?: ReactNode;
};

export function AppHeader({ brand, userLabel, initial, backLabel, onBack, action }: AppHeaderProps) {
  return (
    <header className="mb-7 flex flex-wrap items-center justify-between gap-4 sm:mb-5 sm:items-stretch sm:gap-3">
      <div>
        {backLabel && onBack ? (
          <button
            className="p-0 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--fg-muted)] transition hover:text-[color:var(--accent)]"
            type="button"
            onClick={onBack}
          >
            {backLabel}
          </button>
        ) : null}
        <div className={cx("flex items-center gap-3 text-xl font-bold tracking-[-0.01em] sm:text-lg", backLabel ? "mt-3.5" : "")}>
          <span className={brandDot} />
          {brand}
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-[14px] py-[6px] text-sm backdrop-blur-[8px] sm:w-full sm:justify-between sm:pr-[10px]">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent),#0ea05a)] font-extrabold text-black">
          {initial}
        </div>
        <span>{userLabel}</span>
        {action}
      </div>
    </header>
  );
}

type SegmentedControlsProps<T extends string> = {
  items: Array<{ value: T; label: string }>;
  activeValue: T;
  onChange: (value: T) => void;
};

export function SegmentedControls<T extends string>({
  items,
  activeValue,
  onChange
}: SegmentedControlsProps<T>) {
  return (
    <div className="mt-1 flex flex-wrap gap-2 sm:-mr-[18px] sm:flex-nowrap sm:overflow-x-auto sm:pr-[18px] sm:[scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => (
        <button
          key={item.value}
          className={cx(ghostButton(activeValue === item.value), "sm:flex-none sm:whitespace-nowrap")}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:gap-2">
      <h2 className={sectionTitle}>{title}</h2>
      {actionLabel && onAction ? (
        <button
          className="rounded-md bg-transparent px-2 py-1 text-xs font-semibold tracking-[0.04em] text-[color:var(--fg-muted)] transition hover:translate-x-0.5 hover:bg-[rgba(29,185,84,0.08)] hover:text-[color:var(--accent)]"
          type="button"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

type MediaListItem = {
  key: string;
  index: number;
  title: string;
  subtitle: string;
  imageSeed: string;
  imageUrl?: string;
  imageSize?: number;
  trailing?: ReactNode;
  trailingStack?: ReactNode;
};

type MediaListProps = {
  items: MediaListItem[];
  compactOnMobile?: boolean;
};

export function MediaList({ items, compactOnMobile = false }: MediaListProps) {
  return (
    <div className={cx(cardBase, "overflow-hidden")}>
      {items.map((item) => (
        <div
          className={cx(
            "grid items-center gap-4 border-b border-[color:var(--border)] px-[18px] py-3 text-sm transition last:border-b-0 hover:bg-[color:var(--bg-card-hover)]",
            compactOnMobile
              ? "grid-cols-[28px_52px_minmax(0,1fr)_auto] max-sm:grid-cols-[24px_44px_minmax(0,1fr)] max-sm:gap-2.5 max-sm:px-3 max-sm:py-2.5"
              : "grid-cols-[28px_48px_minmax(0,1fr)_auto] max-sm:grid-cols-[24px_44px_minmax(0,1fr)_auto] max-sm:gap-2.5 max-sm:px-3.5 max-sm:py-2.5"
          )}
          key={item.key}
        >
          <div className="text-[13px] font-semibold tabular-nums text-[color:var(--fg-dim)]">
            {String(item.index + 1).padStart(2, "0")}
          </div>
          <ArtBlock
            seed={item.imageSeed}
            imageUrl={item.imageUrl}
            size={item.imageSize ?? (compactOnMobile ? 52 : 48)}
          />
          <div className="min-w-0">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold max-sm:whitespace-normal">
              {item.title}
            </div>
            <div className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[color:var(--fg-muted)] max-sm:whitespace-normal">
              {item.subtitle}
            </div>
          </div>
          {item.trailingStack ? (
            <div className="flex flex-col items-end gap-1 max-sm:col-[3/-1] max-sm:mt-0.5 max-sm:items-start">
              {item.trailingStack}
            </div>
          ) : (
            <div className="text-xs tabular-nums text-[color:var(--fg-muted)]">{item.trailing}</div>
          )}
        </div>
      ))}
    </div>
  );
}
