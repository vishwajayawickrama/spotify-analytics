"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  return (
    <div className="signin-screen">
      <div className="signin-card">
        <div
          className="brand-dot"
          style={{ width: 32, height: 32, margin: "0 auto" }}
        />
        <h1>Spotify Analytics</h1>
        <p>
          Sign in with Spotify to see your top artists, top tracks, recent
          listening history, and the genres that define your taste.
        </p>
        <button
          className="btn"
          onClick={() => signIn("spotify", { callbackUrl: "/dashboard" })}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Loading…" : "Sign in with Spotify"}
        </button>
      </div>
    </div>
  );
}
