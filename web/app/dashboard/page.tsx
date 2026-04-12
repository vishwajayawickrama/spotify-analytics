"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import {
  analyticsApi,
  type AnalyticsSummary,
  type TimeRange
} from "@/lib/api";
import { gradientFor, placeholderSummary } from "@/lib/placeholderData";

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

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

// Square block used as a stand-in for album / artist art when no real
// image URL is available. Uses a deterministic gradient + initials so the
// demo dashboard renders cleanly without external requests.
function ArtBlock({ seed, size = 56 }: { seed: string; size?: number }) {
  const initials = seed
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const sessionError = (session as any)?.error as string | undefined;

  // Demo mode: render placeholder data whenever there's no real Spotify
  // access token. This lets the dashboard be browsed without signing in.
  const isDemo = !accessToken;

  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(
    isDemo ? placeholderSummary : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the real analytics summary when (and only when) the user is
  // signed in. In demo mode, the placeholder summary is used directly.
  useEffect(() => {
    if (!accessToken) {
      setSummary(placeholderSummary);
      return;
    }
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

  // Listener-focused stats derived from the summary. These describe the
  // user's listening behavior, not the artists themselves.
  const listenerStats = useMemo(() => {
    if (!summary) return null;
    const topArtist = summary.topArtists[0];
    const topGenre = summary.topGenres[0];
    const tracks = summary.topTracks;
    const avgDurationMs = tracks.length
      ? tracks.reduce((acc, t) => acc + t.duration_ms, 0) / tracks.length
      : 0;
    const avgPopularity = Math.round(Number(summary.averageTrackPopularity));
    // Lower popularity = more obscure taste. Map [0..100] -> obscure..mainstream.
    const tasteLabel =
      avgPopularity >= 75
        ? "Mainstream"
        : avgPopularity >= 55
        ? "Balanced"
        : avgPopularity >= 35
        ? "Eclectic"
        : "Underground";
    const uniqueAlbums = new Set(tracks.map((t) => t.album)).size;
    return {
      topArtist,
      topGenre,
      avgDurationMs,
      avgPopularity,
      tasteLabel,
      uniqueAlbums,
      trackCount: tracks.length,
      artistCount: summary.topArtists.length
    };
  }, [summary]);

  if (status === "loading") {
    return <div className="loading">Loading session…</div>;
  }

  return (
    <div className="page">
      <div className="aurora aurora-soft" aria-hidden />

      <header className="header">
        <div className="brand">
          <span className="brand-dot" />
          Spotify Analytics
          {isDemo && <span className="demo-pill">DEMO</span>}
        </div>
        <div className="user-chip">
          <div className="avatar">{initial}</div>
          <span>{summary?.profile.display_name ?? "…"}</span>
          {isDemo ? (
            <button
              className="btn-ghost"
              style={{ marginLeft: 8 }}
              onClick={() => signIn("spotify", { callbackUrl: "/dashboard" })}
            >
              Sign in
            </button>
          ) : (
            <button
              className="btn-ghost"
              style={{ marginLeft: 8 }}
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      {isDemo && (
        <div className="banner">
          <strong>Demo mode.</strong> You're viewing example data. Sign in
          with Spotify to see your own listening history.
        </div>
      )}

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
            <h2>Your Listening</h2>
            <div className="stats-grid">
              <div className="card stat-card">
                <div className="stat-label">Most listened artist</div>
                <div className="stat-value stat-value-lg">
                  {listenerStats?.topArtist?.name ?? "—"}
                </div>
                <div className="stat-sub">
                  #1 in your rotation this period
                </div>
              </div>

              <div className="card stat-card">
                <div className="stat-label">Top genre</div>
                <div className="stat-value stat-value-lg">
                  {listenerStats?.topGenre ?? "—"}
                </div>
                <div className="stat-sub">
                  Across {listenerStats?.artistCount ?? 0} top artists
                </div>
              </div>

              <div className="card stat-card">
                <div className="stat-label">Avg track length</div>
                <div className="stat-value">
                  {formatDuration(listenerStats?.avgDurationMs ?? 0)}
                  <span className="stat-suffix">min</span>
                </div>
                <div className="stat-sub">
                  From your {listenerStats?.trackCount ?? 0} top tracks
                </div>
              </div>

              <div className="card stat-card">
                <div className="stat-label">Taste profile</div>
                <div className="stat-value stat-value-lg">
                  {listenerStats?.tasteLabel ?? "—"}
                </div>
                <div className="stat-bar">
                  <div
                    className="stat-bar-fill"
                    style={{ width: `${listenerStats?.avgPopularity ?? 0}%` }}
                  />
                </div>
                <div className="stat-sub">
                  {listenerStats?.avgPopularity ?? 0}/100 mainstream score
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
              {summary.topGenres.map((g, i) => (
                <span key={g} className="chip" style={{ animationDelay: `${i * 30}ms` }}>
                  {g}
                </span>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Top Artists</h2>
              <button
                className="see-more"
                type="button"
                onClick={() => {
                  /* TODO: navigate to /artists once that page exists */
                }}
              >
                See more →
              </button>
            </div>
            <div className="row row-scroll">
              {summary.topArtists.map((a) => (
                <div key={a.id} className="artist-card">
                  {a.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.images[0].url} alt={a.name} />
                  ) : (
                    <div
                      className="artist-art"
                      style={{ backgroundImage: gradientFor(a.name) }}
                    >
                      <span>
                        {a.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0]?.toUpperCase() ?? "")
                          .join("")}
                      </span>
                    </div>
                  )}
                  <div className="name">{a.name}</div>
                  <div className="meta">
                    {formatNumber(a.followers)} followers
                  </div>
                  <div className="pop-bar">
                    <div
                      className="pop-bar-fill"
                      style={{ width: `${a.popularity}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="split">
            <section className="section">
              <div className="section-head">
                <h2>Top Tracks</h2>
                <button className="see-more" type="button">
                  See more →
                </button>
              </div>
              <div className="list">
                {summary.topTracks.map((t, i) => (
                  <div className="list-row track-row" key={t.id}>
                    <div className="index">{String(i + 1).padStart(2, "0")}</div>
                    <ArtBlock seed={t.album || t.name} />
                    <div className="track-info">
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
              <div className="section-head">
                <h2>Recently Played</h2>
                <button className="see-more" type="button">
                  See more →
                </button>
              </div>
              <div className="list">
              {summary.recentlyPlayed.map((p, i) => (
                <div className="list-row track-row" key={`${p.track.id}-${p.played_at}`}>
                  <div className="index">{String(i + 1).padStart(2, "0")}</div>
                  <ArtBlock seed={p.track.album || p.track.name} />
                  <div className="track-info">
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
          </div>

          <footer className="footer">
            Built with Next.js + Ballerina · {isDemo ? "Demo data" : "Live data via Spotify Web API"}
          </footer>
        </>
      )}
    </div>
  );
}
