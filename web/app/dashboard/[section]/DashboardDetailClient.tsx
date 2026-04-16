"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  analyticsApi,
  authApi,
  type AuthSession,
  type PlayHistoryItem,
  type SpotifyArtist,
  type SpotifyTrack,
  type TimeRange
} from "@/lib/api";
import {
  ArtBlock,
  LISTENING_WINDOWS,
  Sparkline,
  TIME_RANGES,
  deriveListeningWindowMetrics,
  formatDelta,
  formatDuration,
  formatNumber,
  formatRelative,
  pickImage
} from "@/lib/dashboardShared";
import { gradientFor } from "@/lib/placeholderData";

type SectionKey = "artists" | "tracks" | "recently-played" | "listening-activity";

const SECTION_META: Record<SectionKey, { title: string; description: string }> = {
  artists: {
    title: "Top Artists",
    description: "A deeper look at the artists shaping your listening this period."
  },
  tracks: {
    title: "Top Tracks",
    description: "Your most-played favorites for the selected Spotify time range."
  },
  "recently-played": {
    title: "Recently Played",
    description: "The tracks you listened to most recently, in reverse chronological order."
  },
  "listening-activity": {
    title: "Listening Activity",
    description: "Windowed play counts and trend changes across the last hour, day, week, month, and year."
  }
};

function isTimeRange(value: string | null): value is TimeRange {
  return value === "short_term" || value === "medium_term" || value === "long_term";
}

