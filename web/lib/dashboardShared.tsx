"use client";

import type { AnalyticsSummary, SpotifyImage } from "@/lib/api";
import { gradientFor } from "@/lib/placeholderData";

export const TIME_RANGES = [
  { value: "short_term", label: "Last 4 weeks" },
  { value: "medium_term", label: "Last 6 months" },
  { value: "long_term", label: "All time" }
] as const;

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
