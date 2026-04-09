# Spotify Analytics — Web (Next.js)

Next.js 14 (App Router) frontend for the Ballerina `spotify_integration`
service. Users sign in with Spotify; the app stores the user's OAuth access
token in the NextAuth session and forwards it as a `Bearer` credential on
every call to the backend.

## Architecture

```
Browser ──(NextAuth Spotify OAuth)──▶ Spotify Accounts
   │
   │  session.accessToken
   ▼
Next.js client  ──Bearer──▶  Ballerina /analytics  ──Bearer──▶  Spotify Web API
```

The backend no longer holds Spotify client credentials — it just relays
the per-user bearer token. See `../spotify_integration/main.bal`.

## Setup

1. Create a Spotify app at https://developer.spotify.com/dashboard
2. Add redirect URI: `http://localhost:3000/api/auth/callback/spotify`
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `NEXT_PUBLIC_ANALYTICS_API` if the Ballerina service isn't on `:8080`
4. `npm install`
5. `npm run dev`

Start the Ballerina service in a separate terminal:

```bash
cd ../spotify_integration
bal run
```

## Scopes

`user-read-email user-read-private user-top-read user-read-recently-played`

## Token refresh

`lib/auth.ts` automatically refreshes the access token using the refresh
token Spotify returned at sign-in. If a refresh fails, `session.error` is set
to `RefreshAccessTokenError` and the dashboard prompts the user to sign in
again.
