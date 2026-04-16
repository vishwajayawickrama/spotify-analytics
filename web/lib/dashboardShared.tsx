"use client";

import { useId } from "react";
import type { AnalyticsSummary, SpotifyImage } from "@/lib/api";
import { gradientFor } from "@/lib/placeholderData";
import { cx } from "@/lib/ui";

export const TIME_RANGES = [
  { value: "short_term", label: "Last 4 weeks" },
  { value: "medium_term", label: "Last 6 months" },
  { value: "long_term", label: "All time" }
] as const;

export type ListeningWindowKey = "lastHour" | "lastDay" | "lastWeek" | "lastMonth" | "lastYear";

export type ListeningSeriesPoint = {
  label: string;
  value: number;
};

export type ListeningWindowMetrics = {
  key: ListeningWindowKey;
  label: string;
  count: number;
  previousCount: number;
  delta: number;
  deltaPct: number | null;
  series: ListeningSeriesPoint[];
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const LISTENING_WINDOWS: Array<{
  key: ListeningWindowKey;
  label: string;
  windowMs: number;
  bucketMs: number;
}> = [
  { key: "lastHour", label: "Last hour", windowMs: HOUR_MS, bucketMs: 5 * 60 * 1000 },
  { key: "lastDay", label: "Last day", windowMs: DAY_MS, bucketMs: HOUR_MS },
  { key: "lastWeek", label: "Last week", windowMs: 7 * DAY_MS, bucketMs: DAY_MS },
  { key: "lastMonth", label: "Last month", windowMs: 30 * DAY_MS, bucketMs: DAY_MS },
  { key: "lastYear", label: "Last year", windowMs: 365 * DAY_MS, bucketMs: 30 * DAY_MS }
];

const labelFormatters: Record<ListeningWindowKey, Intl.DateTimeFormat> = {
  lastHour: new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }),
  lastDay: new Intl.DateTimeFormat(undefined, { hour: "2-digit" }),
  lastWeek: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }),
  lastMonth: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }),
  lastYear: new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" })
};

function buildSeries(
  playedAtMs: number[],
  nowMs: number,
  key: ListeningWindowKey,
  windowMs: number,
  bucketMs: number
) {
  const bucketCount = Math.max(1, Math.ceil(windowMs / bucketMs));
  const start = nowMs - windowMs;
  const values = new Array<number>(bucketCount).fill(0);

  for (const ms of playedAtMs) {
    if (ms < start || ms > nowMs) continue;
    const rawIndex = Math.floor((ms - start) / bucketMs);
    const index = Math.max(0, Math.min(bucketCount - 1, rawIndex));
    values[index] += 1;
  }

  return values.map((value, index) => {
    const bucketEnd = start + (index + 1) * bucketMs;
    return {
      label: labelFormatters[key].format(new Date(bucketEnd)),
      value
    };
  });
}

export function deriveListeningWindowMetrics(historyIso: string[]): ListeningWindowMetrics[] {
  const nowMs = Date.now();
  const playedAtMs = historyIso
    .map((iso) => Date.parse(iso))
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);

  return LISTENING_WINDOWS.map((windowDef) => {
    const { key, label, windowMs, bucketMs } = windowDef;
    const currentStart = nowMs - windowMs;
    const previousStart = nowMs - 2 * windowMs;

    let count = 0;
    let previousCount = 0;
    for (const ms of playedAtMs) {
      if (ms >= currentStart && ms <= nowMs) {
        count += 1;
      } else if (ms >= previousStart && ms < currentStart) {
        previousCount += 1;
      }
    }

    const delta = count - previousCount;
    const deltaPct = previousCount > 0 ? (delta / previousCount) * 100 : null;

    return {
      key,
      label,
      count,
      previousCount,
      delta,
      deltaPct,
      series: buildSeries(playedAtMs, nowMs, key, windowMs, bucketMs)
    };
  });
}

