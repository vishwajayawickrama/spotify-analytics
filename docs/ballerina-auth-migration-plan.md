# Ballerina-Owned Authentication Migration Plan

Date: 2026-04-14
Status: Implemented (Phase 1)

> Canonical current auth reference: `docs/auth-current-state-guide.md`.
> This document is migration history and implementation planning context.

## Goal

Move Spotify OAuth and session lifecycle fully into the Ballerina service so the Next.js frontend can be statically exported for GitHub Pages.

## Current Pain Points

- The frontend uses NextAuth route handlers (`app/api/auth/[...nextauth]`), which are server-only and incompatible with `output: "export"` static hosting.
- Build fails under static export due to dynamic API route requirements.
- OAuth secrets and refresh logic currently live in the Next.js project.

## Target Architecture

- Ballerina service owns OAuth flow and token refresh.
- Frontend becomes static-only and does not host API routes.
- Frontend talks to Ballerina using `credentials: include`.
- Ballerina issues an HTTP cookie session and resolves Spotify access tokens server-side.

### Auth Flow

1. Frontend calls `GET /auth/login` on Ballerina.
2. Ballerina redirects to Spotify authorize URL.
3. Spotify redirects to `GET /auth/callback?code=...` on Ballerina.
4. Ballerina exchanges code for tokens and creates a server-side session.
5. Ballerina sets an HTTP cookie and redirects user back to frontend dashboard.
6. Frontend calls analytics endpoints without bearer token.
7. Ballerina resolves access token from session and calls Spotify APIs.

## Backend Changes

- Add new config values:
  - `spotifyClientId`
  - `spotifyClientSecret`
  - `frontendBaseUrl`
  - `oauthCallbackUrl`
  - `sessionCookieName`
- Add `/auth` endpoints:
  - `GET /auth/login`
  - `GET /auth/callback`
  - `GET /auth/session`
  - `POST /auth/logout`
- Add in-memory session store for now.
- Update `/analytics/*` endpoints to accept either:
  - `Authorization: Bearer <token>` (backward compatibility), or
  - session cookie issued by Ballerina.

## Frontend Changes

- Remove NextAuth usage from UI.
- Remove NextAuth API route.
- Replace sign-in/out/session UI logic with calls to:
  - `GET /auth/login` (redirect)
  - `GET /auth/session`
  - `POST /auth/logout`
- Update analytics client to use cookie-based auth (`credentials: include`) and no bearer header.

## Deployment Notes

- GitHub Pages frontend will be static only.
- Ballerina service must be deployed on HTTPS for secure cookies in production.
- CORS must allow the Pages origin with credentials.

## Risks

- In-memory sessions are not multi-instance durable.
- Production needs persistent session storage (Redis/DB) and optional at-rest encryption.
- Token refresh support is required for long-lived sessions.

## Implementation Notes (Phase 1)

- Completed:
  - Ballerina now owns OAuth login/callback/session/logout endpoints.
  - Frontend no longer uses NextAuth and now redirects to backend login.
  - Analytics calls use cookie-based auth (`credentials: include`).
  - Next.js API auth route removed, enabling static export build.
- Deferred to Phase 2:
  - Persistent/distributed session store.
  - Automatic refresh token lifecycle in backend session handling.

## Verification Plan

- Ballerina service starts and serves both `/auth/*` and `/analytics/*`.
- `npm run build` in `web/` succeeds with static export config.
- Login redirects through Spotify and returns to dashboard.
- Dashboard loads real user analytics via cookie-backed backend calls.
