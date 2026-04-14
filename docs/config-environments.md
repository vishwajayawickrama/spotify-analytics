# Config Environments

This repo now uses two different sets of URLs depending on where the app is running.

## Local Development

Use these values in `spotify_integration/Config.toml` when running the Ballerina backend locally:

```toml
allowedOrigin = "http://localhost:3000"
frontendBaseUrl = "http://localhost:3000"
oauthCallbackUrl = "http://127.0.0.1:8080/auth/callback"
```

Notes:

- The browser opens the frontend at `http://localhost:3000`.
- Spotify redirects back to the local Ballerina backend on `127.0.0.1:8080`.
- `localhost` and `127.0.0.1` must match exactly with what you register in Spotify.

## Production on GitHub Pages

You can start from `spotify_integration/Config.production.toml.example` for these values.

Use these values for the hosted frontend:

```toml
allowedOrigin = "https://vishwajayawickrama.github.io"
frontendBaseUrl = "https://vishwajayawickrama.github.io/spotify-analytics"
oauthCallbackUrl = "https://<your-backend-domain>/auth/callback"
```

Current temporary tunnel example:

```toml
oauthCallbackUrl = "https://overturnable-zahra-semibleached.ngrok-free.dev/auth/callback"
```

Notes:

- `allowedOrigin` must be the origin only, without the repo path.
- `frontendBaseUrl` should include the repo path because GitHub Pages serves the app under `/spotify-analytics`.
- `oauthCallbackUrl` must point to a publicly reachable backend, not GitHub Pages.
- The GitHub Actions workflow expects a repository variable named `BACKEND_BASE_URL`.
- Set `BACKEND_BASE_URL` to your public backend root, for example `https://your-backend-domain`.
- The workflow passes this value to `NEXT_PUBLIC_BACKEND_BASE` at build time.
- For the current tunnel setup, set `BACKEND_BASE_URL` to `https://overturnable-zahra-semibleached.ngrok-free.dev`.

## Reminder

- The backend must be public for the hosted frontend to complete login.
- The frontend uses `NEXT_PUBLIC_BACKEND_BASE` to talk to the backend.
- If `NEXT_PUBLIC_BACKEND_BASE` is not set, the app falls back to `http://localhost:8080`.