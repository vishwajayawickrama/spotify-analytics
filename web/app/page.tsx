"use client";

import Link from "next/link";
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
            onClick={() => signIn("spotify", { callbackUrl: "/dashboard" })}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Loading…" : "Sign in with Spotify"}
          </button>
          <Link href="/dashboard" className="btn-ghost btn-ghost-lg">
            Try the demo →
          </Link>
        </div>
        <div className="signin-foot">No account needed for the demo</div>
      </div>
    </div>
  );
}
