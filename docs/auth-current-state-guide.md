# Spotify Analytics Authentication Guide (Current State)

Last updated: 2026-04-15

## 1. What Auth Is Used Now

This project now uses a backend-owned Spotify OAuth flow implemented in Ballerina.

- OAuth login and callback are handled by the Ballerina auth service.
- The primary session mechanism is an HttpOnly cookie set by Ballerina.
- The frontend prefers cookie-based session checks and API calls.
- If cross-site cookies are blocked in some browser/deployment combinations, the frontend can fall back to a short-lived token stored in sessionStorage.

In short: NextAuth is legacy in this repo and is no longer the active runtime auth path.

## 2. Current Auth Architecture

### Core components

- Ballerina auth service under /auth
	- Starts Spotify login
	- Handles callback
	- Sets/clears auth cookie
	- Exposes session endpoint
- Ballerina analytics service under /analytics
	- Resolves access token from either:
		- Authorization: Bearer <token> header, or
		- auth cookie
	- Calls Spotify Web API with the resolved token
- Next.js frontend
	- Sends user to backend login endpoint
	- Checks backend session endpoint on startup
	- Uses token fallback only when cookies are unavailable

### Auth precedence

Token resolution in analytics is:

1. Authorization header (if present and valid)
2. Cookie token

This supports both normal cookie-based operation and explicit bearer-token fallback.

## 3. End-to-End Flow

### Login flow (happy path)

1. User clicks Sign in with Spotify in the web app.
2. Frontend redirects browser to backend login endpoint.
3. Backend redirects to Spotify authorize URL with required scopes.
4. Spotify redirects to backend callback with auth code.
5. Backend exchanges code for access token.
6. Backend sets HttpOnly cookie with the token.
7. Backend redirects to frontend dashboard.
8. Frontend calls session endpoint and proceeds as authenticated.

### Fallback flow (cross-site cookie issues)

1. Callback redirect includes #access_token in URL fragment.
2. Dashboard page reads token from fragment.
3. Token is stored in sessionStorage (browser session only).
4. Frontend calls analytics endpoints with Authorization header.

## 4. Active Backend Auth Endpoints

Auth service base: /auth

- GET /auth/login
	- Redirects to Spotify authorize endpoint.
- GET /auth/callback?code=...
	- Exchanges code for token.
	- Sets auth cookie.
	- Redirects to frontend dashboard.
- GET /auth/session
	- Returns session status and profile when authenticated.
- POST /auth/logout
	- Clears auth cookie.

Analytics service base: /analytics

- GET /analytics/health
- GET /analytics/profile
- GET /analytics/top-artists
- GET /analytics/top-tracks
- GET /analytics/recently-played
- GET /analytics/summary

All analytics endpoints require resolved auth (header or cookie).

## 5. Cookie Behavior

Cookie settings currently used by backend:

- Name: configurable (default spotify_access_token)
- HttpOnly: true
- Path: /
- SameSite: None
- Max-Age: 3600 seconds
- Secure: enabled only when frontendBaseUrl starts with https://
- Partitioned: enabled only when frontendBaseUrl starts with https://

Logout sends the same cookie with Max-Age=0.

Why this matters:

- SameSite=None is required for cross-site cookie scenarios.
- Secure + Partitioned in HTTPS environments improves browser compatibility for embedded/cross-site auth cases.

## 6. Spotify Scopes In Use

The backend requests:

- user-read-email
- user-read-private
- user-top-read
- user-read-recently-played

These match dashboard needs (profile, top artists, top tracks, recent play history).

## 7. Frontend Runtime Behavior (Important)

The frontend auth helper currently builds URLs as:

- loginUrl = BACKEND_BASE + /login
- session = BACKEND_BASE + /session
- logout = BACKEND_BASE + /logout

This means NEXT_PUBLIC_BACKEND_BASE must already point to the auth base exposed by your gateway/deployment.

Examples:

- If deployment exposes auth base directly (for example .../auth-xxx/v1.0), /login works.
- If running locally against raw Ballerina listener (http://localhost:8080), auth routes are actually under /auth, so use a backend base/path strategy that maps correctly.

For analytics calls, frontend uses NEXT_PUBLIC_ANALYTICS_API.

## 8. Required Configuration

### Ballerina (auth + analytics)

Required/important values:

- spotifyClientId
- spotifyClientSecret
- servicePort
- allowedOrigin
- frontendBaseUrl
- oauthCallbackUrl
- sessionCookieName

Notes:

- allowedOrigin must match where frontend is served.
- frontendBaseUrl must match real frontend URL used for redirects.
- oauthCallbackUrl must exactly match Spotify app redirect URI configuration.

### Frontend

Currently required for runtime behavior:

- NEXT_PUBLIC_BACKEND_BASE
- NEXT_PUBLIC_ANALYTICS_API

Legacy NextAuth environment variables still exist in example env files but are not used by the active auth path.

## 9. Legacy vs Current (Migration Status)

Current source of truth:

- Ballerina auth service and analytics token resolution logic
- Frontend authApi + dashboard auth fallback behavior

Legacy material still present:

- NextAuth-related text in some env examples and docs
- Historical architecture note that is already marked as superseded

Treat backend-owned auth as canonical.

## 10. Security Guidance

1. Keep spotifyClientSecret only in backend configuration.
2. Never commit real Config.toml or secret values.
3. Restrict allowedOrigin to exact frontend origins.
4. Use HTTPS in non-local environments so Secure/Partitioned cookie attributes are applied.
5. Keep oauthCallbackUrl and Spotify dashboard redirect URIs strictly aligned.
6. Prefer cookie session mode; keep fallback token in sessionStorage as compatibility fallback only.

## 11. Troubleshooting Checklist

### Symptom: Sign in loops back to unauthenticated

- Verify oauthCallbackUrl exactly matches Spotify app redirect URI.
- Verify frontendBaseUrl is correct for current environment.
- Confirm allowedOrigin includes actual frontend origin.
- Confirm browser is not blocking all third-party cookies; fallback path should still work if token fragment is present.

### Symptom: 401 from /auth/session

- Cookie may be missing or blocked.
- Check Set-Cookie response from callback.
- Check domain/protocol mismatch between frontend URL and backend config.

### Symptom: 401 from /analytics/* even though logged in

- Confirm cookie is sent to analytics calls (credentials include behavior).
- If in fallback mode, confirm Authorization header is attached.
- Confirm token has not expired; re-login if needed.

### Symptom: Works in deployed environment but not localhost

- Re-check route base assumptions:
	- Frontend auth helper appends /login, /session, /logout.
	- Raw local Ballerina auth routes are under /auth.

## 12. Quick Verification Steps

1. Open web app root page.
2. Click Sign in with Spotify.
3. Complete Spotify consent.
4. Verify redirect reaches dashboard.
5. Verify /auth/session returns authenticated true.
6. Verify /analytics/summary loads data.
7. Sign out and verify /auth/logout clears session.

## 13. Practical Recommendation

To avoid future confusion, keep this guide as canonical and gradually remove outdated NextAuth wording from remaining examples/docs unless those files are intentionally kept for migration history.
