// Configurable values - supplied via Config.toml or environment variables.
//
// OAuth is now owned by this Ballerina service. The frontend is static and
// redirects to /auth/login for Spotify sign-in.

configurable string spotifyApiUrl = "https://api.spotify.com/v1";
configurable string spotifyAccountsApiUrl = "https://accounts.spotify.com";

configurable string spotifyClientId = ?;
configurable string spotifyClientSecret = ?;

configurable int servicePort = 8080;

// Origin allowed by CORS — the URL where the frontend is served.
configurable string allowedOrigin = "http://localhost:3000";

// Base frontend URL used for redirects after successful login.
configurable string frontendBaseUrl = "http://localhost:3000";

// OAuth callback handled by this Ballerina service.
configurable string oauthCallbackUrl = "http://localhost:8080/auth/callback";

// Cookie name used to store the Spotify access token.
configurable string sessionCookieName = "spotify_access_token";
