"use client";

import type { AnalyticsSummary, SpotifyImage } from "@/lib/api";
import { gradientFor } from "@/lib/placeholderData";

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
    return <div className="sparkline-empty">No data</div>;
  }

  const maxY = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const polyline = points
    .map((p, index) => {
      const x = index * step;
      const y = height - (p.value / maxY) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
      <polyline points={polyline} />
    </svg>
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
        className="art-block"
        src={imageUrl}
        alt={seed}
        style={{ width: size, height: size, objectFit: "cover" }}
      />
    );
  }

  return (
    <div
      className="art-block"
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
