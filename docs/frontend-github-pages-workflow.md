# Frontend Hosting Workflow on GitHub Pages

This document explains how the frontend in `web/` is deployed to GitHub Pages using GitHub Actions.

## 1. Current Deployment Architecture

- Frontend framework: Next.js 14 (App Router)
- Build mode in `web/next.config.js`: `output: "export"`
- Deployment target: GitHub Pages
- CI/CD workflow file: `.github/workflows/deploy-frontend-github-pages.yml`

Because GitHub Pages only hosts static files, the workflow expects a static export at `web/out`.

## 2. GitHub Actions Workflow

Workflow name: **Deploy Frontend to GitHub Pages**

### Triggers

The workflow runs when:

- code is pushed to the `main` branch and changes are under `web/**`
- code is pushed to `main` and `.github/workflows/deploy-frontend-github-pages.yml` changed
- manually triggered with `workflow_dispatch`

### Concurrency

- deployment group: `pages`
- in-progress deployment is canceled when a newer run starts

### Permissions

The workflow requests:

- `contents: read`
- `pages: write`
- `id-token: write`

### Job Flow

#### Build job

1. Checkout source code.
2. Configure GitHub Pages (`actions/configure-pages@v5`).
3. Setup Node.js 20 with npm cache.
4. Install dependencies with `npm ci` in `web/`.
5. Run `npm run build` in `web/`.
6. Upload `web/out` as Pages artifact.

#### Deploy job

1. Wait for `build` job.
2. Deploy artifact with `actions/deploy-pages@v4`.
3. Publish the environment URL under `github-pages`.

## 3. Repository Settings Required

In GitHub repository settings:

1. Open **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Ensure Actions are enabled for the repository.

Without this setting, deployment runs may complete but site publishing can fail.

## 4. Local Validation Before Pushing

From project root:

```bash
cd web
npm ci
npm run build
```

Expected output for Pages deployment is the static export directory:

- `web/out`

## 5. Current Build Blocker (Important)

Current local build result (2026-04-14):

- build fails with:
  - `Page "/api/auth/[...nextauth]" is missing "generateStaticParams()" so it cannot be used with "output: export" config.`

Reason:

- `output: "export"` requires fully static routes.
- `web/app/api/auth/[...nextauth]/route.ts` is a dynamic API route for NextAuth.
- Dynamic API routes cannot be exported as static files for GitHub Pages.

## 6. Options to Resolve the Blocker

Choose one deployment strategy:

### Option A: Keep GitHub Pages (static-only)

- Remove server/API route usage from Next.js app.
- Move auth/token exchange to a backend service (for example, Ballerina service).
- Ensure frontend can be fully statically generated.

### Option B: Keep NextAuth route in Next.js

- Deploy frontend to a runtime platform that supports server routes (for example Vercel, Azure Static Web Apps with API, or another Node.js host).
- Remove `output: "export"` if deploying with server runtime.

### Option C: Split architecture

- Host static UI on Pages.
- Host auth API separately.
- Point frontend auth flow to that external auth service.

## 7. Recommended Operational Workflow

1. Implement one of the resolution options above.
2. Run `npm run build` locally and confirm success.
3. Push to `main`.
4. Verify GitHub Action run status.
5. Open deployed Pages URL from workflow output.

## 8. Files Involved

- `.github/workflows/deploy-frontend-github-pages.yml`
- `web/next.config.js`
- `web/package.json`
- `web/app/api/auth/[...nextauth]/route.ts`
