# Spotify Analytics

A personal Spotify listening analytics dashboard. Sign in with Spotify to see
your top artists, top tracks, recently played history, and aggregated stats
across short, medium, and long time ranges.

- **Frontend** — Next.js 14 (App Router), statically exported for GitHub Pages.
- **Backend** — Ballerina service that handles OAuth with Spotify and proxies
  the Spotify Web API for the frontend. Deployed to WSO2 Choreo.

## Architecture

```
Browser ──────▶ Ballerina /auth/login ──▶ Spotify Accounts (OAuth)
   ▲                                               │
   │                                               ▼
   └────── /auth/callback ◀── redirect with code ◀─┘
                │
                │ exchange code → access_token
                ▼
      Set cookie + redirect to frontend#access_token=...
                │
                ▼
Browser (frontend)  ── Bearer ──▶  Ballerina /analytics/*  ── Bearer ──▶  Spotify Web API
```

The backend never stores a database. Spotify access tokens live in an HTTP-only
cookie *and* a hash-fragment fallback (for cross-site browsers that block
third-party cookies).

## Repository layout

```
.
├── web/                  # Next.js frontend
├── spotify_integration/  # Ballerina backend
├── .github/workflows/    # GitHub Pages deploy workflow
└── docs/                 # Design notes, OAuth architecture, migration plans
```

---

## Important: Spotify API access model (as of May 2025)

Spotify changed their developer policy. **New apps can no longer move to
"Extended Quota Mode" unless they are an established business with 250k+ MAUs.**
For a personal project, this means your app stays in **Development Mode**
forever, with a hard limit of **up to 5 authenticated Spotify users** (Spotify
recently reduced this cap from 25).

### What this means for you

If you fork this project and deploy your own copy:

