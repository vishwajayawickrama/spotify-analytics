"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import { AuthScreen } from "@/lib/ui-components";

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
    <AuthScreen
      title="Your listening,"
      titleAccent={
        <>
          <br />
          <span className="bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] bg-clip-text text-transparent">
            beautifully understood.
          </span>
        </>
      }
      description="Top artists, top tracks, recent listening history, and the genres that define your taste — pulled live from the Spotify Web API."
      buttonLabel={status === "loading" ? "Loading…" : "Sign in with Spotify"}
      buttonDisabled={status === "loading"}
      onSubmit={() => {
        window.location.href = authApi.loginUrl;
      }}
      footer="Sign in to view your personalized dashboard."
    />
  );
}
