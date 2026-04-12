// Mock analytics data used when the dashboard is rendered without a real
// Spotify session (demo mode). Shape matches AnalyticsSummary in api.ts.

import type { AnalyticsSummary } from "./api";

export const placeholderSummary: AnalyticsSummary = {
  profile: {
    id: "demo-user",
    display_name: "Demo Listener",
    email: "demo@example.com",
    country: "US",
    followers: 248,
    product: "premium"
  },
  averageTrackPopularity: 71,
  topGenres: [
    "indie pop",
    "bedroom pop",
    "synthwave",
    "lo-fi",
    "alt rock",
    "dream pop",
    "electronic",
    "neo soul",
    "ambient",
    "shoegaze"
  ],
  topArtists: [
    {
      id: "a1",
      name: "Midnight Static",
      genres: ["synthwave", "electronic"],
      popularity: 78,
      followers: 412_338,
      images: []
    },
    {
      id: "a2",
      name: "Velvet Harbor",
      genres: ["indie pop", "dream pop"],
      popularity: 71,
      followers: 189_204,
      images: []
    },
    {
      id: "a3",
      name: "Paper Lanterns",
      genres: ["bedroom pop", "lo-fi"],
      popularity: 64,
      followers: 95_410,
      images: []
    },
    {
      id: "a4",
      name: "Northbound",
      genres: ["alt rock", "indie rock"],
      popularity: 81,
      followers: 1_204_733,
      images: []
    },
    {
      id: "a5",
      name: "Coral Hours",
      genres: ["neo soul", "r&b"],
      popularity: 69,
      followers: 304_812,
      images: []
    },
    {
      id: "a6",
      name: "Glass Architects",
      genres: ["ambient", "electronic"],
      popularity: 58,
      followers: 47_211,
      images: []
    },
    {
      id: "a7",
      name: "Saoirse Lane",
      genres: ["shoegaze", "dream pop"],
      popularity: 66,
      followers: 121_988,
      images: []
    },
    {
      id: "a8",
      name: "Western Tides",
      genres: ["folk", "indie folk"],
      popularity: 73,
      followers: 502_117,
      images: []
    }
  ],
  topTracks: [
    {
      id: "t1",
      name: "Slow Burn",
      popularity: 84,
      duration_ms: 218_000,
      album: "Hours After Midnight",
      artists: [{ id: "a1", name: "Midnight Static" }]
    },
    {
      id: "t2",
      name: "Polaroid Summer",
      popularity: 76,
      duration_ms: 195_000,
      album: "Soft Focus",
      artists: [{ id: "a2", name: "Velvet Harbor" }]
    },
    {
      id: "t3",
      name: "Cassette Ghosts",
      popularity: 68,
      duration_ms: 244_000,
      album: "Bedroom Tapes Vol. 2",
      artists: [{ id: "a3", name: "Paper Lanterns" }]
    },
    {
      id: "t4",
      name: "Thirteen Stories",
      popularity: 89,
      duration_ms: 232_000,
      album: "Compass",
      artists: [{ id: "a4", name: "Northbound" }]
    },
    {
      id: "t5",
      name: "Wax & Honey",
      popularity: 72,
      duration_ms: 207_000,
      album: "Coral",
      artists: [{ id: "a5", name: "Coral Hours" }]
    },
    {
      id: "t6",
      name: "Lantern Field",
      popularity: 61,
      duration_ms: 286_000,
      album: "Atrium",
      artists: [{ id: "a6", name: "Glass Architects" }]
    },
    {
      id: "t7",
      name: "Headlights On Pavement",
      popularity: 70,
      duration_ms: 251_000,
      album: "Soft Focus",
      artists: [{ id: "a2", name: "Velvet Harbor" }]
    },
    {
      id: "t8",
      name: "Reverie",
      popularity: 65,
      duration_ms: 198_000,
      album: "Tidewater",
      artists: [{ id: "a7", name: "Saoirse Lane" }]
    },
    {
      id: "t9",
      name: "Backroads",
      popularity: 77,
      duration_ms: 223_000,
      album: "Western Tides",
      artists: [{ id: "a8", name: "Western Tides" }]
    },
    {
      id: "t10",
      name: "Neon Snowfall",
      popularity: 80,
      duration_ms: 240_000,
      album: "Hours After Midnight",
      artists: [{ id: "a1", name: "Midnight Static" }]
    }
  ],
  recentlyPlayed: [
    {
      played_at: new Date(Date.now() - 4 * 60_000).toISOString(),
      track: {
        id: "t1",
        name: "Slow Burn",
        popularity: 84,
        duration_ms: 218_000,
        album: "Hours After Midnight",
        artists: [{ id: "a1", name: "Midnight Static" }]
      }
    },
    {
      played_at: new Date(Date.now() - 22 * 60_000).toISOString(),
      track: {
        id: "t4",
        name: "Thirteen Stories",
        popularity: 89,
        duration_ms: 232_000,
        album: "Compass",
        artists: [{ id: "a4", name: "Northbound" }]
      }
    },
    {
      played_at: new Date(Date.now() - 70 * 60_000).toISOString(),
      track: {
        id: "t9",
        name: "Backroads",
        popularity: 77,
        duration_ms: 223_000,
        album: "Western Tides",
        artists: [{ id: "a8", name: "Western Tides" }]
      }
    },
    {
      played_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
      track: {
        id: "t2",
        name: "Polaroid Summer",
        popularity: 76,
        duration_ms: 195_000,
        album: "Soft Focus",
        artists: [{ id: "a2", name: "Velvet Harbor" }]
      }
    },
    {
      played_at: new Date(Date.now() - 6 * 3600_000).toISOString(),
      track: {
        id: "t5",
        name: "Wax & Honey",
        popularity: 72,
        duration_ms: 207_000,
        album: "Coral",
        artists: [{ id: "a5", name: "Coral Hours" }]
      }
    },
    {
      played_at: new Date(Date.now() - 26 * 3600_000).toISOString(),
      track: {
        id: "t10",
        name: "Neon Snowfall",
        popularity: 80,
        duration_ms: 240_000,
        album: "Hours After Midnight",
        artists: [{ id: "a1", name: "Midnight Static" }]
      }
    }
  ]
};

// Deterministic gradient generator — turns any string (artist/album/track
// name) into a stable two-color CSS linear-gradient. Used as a stand-in for
// album art so the demo dashboard renders without any external image URLs.
export function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 60 + (Math.abs(hash >> 3) % 120)) % 360;
  return `linear-gradient(135deg, hsl(${h1} 70% 45%), hsl(${h2} 65% 30%))`;
}
