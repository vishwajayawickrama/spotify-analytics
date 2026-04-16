"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authApi,
  analyticsApi,
  type AuthSession,
  type AnalyticsSummary,
  type PlayHistoryItem,
  type TimeRange
} from "@/lib/api";
import {
  ArtBlock,
  TIME_RANGES,
  deriveAveragePopularity,
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
  statSub,
  statValue
} from "@/lib/ui";
import {
  AppHeader,
  AuthScreen,
  MediaList,
  SectionHeader,
  SegmentedControls
} from "@/lib/ui-components";

export default function DashboardPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [useTokenFallback, setUseTokenFallback] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [listeningHistory, setListeningHistory] = useState<PlayHistoryItem[]>([]);
  const [historyTruncated, setHistoryTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve auth from cookie session first. Use token fallback only if
  // session cookies are blocked/unavailable.
  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.substring(1)
      : "";
    const params = new URLSearchParams(hash);
    const tokenFromHash = params.get("access_token");
    let fallbackToken: string | null = null;
    if (tokenFromHash) {
      window.sessionStorage.setItem("spotify_access_token", tokenFromHash);
      fallbackToken = tokenFromHash;
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    if (!fallbackToken) {
      fallbackToken = window.sessionStorage.getItem("spotify_access_token");
    }
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

  // Fetch analytics only when authenticated.
  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!auth?.authenticated && !accessToken) {
      setSummary(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const tokenForApi = useTokenFallback ? accessToken ?? undefined : undefined;
    Promise.all([
      analyticsApi.summary(timeRange, tokenForApi),
      analyticsApi.listeningHistory(20000, tokenForApi)
    ])
      .then(([summaryData, historyData]) => {
        if (cancelled) return;
        setSummary(summaryData);
        setListeningHistory(historyData.history);
        setHistoryTruncated(historyData.truncated);
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
  }, [auth?.authenticated, accessToken, authLoading, useTokenFallback, timeRange]);

  const initial = useMemo(
    () => summary?.profile.display_name?.[0]?.toUpperCase() ?? "?",
    [summary]
  );

  // Listener-focused stats derived from the summary. These describe the
  // user's listening behavior, not the artists themselves.
  const listenerStats = useMemo(() => {
    if (!summary) return null;
    const topArtist = summary.topArtists[0];
    const tracks = summary.topTracks;
    const avgDurationMs = tracks.length
      ? tracks.reduce((acc, t) => acc + t.duration_ms, 0) / tracks.length
      : 0;
    const avgPopularity = deriveAveragePopularity(summary);
    // Lower popularity = more obscure taste. Map [0..100] -> obscure..mainstream.
    const tasteLabel =
      tracks.length === 0
        ? "No data yet"
        : avgPopularity >= 75
        ? "Mainstream"
        : avgPopularity >= 55
        ? "Balanced"
        : avgPopularity >= 35
        ? "Eclectic"
        : "Underground";
    return {
      topArtist,
      avgDurationMs,
      avgPopularity,
      tasteLabel,
      trackCount: tracks.length
    };
  }, [summary]);

  const listeningMetrics = useMemo(
    () => deriveListeningWindowMetrics(listeningHistory.map((item) => item.played_at)),
    [listeningHistory]
  );
  const lastDayListening = useMemo(
    () => listeningMetrics.find((metric) => metric.key === "lastDay"),
    [listeningMetrics]
  );
  const topArtistsPreview = useMemo(() => summary?.topArtists.slice(0, 6) ?? [], [summary]);

  if (authLoading) {
    return <div className={loadingState}>Loading session…</div>;
  }

  if (!auth?.authenticated && !accessToken) {
    return (
      <AuthScreen
        title="Sign in required"
        description="Authenticate with Spotify to access your listening analytics dashboard."
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
        userLabel={summary?.profile.display_name ?? auth?.profile?.display_name ?? "…"}
        initial={initial}
        action={
          <button
            className="ml-2 inline-flex min-h-10 items-center rounded-full border border-[color:var(--border)] bg-transparent px-4 py-2 text-[13px] text-[color:var(--fg-muted)] transition hover:border-[color:var(--fg-muted)] hover:bg-white/[0.02] hover:text-[color:var(--fg)]"
            onClick={() => {
              window.sessionStorage.removeItem("spotify_access_token");
              setAccessToken(null);
              setUseTokenFallback(false);
              authApi
                .logout()
                .finally(() => {
                  router.push("/");
                });
            }}
          >
            Sign out
          </button>
        }
      />

      <SegmentedControls
        items={TIME_RANGES.map((tr) => ({ value: tr.value, label: tr.label }))}
        activeValue={timeRange}
        onChange={setTimeRange}
      />

      {error && <div className={errorBanner}>Failed to load analytics: {error}</div>}

      {loading && !summary && <div className={loadingState}>Loading analytics…</div>}

      {summary && (
        <>
          <section className="mt-11 sm:mt-7">
            <h2 className={cx(sectionTitle, "mb-4")}>Your Listening</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5 sm:grid-cols-1 sm:gap-3">
              <div className={cx(cardBase, "relative overflow-hidden p-[18px] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(120px_80px_at_100%_0%,rgba(29,185,84,0.10),transparent_70%)]")}>
                <div className={statLabel}>Most listened artist</div>
                <div className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[22px] font-bold tracking-[-0.02em] text-[color:var(--fg)] sm:text-xl">
                  {listenerStats?.topArtist?.name ?? "—"}
                </div>
                <div className={statSub}>
                  #1 in your rotation this period
                </div>
              </div>

              <div className={cx(cardBase, "relative overflow-hidden p-[18px] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(120px_80px_at_100%_0%,rgba(29,185,84,0.10),transparent_70%)]")}>
                <button
                  type="button"
                  className="group block w-full cursor-pointer bg-transparent p-0 text-left text-inherit"
                  onClick={() => {
                    router.push("/dashboard/listening-activity?window=lastDay");
                  }}
                  aria-label="Open listening activity details"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className={statLabel}>Listening activity (last day)</div>
                    <span className="text-sm font-bold text-[color:var(--fg-muted)] transition group-hover:translate-x-1 group-hover:text-[color:var(--accent)]" aria-hidden>
                      →
                    </span>
                  </div>
                  <div className={statValue}>{formatNumber(lastDayListening?.count ?? 0)}</div>
                  <div className={cx("text-xs font-semibold", (lastDayListening?.delta ?? 0) >= 0 ? "text-[color:var(--accent)]" : "text-[color:var(--danger)]")}>
                    {formatDelta(lastDayListening?.delta ?? 0, lastDayListening?.deltaPct ?? null)}
                  </div>
                  <div className={statSub}>Based on {formatNumber(listeningHistory.length)} plays fetched.</div>
                  <div className={cx(statSub, "mt-1 text-[color:var(--fg-muted)]")}>See more with all activity filters</div>
                </button>
              </div>

              <div className={cx(cardBase, "relative overflow-hidden p-[18px] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(120px_80px_at_100%_0%,rgba(29,185,84,0.10),transparent_70%)]")}>
                <div className={statLabel}>Avg track length</div>
                <div className={statValue}>
                  {formatDuration(listenerStats?.avgDurationMs ?? 0)}
                  <span className="text-[13px] font-medium text-[color:var(--fg-muted)]">min</span>
                </div>
                <div className={statSub}>
                  From your {listenerStats?.trackCount ?? 0} top tracks
                </div>
              </div>

              <div className={cx(cardBase, "relative overflow-hidden p-[18px] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(120px_80px_at_100%_0%,rgba(29,185,84,0.10),transparent_70%)]")}>
                <div className={statLabel}>Taste profile</div>
                <div className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[22px] font-bold capitalize tracking-[-0.02em] text-[color:var(--fg)] sm:text-xl">
                  {listenerStats?.tasteLabel ?? "—"}
                </div>
                <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]"
                    style={{ width: `${listenerStats?.avgPopularity ?? 0}%` }}
                  />
                </div>
                <div className={statSub}>
                  {listenerStats?.avgPopularity ?? 0}/100 mainstream score
                </div>
              </div>
            </div>
          </section>

          {historyTruncated && (
            <div className={cx(banner, "mb-0 mt-4")}>
              <strong>Note:</strong>
              Listening activity is shown from available Spotify history.
            </div>
          )}

          <section className="mt-11 sm:mt-7">
            <SectionHeader
              title="Top Artists"
              actionLabel="See more →"
              onAction={() => {
                router.push(`/dashboard/artists?timeRange=${timeRange}`);
              }}
            />
            <div className="grid w-full max-w-full auto-cols-[minmax(220px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-2 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] sm:auto-cols-[minmax(180px,82vw)] sm:gap-3 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--border-strong)]">
              {topArtistsPreview.map((a, index) => (
                <div key={a.id} className={cx(cardBase, "flex min-h-full w-full snap-start flex-col gap-3 rounded-2xl p-3.5 transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)]")}>
                  <div className="relative min-w-0">
                    <div className="absolute left-2.5 top-2.5 z-[1] rounded-full border border-white/10 bg-[rgba(7,9,10,0.72)] px-2 py-[3px] text-xs font-bold text-[color:var(--fg-dim)] backdrop-blur-[8px]">
                      #{String(index + 1).padStart(2, "0")}
                    </div>
                    {a.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pickImage(a.images, 320)}
                        alt={a.name}
                        className="block min-h-[180px] w-full rounded-xl bg-[#222] object-cover sm:min-h-[160px]"
                      />
                    ) : (
                      <div
                        className="grid min-h-[180px] w-full place-items-center rounded-xl bg-[#222] text-4xl font-extrabold tracking-[-0.02em] text-white/90 [text-shadow:0_2px_12px_rgba(0,0,0,0.4)] sm:min-h-[160px] sm:text-[28px]"
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
                  </div>
                  <div className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold text-[color:var(--fg)]">
                    {a.name}
                  </div>
                  <div className="text-[13px] text-[color:var(--fg-muted)]">
                    {formatNumber(a.followers)} followers
                  </div>
                  <div className="flex min-h-8 flex-wrap gap-2">
                    {(a.genres.length === 0 ? ["No genres yet"] : a.genres.slice(0, 2)).map((genre) => (
                      <span
                        key={`${a.id}-${genre}`}
                        className={cx(
                          "rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3.5 py-[7px] text-xs font-medium",
                          a.genres.length === 0 ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]"
                        )}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-hover))]"
                      style={{ width: `${a.popularity}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-0 grid grid-cols-2 gap-6 max-[900px]:grid-cols-1 max-[900px]:gap-0">
            <section className="mt-11 min-w-0 sm:mt-7">
              <SectionHeader
                title="Top Tracks"
                actionLabel="See more →"
                onAction={() => {
                  router.push(`/dashboard/tracks?timeRange=${timeRange}`);
                }}
              />
              <MediaList
                items={summary.topTracks.map((t, i) => ({
                  key: t.id,
                  index: i,
                  title: t.name,
                  subtitle: `${t.artists.map((ar) => ar.name).join(", ")} · ${t.album}`,
                  imageSeed: t.album || t.name,
                  imageUrl: pickImage(t.albumImages),
                  trailing: formatDuration(t.duration_ms)
                }))}
              />
            </section>

            <section className="mt-11 min-w-0 sm:mt-7">
              <SectionHeader
                title="Recently Played"
                actionLabel="See more →"
                onAction={() => {
                  router.push("/dashboard/recently-played");
                }}
              />
              <MediaList
                items={summary.recentlyPlayed.map((p, i) => ({
                  key: `${p.track.id}-${p.played_at}`,
                  index: i,
                  title: p.track.name,
                  subtitle: p.track.artists.map((ar) => ar.name).join(", "),
                  imageSeed: p.track.album || p.track.name,
                  imageUrl: pickImage(p.track.albumImages),
                  trailing: formatRelative(p.played_at)
                }))}
              />
            </section>
          </div>

          <footer className="mt-14 border-t border-[color:var(--border)] pt-6 text-center text-xs text-[color:var(--fg-dim)]">
            Built with Next.js + Ballerina · Live data via Spotify Web API
          </footer>
        </>
      )}
    </div>
  );
}
