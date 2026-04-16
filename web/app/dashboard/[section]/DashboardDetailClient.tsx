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
import {
  aurora,
  auroraSoft,
  banner,
  cardBase,
  cx,
  errorBanner,
  loadingState,
  pageShell,
  sectionTitle,
  statLabel,
  statValue
} from "@/lib/ui";
import {
  AppHeader,
  AuthScreen,
  MediaList,
  SegmentedControls
} from "@/lib/ui-components";

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
        : analyticsApi.listeningHistory(20000, tokenForApi);

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
    return <div className={loadingState}>Loading session…</div>;
  }

  if (!auth?.authenticated && !accessToken) {
    return (
      <AuthScreen
        title="Sign in required"
        description="Authenticate with Spotify to view your extended listening pages."
        buttonLabel="Sign in with Spotify"
        onSubmit={() => {
          window.location.href = authApi.loginUrl;
        }}
      />
    );
  }

  return (
    <div className={pageShell}>
      <div className={cx(aurora, auroraSoft)} aria-hidden />

      <AppHeader
        brand="Spotify Analytics"
        userLabel={userLabel}
        initial={initial}
        backLabel="← Back to dashboard"
        onBack={() => router.push("/dashboard")}
      />

      {sectionMeta && (
        <section className="mt-7">
          <h2 className={sectionTitle}>{sectionMeta.title}</h2>
          <p className="mt-4 max-w-[680px] text-[15px] leading-7 text-[color:var(--fg-muted)] sm:text-sm">
            {sectionMeta.description}
          </p>
        </section>
      )}

      {(typedSection === "artists" || typedSection === "tracks") && (
        <SegmentedControls
          items={TIME_RANGES.map((tr) => ({ value: tr.value, label: tr.label }))}
          activeValue={timeRange}
          onChange={updateTimeRange}
        />
      )}

      {typedSection === "listening-activity" && (
        <SegmentedControls
          items={LISTENING_WINDOWS.map((windowDef) => ({ value: windowDef.key, label: windowDef.label }))}
          activeValue={selectedWindow}
          onChange={updateWindow}
        />
      )}

      {error && <div className={errorBanner}>Failed to load page: {error}</div>}

      {loading && <div className={loadingState}>Loading {sectionMeta?.title.toLowerCase() ?? "details"}…</div>}

      {!loading && typedSection === "artists" && (
        <section className="mt-11 sm:mt-7">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[18px] sm:grid-cols-1 sm:gap-3">
            {artists.map((artist, index) => (
              <div
                key={artist.id}
                className={cx(
                  cardBase,
                  "flex flex-col gap-2.5 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] sm:flex-row sm:items-center sm:gap-2.5 sm:p-3"
                )}
              >
                <div className="relative min-w-0 sm:w-[76px] sm:flex-none">
                  <div className="absolute left-2 top-2 z-[1] rounded-full border border-white/10 bg-[rgba(7,9,10,0.72)] px-2 py-[3px] text-xs font-bold text-[color:var(--fg-dim)] backdrop-blur-[8px]">
                    #{String(index + 1).padStart(2, "0")}
                  </div>
                  {artist.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.images[0].url}
                      alt={artist.name}
                      className="w-full rounded-xl bg-[#222] object-cover aspect-square sm:h-[76px] sm:w-[76px]"
                    />
                  ) : (
                    <div
                      className="grid aspect-square w-full place-items-center rounded-xl bg-[#222] text-4xl font-extrabold tracking-[-0.02em] text-white/90 [text-shadow:0_2px_12px_rgba(0,0,0,0.4)] sm:h-[76px] sm:w-[76px] sm:text-[20px]"
                      style={{ backgroundImage: gradientFor(artist.name) }}
                    >
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
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-bold text-[color:var(--fg)] sm:mt-0 sm:text-[13px]">
                    {artist.name}
                  </div>
                  <div className="text-xs text-[color:var(--fg-muted)] sm:text-[11px]">
                    {formatNumber(artist.followers)} followers
                  </div>
                  <div className="min-h-[34px] flex flex-wrap gap-2 sm:gap-1.5">
                    {artist.genres.length === 0 ? (
                      <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-[7px] text-xs font-medium text-[color:var(--fg-muted)] sm:px-2.5 sm:py-[5px] sm:text-[11px]">
                        No genres surfaced
                      </span>
                    ) : (
                      artist.genres.slice(0, 3).map((genre) => (
                        <span
                          key={`${artist.id}-${genre}`}
                          className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-[7px] text-xs font-medium text-[color:var(--fg)] sm:px-2.5 sm:py-[5px] sm:text-[11px]"
                        >
                          {genre}
                        </span>
                      ))
                    )}
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-hover))]"
                      style={{ width: `${artist.popularity}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && typedSection === "tracks" && (
        <section className="mt-11 sm:mt-7">
          <MediaList
            compactOnMobile
            items={tracks.map((track, index) => ({
              key: track.id,
              index,
              title: track.name,
              subtitle: `${track.artists.map((artist) => artist.name).join(", ")} · ${track.album}`,
              imageSeed: track.album || track.name,
              imageUrl: pickImage(track.albumImages, 64),
              imageSize: 52,
              trailingStack: (
                <>
                  <span className="text-xs tabular-nums text-[color:var(--fg-muted)]">
                    {formatDuration(track.duration_ms)}
                  </span>
                  <span className="text-xs tabular-nums text-[color:var(--fg-muted)]">
                    {track.popularity}/100 popularity
                  </span>
                </>
              )
            }))}
          />
        </section>
      )}

      {!loading && typedSection === "recently-played" && (
        <section className="mt-11 sm:mt-7">
          <MediaList
            compactOnMobile
            items={recentlyPlayed.map((item, index) => ({
              key: `${item.track.id}-${item.played_at}`,
              index,
              title: item.track.name,
              subtitle: `${item.track.artists.map((artist) => artist.name).join(", ")} · ${item.track.album}`,
              imageSeed: item.track.album || item.track.name,
              imageUrl: pickImage(item.track.albumImages, 64),
              imageSize: 52,
              trailingStack: (
                <>
                  <span className="text-xs tabular-nums text-[color:var(--fg-muted)]">
                    {formatRelative(item.played_at)}
                  </span>
                  <span className="text-xs tabular-nums text-[color:var(--fg-muted)]">
                    {new Date(item.played_at).toLocaleString()}
                  </span>
                </>
              )
            }))}
          />
        </section>
      )}

      {!loading && typedSection === "listening-activity" && activeMetric && (
        <section className="mt-11 sm:mt-7">
          {historyTruncated && (
            <div className={cx(banner, "mt-0")}>
              <strong>Note:</strong>
              Showing the most recent listening history slice due to API limits.
            </div>
          )}
          <div className={cx(cardBase, "bg-[radial-gradient(320px_180px_at_100%_0%,rgba(29,185,84,0.10),transparent_60%),linear-gradient(180deg,rgba(20,26,29,0.96),rgba(20,26,29,0.86))] p-[22px] sm:p-[18px]")}>
            <div className="flex items-start justify-between gap-[18px] sm:flex-col">
              <div>
                <div className={statLabel}>{activeMetric.label}</div>
                <div className={statValue}>{formatNumber(activeMetric.count)}</div>
                <div className={cx("text-xs font-semibold", activeMetric.delta >= 0 ? "text-[color:var(--accent)]" : "text-[color:var(--danger)]")}>
                  {formatDelta(activeMetric.delta, activeMetric.deltaPct)}
                </div>
              </div>
              <div className="max-w-[320px] text-[13px] leading-6 text-[rgba(222,236,228,0.76)] sm:max-w-none">
                Plays are grouped into time buckets so you can spot spikes and quiet stretches quickly.
              </div>
            </div>
            <div className="mt-3.5 rounded-[18px] border border-white/5 bg-[linear-gradient(180deg,rgba(9,13,15,0.54),rgba(9,13,15,0.2))] px-3.5 pb-3 pt-3 sm:px-3 sm:pb-2.5">
              <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[rgba(224,236,231,0.78)]">
                Trend across the selected listening window
              </div>
              <Sparkline points={activeMetric.series} width={760} height={260} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 sm:grid-cols-1 sm:gap-3">
            {activityMetrics.map((metric) => (
              <button
                key={metric.key}
                className={cx(
                  cardBase,
                  "relative flex cursor-pointer flex-col gap-2 overflow-hidden p-[18px] text-left text-[color:var(--fg)]",
                  metric.key === selectedWindow
                    ? "border-[color:var(--accent)] bg-[radial-gradient(260px_120px_at_100%_0%,rgba(29,185,84,0.14),transparent_65%),rgba(29,185,84,0.08)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_12px_32px_rgba(0,0,0,0.22)]"
                    : "bg-[linear-gradient(180deg,rgba(20,26,29,0.94),rgba(20,26,29,0.84))]"
                )}
                onClick={() => updateWindow(metric.key)}
                type="button"
              >
                <div className={cx(statLabel, metric.key === selectedWindow ? "text-[rgba(232,244,237,0.78)]" : "text-[rgba(220,232,225,0.68)]")}>
                  {metric.label}
                </div>
                <div className={cx(statValue, metric.key === selectedWindow ? "text-[#f3fbf6]" : "text-[color:var(--fg)]")}>
                  {formatNumber(metric.count)}
                </div>
                <div className={cx("text-xs font-semibold", metric.delta >= 0 ? "text-[color:var(--accent)]" : "text-[color:var(--danger)]")}>
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