export function formatDelta(delta: number, deltaPct: number | null) {
  const sign = delta > 0 ? "+" : "";
  if (deltaPct === null) {
    return `${sign}${delta} vs previous`;
  }
  const pct = Math.abs(deltaPct).toFixed(1);
  return `${sign}${delta} (${pct}%)`;
}

export function Sparkline({
  points,
  width = 180,
  height = 54
}: {
  points: ListeningSeriesPoint[];
  width?: number;
  height?: number;
}) {
  if (points.length === 0) {
    return <div className="mt-2 text-xs text-[color:var(--fg-muted)]">No data</div>;
  }

  const chartId = useId();
  const paddingTop = 14;
  const paddingRight = 10;
  const paddingBottom = 34;
  const paddingLeft = 10;
  const chartWidth = Math.max(1, width - paddingLeft - paddingRight);
  const chartHeight = Math.max(1, height - paddingTop - paddingBottom);
  const maxY = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

  const chartPoints = points.map((point, index) => {
    const x = paddingLeft + index * step;
    const y = paddingTop + chartHeight - (point.value / maxY) * chartHeight;
    return { ...point, x, y };
  });

  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${paddingLeft + chartWidth} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`;

  const gridSteps = 4;
  const yTicks = Array.from({ length: gridSteps }, (_, index) => {
    const ratio = index / (gridSteps - 1);
    const value = Math.round(maxY * (1 - ratio));
    const y = paddingTop + chartHeight * ratio;
    return { value, y };
  });

  const xTickIndexes = Array.from(
    new Set([0, Math.floor((points.length - 1) / 2), points.length - 1].filter((index) => index >= 0))
  );
  const xTicks = xTickIndexes.map((index) => chartPoints[index]);

  const latestPoint = chartPoints[chartPoints.length - 1];
  const peakPoint = chartPoints.reduce((currentPeak, point) =>
    point.value > currentPeak.value ? point : currentPeak
  );
  const activeBuckets = points.filter((point) => point.value > 0).length;
  const averagePerBucket = points.reduce((sum, point) => sum + point.value, 0) / points.length;

  return (
    <div className="flex flex-col gap-3.5">
      <svg className="block h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`${chartId}-line`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
          <linearGradient id={`${chartId}-area`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(92, 225, 255, 0.34)" />
            <stop offset="100%" stopColor="rgba(29, 185, 84, 0.02)" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={`y-${tick.y}`}>
            <line x1={paddingLeft} y1={tick.y} x2={paddingLeft + chartWidth} y2={tick.y} />
            <text
              x={width - 2}
              y={tick.y - 4}
              textAnchor="end"
              className="fill-[rgba(214,226,219,0.72)] text-[11px] font-bold tracking-[0.03em]"
            >
              {tick.value}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${chartId}-area)`} className="opacity-95" />
        <path
          d={linePath}
          stroke={`url(#${chartId}-line)`}
          className="fill-none stroke-[3] [filter:drop-shadow(0_0_10px_rgba(92,225,255,0.18))]"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {peakPoint.value > 0 && (
          <g>
            <circle
              cx={peakPoint.x}
              cy={peakPoint.y}
              r="4.5"
              className="fill-[color:var(--accent)] stroke-[rgba(7,9,10,0.95)] [stroke-width:2]"
            />
            <text
              x={peakPoint.x}
              y={peakPoint.y - 12}
              textAnchor="middle"
              className="fill-[rgba(214,226,219,0.72)] text-[11px] font-bold tracking-[0.03em] [paint-order:stroke] [stroke-linejoin:round] [stroke-width:3px] stroke-[rgba(7,9,10,0.92)]"
            >
              Peak {peakPoint.value}
            </text>
          </g>
        )}

        <g>
          <circle
            cx={latestPoint.x}
            cy={latestPoint.y}
            r="4.5"
            className="fill-[color:var(--accent-2)] stroke-[rgba(7,9,10,0.95)] [stroke-width:2]"
          />
          <text
            x={latestPoint.x}
            y={latestPoint.y - 12}
            textAnchor="middle"
            className="fill-[rgba(214,226,219,0.72)] text-[11px] font-bold tracking-[0.03em] [paint-order:stroke] [stroke-linejoin:round] [stroke-width:3px] stroke-[rgba(7,9,10,0.92)]"
          >
            Now {latestPoint.value}
          </text>
        </g>

        {xTicks.map((tick) => (
          <g key={`x-${tick.label}-${tick.x}`}>
            <line
              x1={tick.x}
              y1={paddingTop + chartHeight}
              x2={tick.x}
              y2={paddingTop + chartHeight + 6}
              className="stroke-white/10"
            />
            <text
              x={tick.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-[rgba(214,226,219,0.72)] text-[11px] font-bold tracking-[0.03em]"
            >
              {tick.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap gap-2.5" aria-hidden>
        <div className="min-w-[120px] rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">
            Peak bucket
          </span>
          <strong className="mt-1 block text-lg font-bold tracking-[-0.02em] text-[color:var(--fg)]">
            {peakPoint.value}
          </strong>
        </div>
        <div className="min-w-[120px] rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">
            Avg / bucket
          </span>
          <strong className="mt-1 block text-lg font-bold tracking-[-0.02em] text-[color:var(--fg)]">
            {averagePerBucket.toFixed(1)}
          </strong>
        </div>
        <div className="min-w-[120px] rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">
            Active buckets
          </span>
          <strong className="mt-1 block text-lg font-bold tracking-[-0.02em] text-[color:var(--fg)]">
            {activeBuckets}
          </strong>
        </div>
      </div>
    </div>
  );
}

export function formatDuration(ms: number) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function deriveTopGenres(summary: AnalyticsSummary) {
  if (summary.topGenres.length > 0) {
    return summary.topGenres;
  }

  const genreCounts = new Map<string, number>();
  summary.topArtists.forEach((artist) => {
    artist.genres.forEach((genre) => {
      const normalized = genre.trim();
      if (!normalized) return;
      genreCounts.set(normalized, (genreCounts.get(normalized) ?? 0) + 1);
    });
  });

  return [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([genre]) => genre);
}

export function deriveAveragePopularity(summary: AnalyticsSummary) {
  const tracksWithPopularity = summary.topTracks.filter((track) => track.popularity > 0);
  if (tracksWithPopularity.length === 0) {
    return Math.max(0, Math.round(Number(summary.averageTrackPopularity) || 0));
  }

  const total = tracksWithPopularity.reduce((acc, track) => acc + track.popularity, 0);
  return Math.round(total / tracksWithPopularity.length);
}

export function pickImage(images: SpotifyImage[] | undefined, target = 56) {
  if (!images || images.length === 0) return undefined;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((im) => (im.width ?? 0) >= target) ?? sorted[sorted.length - 1]).url;
}

export function ArtBlock({
  seed,
  size = 56,
  imageUrl
}: {
  seed: string;
  size?: number;
  imageUrl?: string;
}) {
  const initials = seed
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (imageUrl) {
    return (
      <img
        className="grid shrink-0 place-items-center rounded-lg font-extrabold text-white/95 [text-shadow:0_2px_8px_rgba(0,0,0,0.4)]"
        src={imageUrl}
        alt={seed}
        style={{ width: size, height: size, objectFit: "cover" }}
      />
    );
  }

  return (
    <div
      className={cx(
        "grid shrink-0 place-items-center rounded-lg font-extrabold text-white/95 [text-shadow:0_2px_8px_rgba(0,0,0,0.4)]",
        size <= 52 ? "text-base" : "text-lg"
      )}
      style={{
        width: size,
        height: size,
        backgroundImage: gradientFor(seed)
      }}
    >
      {initials}
    </div>
  );
}