export default function DashboardDetailClient({ section }: { section: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const validSection = section in SECTION_META;
  const typedSection = validSection ? (section as SectionKey) : null;

  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [useTokenFallback, setUseTokenFallback] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<PlayHistoryItem[]>([]);
  const [listeningHistory, setListeningHistory] = useState<PlayHistoryItem[]>([]);
  const [historyTruncated, setHistoryTruncated] = useState(false);

  const requestedTimeRange = searchParams.get("timeRange");
  const timeRange: TimeRange = isTimeRange(requestedTimeRange) ? requestedTimeRange : "medium_term";
  const requestedWindow = searchParams.get("window");
  const selectedWindow = LISTENING_WINDOWS.find((windowDef) => windowDef.key === requestedWindow)?.key ?? "lastDay";

  useEffect(() => {
    const fallbackToken = window.sessionStorage.getItem("spotify_access_token");
    setAccessToken(fallbackToken);

    let cancelled = false;
    authApi
      .session()
      .then((session) => {
        if (cancelled) return;
        setAuth(session);
        setUseTokenFallback(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (fallbackToken) {
          setAuth({ authenticated: true });
          setUseTokenFallback(true);
          return;
        }
        setAuth({ authenticated: false });
        setUseTokenFallback(false);
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!typedSection) {
      setError("That detail page does not exist.");
      setLoading(false);
      return;
    }
    if (authLoading) {
      return;
    }
    if (!auth?.authenticated && !accessToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const tokenForApi = useTokenFallback ? accessToken ?? undefined : undefined;

    const request =
      typedSection === "artists"
        ? analyticsApi.topArtists(timeRange, 50, tokenForApi)
        : typedSection === "tracks"
        ? analyticsApi.topTracks(timeRange, 50, tokenForApi)
        : typedSection === "recently-played"
        ? analyticsApi.recentlyPlayed(50, tokenForApi)
        : analyticsApi.listeningHistory(5000, tokenForApi);

    request
      .then((data) => {
        if (cancelled) return;
        setArtists(typedSection === "artists" ? (data as SpotifyArtist[]) : []);
        setTracks(typedSection === "tracks" ? (data as SpotifyTrack[]) : []);
        setRecentlyPlayed(typedSection === "recently-played" ? (data as PlayHistoryItem[]) : []);
        if (typedSection === "listening-activity") {
          const activityData = data as { history: PlayHistoryItem[]; truncated: boolean };
          setListeningHistory(activityData.history);
          setHistoryTruncated(activityData.truncated);
        } else {
          setListeningHistory([]);
          setHistoryTruncated(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? String(err));
          if (tokenForApi) {
            window.sessionStorage.removeItem("spotify_access_token");
            setAccessToken(null);
            setAuth({ authenticated: false });
            setUseTokenFallback(false);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, auth?.authenticated, authLoading, timeRange, typedSection, useTokenFallback]);

  const userLabel = auth?.profile?.display_name ?? "Your library";
  const initial = userLabel[0]?.toUpperCase() ?? "?";
  const sectionMeta = typedSection ? SECTION_META[typedSection] : null;
  const activityMetrics = useMemo(
    () => deriveListeningWindowMetrics(listeningHistory.map((item) => item.played_at)),
    [listeningHistory]
  );
  const activeMetric = activityMetrics.find((metric) => metric.key === selectedWindow) ?? activityMetrics[0];

  function updateTimeRange(nextTimeRange: TimeRange) {
    const path = `/dashboard/${section}`;
    if (typedSection === "recently-played" || typedSection === "listening-activity") {
      router.push(path);
      return;
    }
    router.push(`${path}?timeRange=${nextTimeRange}`);
  }

  function updateWindow(nextWindow: string) {
    const path = `/dashboard/${section}`;
    router.push(`${path}?window=${nextWindow}`);
  }

  if (authLoading) {
    return <div className="loading">Loading session…</div>;
  }

  if (!auth?.authenticated && !accessToken) {
    return (
      <div className="signin-screen">
        <div className="aurora" aria-hidden />
        <div className="signin-card">
          <div className="signin-badge">
            <span className="brand-dot" />
            Spotify Analytics
          </div>
          <h1>Sign in required</h1>
          <p>Authenticate with Spotify to view your extended listening pages.</p>
          <div className="signin-actions">
            <button
              className="btn"
              onClick={() => {
                window.location.href = authApi.loginUrl;
              }}
            >
              Sign in with Spotify
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="aurora aurora-soft" aria-hidden />

      <header className="header">
        <div>
          <button className="back-link" type="button" onClick={() => router.push("/dashboard")}>
            ← Back to dashboard
          </button>
          <div className="brand" style={{ marginTop: 14 }}>
            <span className="brand-dot" />
            Spotify Analytics
          </div>
        </div>
        <div className="user-chip">
          <div className="avatar">{initial}</div>
          <span>{userLabel}</span>
        </div>
      </header>

      {sectionMeta && (
        <section className="section detail-hero">
          <h2>{sectionMeta.title}</h2>
          <p className="detail-copy">{sectionMeta.description}</p>
        </section>
      )}

      {(typedSection === "artists" || typedSection === "tracks") && (
        <div className="controls">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              className={`btn-ghost ${timeRange === tr.value ? "active" : ""}`}
              onClick={() => updateTimeRange(tr.value)}
            >
              {tr.label}
            </button>
          ))}
        </div>
      )}

      {typedSection === "listening-activity" && (
        <div className="controls">
          {LISTENING_WINDOWS.map((windowDef) => (
            <button
              key={windowDef.key}
              className={`btn-ghost ${selectedWindow === windowDef.key ? "active" : ""}`}
              onClick={() => updateWindow(windowDef.key)}
            >
              {windowDef.label}
            </button>
          ))}
        </div>
      )}

      {error && <div className="error">Failed to load page: {error}</div>}

      {loading && <div className="loading">Loading {sectionMeta?.title.toLowerCase() ?? "details"}…</div>}

      {!loading && typedSection === "artists" && (
        <section className="section">
          <div className="detail-grid">
            {artists.map((artist, index) => (
              <div key={artist.id} className="artist-card detail-artist-card">
                <div className="detail-rank">#{String(index + 1).padStart(2, "0")}</div>
                {artist.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.images[0].url} alt={artist.name} />
                ) : (
                  <div className="artist-art" style={{ backgroundImage: gradientFor(artist.name) }}>
                    <span>
                      {artist.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((word) => word[0]?.toUpperCase() ?? "")
                        .join("")}
                    </span>
                  </div>
                )}
                <div className="name">{artist.name}</div>
                <div className="meta">{formatNumber(artist.followers)} followers</div>
                <div className="chips detail-chip-wrap">
                  {artist.genres.length === 0 ? (
                    <span className="chip chip-muted">No genres surfaced</span>
                  ) : (
                    artist.genres.slice(0, 3).map((genre) => (
                      <span key={`${artist.id}-${genre}`} className="chip">
                        {genre}
                      </span>
                    ))
                  )}
                </div>
                <div className="pop-bar">
                  <div className="pop-bar-fill" style={{ width: `${artist.popularity}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && typedSection === "tracks" && (
        <section className="section">
          <div className="list">
            {tracks.map((track, index) => (
              <div className="list-row track-row detail-list-row" key={track.id}>
                <div className="index">{String(index + 1).padStart(2, "0")}</div>
                <ArtBlock seed={track.album || track.name} imageUrl={pickImage(track.albumImages, 64)} size={52} />
                <div className="track-info">
                  <div className="title">{track.name}</div>
                  <div className="subtitle">
                    {track.artists.map((artist) => artist.name).join(", ")} · {track.album}
                  </div>
                </div>
                <div className="detail-meta-stack">
                  <span className="meta">{formatDuration(track.duration_ms)}</span>
                  <span className="meta">{track.popularity}/100 popularity</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && typedSection === "recently-played" && (
        <section className="section">
          <div className="list">
            {recentlyPlayed.map((item, index) => (
              <div className="list-row track-row detail-list-row" key={`${item.track.id}-${item.played_at}`}>
                <div className="index">{String(index + 1).padStart(2, "0")}</div>
                <ArtBlock
                  seed={item.track.album || item.track.name}
                  imageUrl={pickImage(item.track.albumImages, 64)}
                  size={52}
                />
                <div className="track-info">
                  <div className="title">{item.track.name}</div>
                  <div className="subtitle">
                    {item.track.artists.map((artist) => artist.name).join(", ")} · {item.track.album}
                  </div>
                </div>
                <div className="detail-meta-stack">
                  <span className="meta">{formatRelative(item.played_at)}</span>
                  <span className="meta detail-timestamp">{new Date(item.played_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && typedSection === "listening-activity" && activeMetric && (
        <section className="section">
          {historyTruncated && (
            <div className="banner" style={{ marginTop: 0 }}>
              <strong>Note:</strong>
              Showing the most recent listening history slice due to API limits.
            </div>
          )}
          <div className="activity-focus card">
            <div className="stat-label">{activeMetric.label}</div>
            <div className="stat-value">{formatNumber(activeMetric.count)}</div>
            <div className={`activity-delta ${activeMetric.delta >= 0 ? "up" : "down"}`}>
              {formatDelta(activeMetric.delta, activeMetric.deltaPct)}
            </div>
            <Sparkline points={activeMetric.series} width={760} height={220} />
          </div>
          <div className="activity-grid" style={{ marginTop: 16 }}>
            {activityMetrics.map((metric) => (
              <button
                key={metric.key}
                className={`card activity-card activity-select ${metric.key === selectedWindow ? "active" : ""}`}
                onClick={() => updateWindow(metric.key)}
                type="button"
              >
                <div className="stat-label">{metric.label}</div>
                <div className="stat-value">{formatNumber(metric.count)}</div>
                <div className={`activity-delta ${metric.delta >= 0 ? "up" : "down"}`}>
                  {formatDelta(metric.delta, metric.deltaPct)}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
