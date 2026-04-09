"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  analyticsApi,
  type AnalyticsSummary,
  type TimeRange
} from "@/lib/api";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "short_term", label: "Last 4 weeks" },
  { value: "medium_term", label: "Last 6 months" },
  { value: "long_term", label: "All time" }
];

function formatDuration(ms: number) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatRelative(iso: string) {
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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const sessionError = (session as any)?.error as string | undefined;

  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bounce unauthenticated users back to the sign-in landing.
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  // Fetch (and re-fetch) the analytics summary whenever the token or
  // selected time range changes.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyticsApi
      .summary(accessToken, timeRange)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, timeRange]);

  const initial = useMemo(
    () => summary?.profile.display_name?.[0]?.toUpperCase() ?? "?",
    [summary]
  );

  if (status === "loading" || !session) {
    return <div className="loading">Loading session…</div>;
  }

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <span className="brand-dot" />
          Spotify Analytics
        </div>
        <div className="user-chip">
          <div className="avatar">{initial}</div>
          <span>{summary?.profile.display_name ?? "…"}</span>
          <button
            className="btn-ghost"
            style={{ marginLeft: 8 }}
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign out
          </button>
        </div>
      </header>

      {sessionError === "RefreshAccessTokenError" && (
        <div className="error">
          Your Spotify session expired. Please sign out and sign in again.
        </div>
      )}

      <div className="controls">
        {TIME_RANGES.map((tr) => (
          <button
            key={tr.value}
            className={`btn-ghost ${timeRange === tr.value ? "active" : ""}`}
            onClick={() => setTimeRange(tr.value)}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {error && <div className="error">Failed to load analytics: {error}</div>}

      {loading && !summary && <div className="loading">Loading analytics…</div>}

      {summary && (
        <>
          <section className="section">
            <h2>Overview</h2>
            <div className="stats-grid">
              <div className="card">
                <div className="stat-label">Followers</div>
                <div className="stat-value">{summary.profile.followers}</div>
              </div>
              <div className="card">
                <div className="stat-label">Country</div>
                <div className="stat-value">{summary.profile.country || "—"}</div>
              </div>
              <div className="card">
                <div className="stat-label">Subscription</div>
                <div className="stat-value" style={{ textTransform: "capitalize" }}>
                  {summary.profile.product || "—"}
                </div>
              </div>
              <div className="card">
                <div className="stat-label">Avg track popularity</div>
                <div className="stat-value">
                  {Math.round(Number(summary.averageTrackPopularity))}
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <h2>Top Genres</h2>
            <div className="chips">
              {summary.topGenres.length === 0 && (
                <span className="meta" style={{ color: "var(--fg-muted)" }}>
                  No genre data for this range.
                </span>
              )}
              {summary.topGenres.map((g) => (
                <span key={g} className="chip">
                  {g}
                </span>
              ))}
            </div>
          </section>

          <section className="section">
            <h2>Top Artists</h2>
            <div className="row">
              {summary.topArtists.map((a) => (
                <div key={a.id} className="artist-card">
                  {a.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.images[0].url} alt={a.name} />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        background: "#222",
                        borderRadius: 10
                      }}
                    />
                  )}
                  <div className="name">{a.name}</div>
                  <div className="meta">
                    {a.followers.toLocaleString()} followers · pop {a.popularity}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="section">
            <h2>Top Tracks</h2>
            <div className="list">
              {summary.topTracks.map((t, i) => (
                <div className="list-row" key={t.id}>
                  <div className="index">{i + 1}</div>
                  <div>
                    <div className="title">{t.name}</div>
                    <div className="subtitle">
                      {t.artists.map((ar) => ar.name).join(", ")} · {t.album}
                    </div>
                  </div>
                  <div className="meta">{formatDuration(t.duration_ms)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="section">
            <h2>Recently Played</h2>
            <div className="list">
              {summary.recentlyPlayed.map((p, i) => (
                <div className="list-row" key={`${p.track.id}-${p.played_at}`}>
                  <div className="index">{i + 1}</div>
                  <div>
                    <div className="title">{p.track.name}</div>
                    <div className="subtitle">
                      {p.track.artists.map((ar) => ar.name).join(", ")}
                    </div>
                  </div>
                  <div className="meta">{formatRelative(p.played_at)}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
