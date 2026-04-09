// Configurable values - supplied via Config.toml or environment variables.
//
// Note: Spotify client credentials are no longer needed here. Each request
// arrives with the signed-in user's OAuth access token in the Authorization
// header (Bearer <token>), which we forward to the Spotify Web API. OAuth is
// owned by the Next.js frontend via NextAuth / "Sign in with Spotify".

configurable string spotifyApiUrl = "https://api.spotify.com/v1";

configurable int servicePort = 8080;

// Comma-separated list of origins allowed to call this API (the Next.js app).
configurable string allowedOrigin = "http://localhost:3000";
