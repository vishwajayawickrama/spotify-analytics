// Typed client for the Ballerina analytics service.
//
// Every call forwards the user's Spotify access token (obtained via NextAuth)
// as a Bearer credential. The backend forwards it on to Spotify.

const BASE = process.env.NEXT_PUBLIC_ANALYTICS_API ?? "http://localhost:8080/analytics";

export type SpotifyImage = { url: string; height?: number; width?: number };
export type SpotifyArtistRef = { id: string; name: string };

export type SpotifyArtist = {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: number;
  images: SpotifyImage[];
};

export type SpotifyTrack = {
  id: string;
  name: string;
  popularity: number;
  duration_ms: number;
  album: string;
  artists: SpotifyArtistRef[];
};

export type PlayHistoryItem = { played_at: string; track: SpotifyTrack };

export type UserProfile = {
  id: string;
  display_name: string;
  email?: string | null;
  country: string;
  followers: number;
  product: string;
};

export type AnalyticsSummary = {
  profile: UserProfile;
  topArtists: SpotifyArtist[];
  topTracks: SpotifyTrack[];
  recentlyPlayed: PlayHistoryItem[];
  topGenres: string[];
  averageTrackPopularity: number;
};

export type TimeRange = "short_term" | "medium_term" | "long_term";

async function call<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`analytics ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export const analyticsApi = {
  summary: (token: string, timeRange: TimeRange = "medium_term") =>
    call<AnalyticsSummary>(`/summary?timeRange=${timeRange}`, token),
  profile: (token: string) => call<UserProfile>(`/profile`, token),
  topArtists: (token: string, timeRange: TimeRange = "medium_term", limit = 20) =>
    call<SpotifyArtist[]>(`/top-artists?timeRange=${timeRange}&limit=${limit}`, token),
  topTracks: (token: string, timeRange: TimeRange = "medium_term", limit = 20) =>
    call<SpotifyTrack[]>(`/top-tracks?timeRange=${timeRange}&limit=${limit}`, token),
  recentlyPlayed: (token: string, limit = 20) =>
    call<PlayHistoryItem[]>(`/recently-played?limit=${limit}`, token)
};
