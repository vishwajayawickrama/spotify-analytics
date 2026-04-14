"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    const token = window.sessionStorage.getItem("spotify_access_token");
    if (token) {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;
    authApi
      .session()
      .then((s) => {
        if (cancelled) return;
        if (s.authenticated) {
          setStatus("authenticated");
          router.replace("/dashboard");
          return;
        }
        setStatus("unauthenticated");
      })
      .catch(() => {
        if (!cancelled) setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="signin-screen">
      <div className="aurora" aria-hidden />
      <div className="signin-card">
        <div className="signin-badge">
          <span className="brand-dot" />
          Spotify Analytics
        </div>
        <h1>
          Your listening,
          <br />
          <span className="grad-text">beautifully understood.</span>
        </h1>
        <p>
          Top artists, top tracks, recent listening history, and the genres
          that define your taste — pulled live from the Spotify Web API.
        </p>
        <div className="signin-actions">
          <button
            className="btn"
            onClick={() => {
              window.location.href = authApi.loginUrl;
            }}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Loading…" : "Sign in with Spotify"}
          </button>
        </div>
        <div className="signin-foot">Sign in to view your personalized dashboard.</div>
      </div>
    </div>
  );
}
