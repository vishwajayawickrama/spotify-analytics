import { Suspense } from "react";
import DashboardDetailClient from "./DashboardDetailClient";
import { loadingState } from "@/lib/ui";

export function generateStaticParams() {
  return [
    { section: "artists" },
    { section: "tracks" },
    { section: "recently-played" },
    { section: "listening-activity" }
  ];
}

export default function DashboardDetailPage({
  params
}: {
  params: { section: string };
}) {
  return (
    <Suspense fallback={<div className={loadingState}>Loading details…</div>}>
      <DashboardDetailClient section={params.section} />
    </Suspense>
  );
}
