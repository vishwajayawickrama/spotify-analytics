// Typed client for the Ballerina backend.
//
// Authentication is cookie-based and owned by Ballerina. The frontend calls
// auth and analytics endpoints with `credentials: include`.

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080";
const ANALYTICS_BASE = process.env.NEXT_PUBLIC_ANALYTICS_API || `${BACKEND_BASE}/analytics`;

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

export type AuthSession = {
  authenticated: boolean;
  profile?: UserProfile;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ANALYTICS_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init?.headers ?? {}) },
    cache: "no-store"
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`analytics ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

async function authCall<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init?.headers ?? {}) },
    cache: "no-store"
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`auth ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export const analyticsApi = {
  summary: (timeRange: TimeRange = "medium_term", accessToken?: string) =>
    call<AnalyticsSummary>(`/summary?timeRange=${timeRange}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    }),
  profile: () => call<UserProfile>(`/profile`),
  topArtists: (timeRange: TimeRange = "medium_term", limit = 20) =>
    call<SpotifyArtist[]>(`/top-artists?timeRange=${timeRange}&limit=${limit}`),
  topTracks: (timeRange: TimeRange = "medium_term", limit = 20) =>
    call<SpotifyTrack[]>(`/top-tracks?timeRange=${timeRange}&limit=${limit}`),
  recentlyPlayed: (limit = 20) =>
    call<PlayHistoryItem[]>(`/recently-played?limit=${limit}`)
};

export const authApi = {
  loginUrl: `${BACKEND_BASE}/auth/login`,
  session: () => authCall<AuthSession>(`/auth/session`),
  logout: () => authCall<{ authenticated: boolean }>(`/auth/logout`, { method: "POST" })
};
