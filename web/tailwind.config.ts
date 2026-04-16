import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.25)"
      },
      colors: {
        spotify: {
          accent: "var(--accent)",
          accentSoft: "var(--accent-soft)",
          accent2: "var(--accent-2)",
          bg: "var(--bg)",
          elevated: "var(--bg-elevated)",
          card: "var(--bg-card)",
          cardHover: "var(--bg-card-hover)",
          border: "var(--border)",
          borderStrong: "var(--border-strong)",
          fg: "var(--fg)",
          muted: "var(--fg-muted)",
          dim: "var(--fg-dim)",
          danger: "var(--danger)"
        }
      }
    }
  },
  plugins: []
};

export default config;
