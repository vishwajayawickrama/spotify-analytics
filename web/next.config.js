/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";
const repoName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ??
  process.env.NEXT_PUBLIC_GH_PAGES_REPO ??
  "spotify-analytics";
const basePath = isProduction && repoName ? `/${repoName}` : "";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "mosaic.scdn.co" },
      { protocol: "https", hostname: "image-cdn-ak.spotifycdn.com" },
      { protocol: "https", hostname: "image-cdn-fa.spotifycdn.com" }
    ]
  }
};

module.exports = nextConfig;