1. You must create **your own** Spotify app in the
   [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. **The app owner must have a Spotify Premium account** for the app to
   function in Development Mode.
3. You can add up to 5 Spotify users to the app's allowlist under
   **Settings → User Management → Add new user**. Anyone not on the allowlist
   will hit a `403 — The user is not registered for this application` error
   after OAuth.
4. There is **no self-serve path** to lift this limit for individual
   developers. Commercial applications can apply via the
   [Quota Extension Request](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
   form, but approvals require a registered business entity, 250k+ monthly
   active users, commercial viability, and availability in key Spotify markets.

Plan accordingly: this is a great template for a personal dashboard or a
portfolio demo with a handful of invited testers — not a public SaaS product.

---

## Quick start (local development)

### Prerequisites

- Node.js 20+
- Ballerina 2201.13.x (Swan Lake update 13)
- A Spotify Premium account
- A Spotify app (see next section)

### 1. Create a Spotify app

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   and create a new app.
2. Set the **Redirect URI** to `http://localhost:8080/auth/callback`
   (for local development) — it must match `oauthCallbackUrl` in the
   Ballerina config exactly.
3. Note your **Client ID** and **Client Secret**.
4. Under **User Management**, add your own Spotify account email.

### 2. Configure and run the Ballerina backend

```bash
cd spotify_integration
cp Config.toml.example Config.toml
```

Edit `Config.toml`:

```toml
spotifyClientId = "<your-client-id>"
spotifyClientSecret = "<your-client-secret>"

# For local dev:
allowedOrigin = "http://localhost:3000"
frontendBaseUrl = "http://localhost:3000"
oauthCallbackUrl = "http://localhost:8080/auth/callback"
```

Then:

```bash
bal run
```

The service listens on `http://localhost:8080`. Available endpoints:

- `GET  /auth/login`         — kicks off Spotify OAuth.
- `GET  /auth/callback`      — Spotify redirects here with `?code=...`.
- `GET  /auth/session`       — returns current session if authenticated.
- `POST /auth/logout`        — clears the session cookie.
- `GET  /analytics/summary`  — aggregated dashboard data.
- `GET  /analytics/profile`  — user profile.
- `GET  /analytics/top-artists`
- `GET  /analytics/top-tracks`
- `GET  /analytics/recently-played`
- `GET  /analytics/health`   — liveness check.

### 3. Configure and run the frontend

```bash
cd web
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_BASE=http://localhost:8080
NEXT_PUBLIC_ANALYTICS_API=http://localhost:8080/analytics
```

Then:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## Deploying your own copy

The reference deployment is:

- **Frontend** → GitHub Pages (static export)
- **Backend**  → WSO2 Choreo (Ballerina component)

### Deploy the backend to Choreo

1. Fork this repo.
2. Log in to [console.choreo.dev](https://console.choreo.dev) and create a new
   **Service** component pointing at `spotify_integration/` in your fork.
3. Choreo auto-detects two Ballerina services in this code and exposes them as
   **two separate endpoints**:
   - `/auth` context → public URL looks like
     `https://<...>.choreoapis.dev/<project>/<component>/auth-XXX/v1.0`
   - `/analytics` context → public URL looks like
     `https://<...>.choreoapis.dev/<project>/<component>/v1.0`
4. In the Choreo console, **disable OAuth2** under each endpoint's
   **Configure & Deploy → Endpoint Authentication**. The browser-facing OAuth
   flow needs these endpoints public; authentication is enforced by the
   Ballerina service itself via the Spotify access token.
5. Under **Configurations**, set the values from `Config.production.toml.example`
   as config values/secrets:
   - `spotifyClientId`, `spotifyClientSecret`
   - `allowedOrigin` — your frontend origin, e.g.
     `https://<username>.github.io`
   - `frontendBaseUrl` — frontend URL **with repo path**, e.g.
     `https://<username>.github.io/spotify-analytics`
   - `oauthCallbackUrl` — the **auth endpoint's** public URL + `/callback`,
     e.g. `https://<...>.choreoapis.dev/<project>/<component>/auth-XXX/v1.0/callback`
6. Deploy.
7. Register the `oauthCallbackUrl` (exactly — character for character) in your
   Spotify app's **Redirect URIs**.

Note on Choreo paths: the `/auth` and `/analytics` prefixes are stripped by
the Choreo gateway before traffic reaches the Ballerina service. That is why
`oauthCallbackUrl` ends in `/callback`, not `/auth/callback`.

### Deploy the frontend to GitHub Pages

1. Edit [.github/workflows/deploy-frontend-github-pages.yml](.github/workflows/deploy-frontend-github-pages.yml):
   - Set `BACKEND_BASE_URL` to your **auth endpoint** URL.
   - Set `ANALYTICS_API_URL` to your **analytics endpoint** URL.
2. In your GitHub repo settings, enable **Pages → Source: GitHub Actions**.
3. Push to `main`. The workflow builds and deploys automatically.
4. Your site will be at `https://<username>.github.io/<repo-name>/`.

For better secret hygiene, move the URLs into **Repository Variables**
(`vars.BACKEND_BASE_URL`, `vars.ANALYTICS_API_URL`) and reference them from
the workflow instead of hardcoding.

---

## Cross-site cookie caveat

Because the frontend is served from `github.io` and the backend is served
from `choreoapis.dev`, browser third-party cookie policies block the session
cookie set by `/auth/callback` from being sent back on subsequent
`fetch()` calls.

The app works around this with a **hash-fragment token fallback**: after
a successful OAuth exchange, Ballerina redirects to
`${frontendBaseUrl}/dashboard/#access_token=<token>`. The frontend reads the
fragment, stores the token in `sessionStorage`, and attaches it as
`Authorization: Bearer ...` on every analytics call. The `/session` endpoint
will therefore always return 401 in this topology — that's expected, and the
frontend falls through to the token-based path.

If you deploy frontend and backend on the **same origin**, the cookie flow
will work and `/session` will succeed.

---

## Scopes

The app requests the following Spotify scopes:

```
user-read-email
user-read-private
user-top-read
user-read-recently-played
```

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `redirect_uri: Not matching configuration` on Spotify's page | `oauthCallbackUrl` in `Config.toml` does not exactly match a Redirect URI registered in your Spotify app. |
| `{"description":"The requested resource is not available.","code":"404"}` from Choreo | Hitting a path that doesn't exist on that endpoint. Check that `/auth` routes go to the auth endpoint and `/analytics` routes go to the analytics endpoint. |
| `401 missing auth cookie` on `/analytics/*` | Frontend isn't sending the Bearer token. Confirm that `window.sessionStorage.getItem("spotify_access_token")` has a value after login. |
| `500 Forbidden — "The user is not registered for this application"` | User isn't on the allowlist. Add them in **Spotify Dashboard → User Management**. |
| CORS error: `Access-Control-Allow-Credentials` must be `true` | Don't send `credentials: "include"` on analytics calls — those use the Bearer header instead. |
| `401 AUTH_FAILURE` from Choreo gateway | The Choreo endpoint still has OAuth2 security enabled. Disable it in the endpoint's Configure & Deploy settings. |
| Container crashloop: `value not provided for required configurable variable 'spotifyClientId'` | Config values aren't set in the Choreo deployment. Add them under the component's Configurations. |

---

## License

MIT. Use freely for personal and educational projects. Comply with the
[Spotify Developer Terms](https://developer.spotify.com/terms) when deploying
your own copy.
