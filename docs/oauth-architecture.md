# OAuth Architecture: Why Spotify Credentials Live in the Next.js Project

## TL;DR

`SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are defined in the Next.js
app's environment, but they are **never sent to the browser**. They are read
exclusively by server-side code (the NextAuth API route). The Ballerina
backend does not need them, because every request it receives already carries
the signed-in user's Spotify access token in the `Authorization` header.

This document explains the reasoning, the request flow, and the security
guarantees behind that decision.

---

## 1. "Frontend project" is not the same as "the browser"

A common misconception is that anything inside a Next.js app runs in the
browser. It does not. A Next.js project has **two execution environments**:

| Environment | Where it runs                          | Can read secrets? |
| ----------- | -------------------------------------- | ----------------- |
| Server      | Node.js process (server, edge runtime) | Yes               |
| Client      | The user's browser                     | No                |

Next.js enforces this with a simple convention for environment variables:

- Variables prefixed with `NEXT_PUBLIC_` are inlined into the client bundle
  and **are** visible to the browser.
- Every other variable is **only** available in server-side code:
  API routes (`app/api/**`), server components, middleware, `getServerSideProps`,
  etc.

In this repo:

```env
# web/.env.example
SPOTIFY_CLIENT_ID=...          # server-only — no NEXT_PUBLIC_ prefix
SPOTIFY_CLIENT_SECRET=...      # server-only — no NEXT_PUBLIC_ prefix
NEXT_PUBLIC_ANALYTICS_API=...  # safe to expose; it's just a URL
```

The two Spotify variables are read in [web/lib/auth.ts:55-56](../web/lib/auth.ts#L55-L56),
which is imported only by the NextAuth API route at
[web/app/api/auth/[...nextauth]/](../web/app/api/auth/[...nextauth]/). That route
runs on the server. The client bundle never references either variable, so
they never appear in any JavaScript shipped to the browser.

---

## 2. Why OAuth lives in the Next.js app instead of Ballerina

The architecture deliberately puts OAuth orchestration in the Next.js app
rather than the Ballerina analytics service. This is documented inline in
[spotify_integration/config.bal:3-6](../spotify_integration/config.bal#L3-L6):

> Spotify client credentials are no longer needed here. Each request arrives
> with the signed-in user's OAuth access token in the Authorization header
> (Bearer `<token>`), which we forward to the Spotify Web API. OAuth is
> owned by the Next.js frontend via NextAuth / "Sign in with Spotify".

The motivations:

1. **NextAuth already does it well.** NextAuth has a first-class Spotify
   provider that handles the authorization-code flow, JWT session cookies,
   and token refresh. Re-implementing that in Ballerina would duplicate
   logic with no benefit.
2. **Sessions belong with the UI.** The browser needs an HTTP-only session
   cookie to know whether the user is logged in. That cookie is set by
   the same origin that serves the HTML — i.e. the Next.js app.
3. **The backend stays stateless.** Ballerina becomes a thin proxy/aggregator
   over the Spotify Web API. It does not store users, sessions, or refresh
   tokens. It just forwards a bearer token it received from the caller.
4. **Smaller blast radius.** Only one process (Next.js) holds the client
   secret. The Ballerina service can be redeployed, restarted, or even
   compromised without leaking the OAuth app credentials.

---

## 3. End-to-end request flow

```
┌──────────┐    1. click "Sign in"     ┌──────────────────┐
│ Browser  │ ────────────────────────▶ │ Next.js (server) │
└──────────┘                           │  NextAuth route  │
     ▲                                 └──────────────────┘
     │                                          │
     │  6. HTML +                               │ 2. redirect to Spotify
     │     session cookie                       ▼  (with client_id)
     │                                 ┌──────────────────┐
     │                                 │ accounts.spotify │
     │                                 │      .com        │
     │                                 └──────────────────┘
     │                                          │
     │                                          │ 3. user approves;
     │                                          │    Spotify redirects
     │                                          ▼    back with `code`
     │                                 ┌──────────────────┐
     │                                 │ Next.js (server) │
     │                                 │ NextAuth route   │
     │                                 │                  │
     │                                 │ 4. exchanges     │
     │                                 │    code +        │
     │                                 │    client_secret │
     │                                 │    for tokens    │
     │                                 │                  │
     │                                 │ 5. stores tokens │
     │                                 │    in JWT cookie │
     └─────────────────────────────────┴──────────────────┘
```

After login, the browser calls the Ballerina backend like this:

```
┌──────────┐    GET /analytics/top-tracks    ┌──────────────────┐
│ Browser  │ ──────────────────────────────▶ │ Next.js (server) │
└──────────┘    Authorization: Bearer <ut>   │  page / action   │
                                             └──────────────────┘
                                                      │
                                                      │ forwards token
                                                      ▼
                                             ┌──────────────────┐
                                             │ Ballerina        │
                                             │ analytics svc    │
                                             └──────────────────┘
                                                      │
                                                      │ Authorization:
                                                      │ Bearer <ut>
                                                      ▼
                                             ┌──────────────────┐
                                             │ api.spotify.com  │
                                             └──────────────────┘
```

`<ut>` is the **user's** access token, not an app-level token. Ballerina
never sees the client secret, and Spotify enforces per-user permissions
based on the scopes the user originally granted.

---

## 4. Token refresh — the other reason the secret stays server-side

Spotify access tokens expire after roughly one hour. Without a refresh
mechanism, the dashboard would break the moment a token aged out. NextAuth
handles this in [web/lib/auth.ts:18-50](../web/lib/auth.ts#L18-L50):

```ts
const basic = Buffer.from(
  `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
).toString("base64");

const res = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    Authorization: `Basic ${basic}`,
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refreshToken as string
  })
});
```

Spotify's refresh endpoint requires the **client secret** as part of the
`Basic` auth header. There is no way to do this from the browser without
leaking the secret. The refresh **must** happen on a server you control,
which in this architecture is the Next.js server.

This is the single most important reason the credentials live with the
Next.js project: token refresh is impossible without them, and token
refresh has to happen server-side.

---

## 5. Security guarantees and how to verify them

Two things must be true for the secret to remain safe:

1. **The variable name is not prefixed with `NEXT_PUBLIC_`.**
   Confirmed in [web/.env.example](../web/.env.example).

2. **No file marked `"use client"` imports the variable.**
   The only consumer is [web/lib/auth.ts](../web/lib/auth.ts), which is
   imported by the NextAuth API route — a server route. No client component
   touches it.

You can verify both at any time with:

```bash
# 1. confirm there is no NEXT_PUBLIC_SPOTIFY_* variable anywhere
grep -r "NEXT_PUBLIC_SPOTIFY" web/

# 2. confirm SPOTIFY_CLIENT_SECRET is only referenced server-side
grep -rn "SPOTIFY_CLIENT_SECRET" web/
```

If either grep ever turns up a result inside a `"use client"` file or a
`NEXT_PUBLIC_` variable, that is a leak and must be fixed immediately.

Additional good practices already in place or worth adopting:

- **Never commit `.env.local` or `Config.toml`.** Only the `.example`
  files belong in git.
- **Rotate the client secret** if it is ever pasted into a chat, log, or
  screenshot. Spotify lets you regenerate it from the developer dashboard
  without changing the client ID.
- **Restrict redirect URIs** in the Spotify dashboard to exactly the URLs
  you use (`http://localhost:3000/api/auth/callback/spotify` for local,
  plus your production URL). This prevents an attacker who steals the
  client ID from completing an OAuth flow against a domain you don't own.

---

## 6. What the Ballerina service actually needs

For completeness, the analytics service has only three configurables —
none of them OAuth secrets — defined in
[spotify_integration/config.bal](../spotify_integration/config.bal) and
mirrored in [spotify_integration/Config.toml.example](../spotify_integration/Config.toml.example):

| Variable        | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `spotifyApiUrl` | Base URL for the Spotify Web API                     |
| `servicePort`   | Port the Ballerina HTTP service listens on           |
| `allowedOrigin` | CORS origin allowed to call the service (Next.js URL)|

That is the full configuration surface. The Ballerina service is
intentionally credential-free.

---

## 7. Summary

- Secrets in a Next.js project are **server-only** unless they start with
  `NEXT_PUBLIC_`.
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` are read by the NextAuth
  API route only, so they never reach the browser.
- They live with the Next.js app because NextAuth orchestrates the OAuth
  flow and — critically — because token refresh requires the client secret
  on a server you control.
- The Ballerina backend stays stateless and credential-free, simply
  forwarding the user's access token to Spotify.
- The arrangement is safe as long as no `"use client"` file imports the
  secret and no variable is renamed with a `NEXT_PUBLIC_` prefix.
